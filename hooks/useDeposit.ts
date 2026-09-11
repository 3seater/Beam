// hooks/useDeposit.ts — full send flow: swap ETH → token → escrow deposit
'use client';

import { useState, useCallback, useRef } from 'react';
import { useWriteContract, useSendTransaction } from 'wagmi';
import { decodeEventLog, parseUnits } from 'viem';
import { generateEphemeralKey, constructBeamLink } from '@/lib/beam-link';
import { BEAM_ESCROW_ABI } from '@/lib/escrow-abi';
import { BEAM_ESCROW_ADDRESS, DEPOSIT_TIMEOUT_MS } from '@/lib/constants';
import { fetchUniswapQuote, buildSwapCalldata } from '@/lib/uniswap-swap';
import { fetchTokenPriceUsd } from '@/lib/robinhood-prices';
import { saveBeamEntry } from '@/lib/beam-history';
import type { BeamStep } from '@/lib/types';

// ─── Save beam link both locally and server-side ──────────────────────────

async function persistBeamLink(entry: {
  depositId: string;
  walletAddress: string;
  beamLink: string;
  tokenSymbol: string;
  usdAmount: number;
  createdAt: number;
}) {
  // Save to localStorage for instant access
  saveBeamEntry(entry.walletAddress, {
    beamLink: entry.beamLink,
    depositId: entry.depositId,
    tokenSymbol: entry.tokenSymbol,
    usdAmount: entry.usdAmount,
    createdAt: entry.createdAt,
  });

  // Save to server-side store so it survives browser data clears
  try {
    await fetch('/api/beams', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry),
    });
  } catch (e) {
    console.warn('[useDeposit] server beam save failed:', e);
    // Non-fatal — link is still in localStorage
  }
}

// ─── ERC-20 ABI ──────────────────────────────────────────────────────────────
const ERC20_ABI = [
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
] as const;

// ─── Types ───────────────────────────────────────────────────────────────────
export interface UseDepositReturn {
  step: BeamStep;
  beamLink: string | null;
  error: string | null;
  startDeposit: (
    tokenAddress: `0x${string}` | null,
    usdAmount: number,
    tokenSymbol: string,
    ownerAddress: `0x${string}`,
    origin: string,
  ) => Promise<void>;
  reset: () => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function extractDepositId(
  logs: readonly { topics: readonly `0x${string}`[]; data: `0x${string}` }[],
): bigint {
  for (const log of logs) {
    try {
      const decoded = decodeEventLog({
        abi: BEAM_ESCROW_ABI,
        eventName: 'Deposited',
        topics: log.topics as [`0x${string}`, ...`0x${string}`[]],
        data: log.data,
      });
      return (decoded.args as { depositId: bigint }).depositId;
    } catch { /* not a Deposited log */ }
  }
  throw new Error('Deposited event not found in transaction receipt');
}

async function waitForTxReceipt(hash: `0x${string}`) {
  const { getPublicClient } = await import('wagmi/actions');
  const { wagmiConfig } = await import('@/lib/wagmi-config');
  const client = getPublicClient(wagmiConfig);
  if (!client) throw new Error('No public client available');
  return client.waitForTransactionReceipt({
    hash,
    timeout: DEPOSIT_TIMEOUT_MS,
    pollingInterval: 3_000,  // poll every 3s — reduces proxy load vs default 1s
    confirmations: 1,
  });
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useDeposit(): UseDepositReturn {
  const [step, setStep] = useState<BeamStep>('idle');
  const [beamLink, setBeamLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const ephemeralPrivKeyRef = useRef<`0x${string}` | null>(null);

  const { writeContractAsync: writeApprove } = useWriteContract();
  const { writeContractAsync: writeDeposit } = useWriteContract();
  const { sendTransactionAsync: sendSwapTx } = useSendTransaction();

  const discardAndFail = useCallback((msg: string) => {
    ephemeralPrivKeyRef.current = null;
    setError(msg);
    setStep('idle');
  }, []);

  const startDeposit = useCallback(async (
    tokenAddress: `0x${string}` | null,
    usdAmount: number,
    tokenSymbol: string,
    ownerAddress: `0x${string}`,
    origin: string,
  ) => {
    if (step !== 'idle') return;
    setError(null);
    setBeamLink(null);

    const { ephemeralPrivKey, claimSignerAddress } = generateEphemeralKey();
    ephemeralPrivKeyRef.current = ephemeralPrivKey;

    // Get the most accurate ETH price possible right now:
    // 1. Read WETH/USDG pool slot0 for the real on-chain price
    // 2. Fall back to Robinhood price API if that fails
    let ethAmtWei: bigint;
    try {
      const { getPublicClient } = await import('wagmi/actions');
      const { wagmiConfig } = await import('@/lib/wagmi-config');
      const client = getPublicClient(wagmiConfig);

      // Get the WETH/USDG pool address and read its current sqrtPriceX96
      const WETH = '0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73' as `0x${string}`;
      const USDG = '0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168' as `0x${string}`;
      const FACTORY = '0x1f7d7550b1b028f7571e69a784071f0205fd2efa' as `0x${string}`;

      const poolAddr = await client!.readContract({
        address: FACTORY,
        abi: [{ name: 'getPool', type: 'function', stateMutability: 'view', inputs: [{ name: 'tokenA', type: 'address' }, { name: 'tokenB', type: 'address' }, { name: 'fee', type: 'uint24' }], outputs: [{ name: '', type: 'address' }] }] as const,
        functionName: 'getPool',
        args: [WETH, USDG, 500],
      }) as `0x${string}`;

      const slot0 = await client!.readContract({
        address: poolAddr,
        abi: [{ name: 'slot0', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: 'sqrtPriceX96', type: 'uint160' }, { name: 'tick', type: 'int24' }, { name: 'observationIndex', type: 'uint16' }, { name: 'observationCardinality', type: 'uint16' }, { name: 'observationCardinalityNext', type: 'uint16' }, { name: 'feeProtocol', type: 'uint8' }, { name: 'unlocked', type: 'bool' }] }] as const,
        functionName: 'slot0',
      }) as readonly [bigint, number, number, number, number, number, boolean];

      const sqrtPriceX96 = slot0[0];
      // WETH is token0 or token1? Sort addresses to determine
      const wethIsToken0 = WETH.toLowerCase() < USDG.toLowerCase();

      // price = (sqrtPriceX96 / 2^96)^2
      // If WETH=token0: price = USDG per WETH = ETH price in USDG
      // If WETH=token1: price = WETH per USDG, so ETH price = 1/price
      const Q96 = 2n ** 96n;
      const priceRaw = Number((sqrtPriceX96 * sqrtPriceX96 * 10n ** 18n) / (Q96 * Q96)) / 1e18;
      const ethPriceFromPool = wethIsToken0 ? priceRaw : 1 / priceRaw;

      console.log('[useDeposit] pool ETH price:', ethPriceFromPool, 'wethIsToken0:', wethIsToken0);

      if (ethPriceFromPool > 100 && ethPriceFromPool < 100_000) {
        ethAmtWei = parseUnits((usdAmount / ethPriceFromPool).toFixed(18), 18);
        console.log('[useDeposit] using pool price:', ethPriceFromPool, '→ ethAmtWei:', ethAmtWei.toString());
      } else {
        throw new Error(`pool price out of range: ${ethPriceFromPool}`);
      }
    } catch (priceErr) {
      console.warn('[useDeposit] pool price read failed, using API:', priceErr);
      const ethPrice = await fetchTokenPriceUsd('ETH') ?? 3400;
      ethAmtWei = parseUnits((usdAmount / ethPrice).toFixed(18), 18);
    }

    console.log('[useDeposit] tokenAddress:', tokenAddress, 'usd:', usdAmount, 'ethAmtWei:', ethAmtWei.toString());

    try {
      // ── Native ETH path: deposit directly ─────────────────────────────
      if (tokenAddress === null) {
        setStep('deposit-pending');
        const depositHash = await writeDeposit({
          address: BEAM_ESCROW_ADDRESS,
          abi: BEAM_ESCROW_ABI,
          functionName: 'depositNative',
          args: [claimSignerAddress],
          value: ethAmtWei,
        });
        setStep('deposit-confirming');
        const receipt = await waitForTxReceipt(depositHash);
        const depositId = extractDepositId(receipt.logs);
        const link = constructBeamLink(origin, ephemeralPrivKeyRef.current!, depositId);
        const now = Date.now();

        await persistBeamLink({ depositId: depositId.toString(), walletAddress: ownerAddress, beamLink: link, tokenSymbol, usdAmount, createdAt: now });
        setBeamLink(link);
        setStep('link-generated');
        return;
      }

      // ── ERC-20 path: swap ETH → token via Uniswap V3, then deposit ────

      // 1. Fetch a fresh firm quote from QuoterV2 onchain
      const quote = await fetchUniswapQuote(tokenAddress, ethAmtWei);
      if (!quote) {
        throw new Error(
          'No liquidity found for this token on Uniswap V3. ' +
          'Try a larger amount or use ETH instead.',
        );
      }

      // 2. Execute the Uniswap swap (ETH → WETH → USDG → token)
      setStep('swap-pending');
      const swapTx = buildSwapCalldata(quote, ownerAddress);
      const swapHash = await sendSwapTx({
        to: swapTx.to,
        data: swapTx.data,
        value: swapTx.value,
      });
      setStep('swap-confirming');
      await waitForTxReceipt(swapHash);

      // Token is now in the wallet. Read actual received balance rather than
      // using amountOutMin — slippage means we could have received more, and
      // using the wrong amount would cause depositToken to revert.
      let depositAmount: bigint;
      try {
        const { getPublicClient } = await import('wagmi/actions');
        const { wagmiConfig } = await import('@/lib/wagmi-config');
        const publicClient = getPublicClient(wagmiConfig);
        if (!publicClient) throw new Error('no client');
        depositAmount = await publicClient.readContract({
          address: tokenAddress,
          abi: [{
            name: 'balanceOf',
            type: 'function',
            stateMutability: 'view',
            inputs: [{ name: 'account', type: 'address' }],
            outputs: [{ name: '', type: 'uint256' }],
          }] as const,
          functionName: 'balanceOf',
          args: [ownerAddress],
        }) as bigint;
        if (depositAmount === 0n) throw new Error('zero balance after swap');
        console.log('[useDeposit] actual token balance after swap:', depositAmount.toString());
      } catch (balErr) {
        console.warn('[useDeposit] could not read post-swap balance, falling back to amountOutMin:', balErr);
        depositAmount = quote.amountOutMin;
      }

      // 3. Approve BeamEscrow to spend the received tokens
      let needsApproval = true;
      try {
        const { getPublicClient } = await import('wagmi/actions');
        const { wagmiConfig } = await import('@/lib/wagmi-config');
        const publicClient = getPublicClient(wagmiConfig);
        if (publicClient) {
          const allowance = await publicClient.readContract({
            address: tokenAddress,
            abi: ERC20_ABI,
            functionName: 'allowance',
            args: [ownerAddress, BEAM_ESCROW_ADDRESS],
          });
          needsApproval = (allowance as bigint) < depositAmount;
        }
      } catch { /* best-effort, proceed with approval */ }

      if (needsApproval) {
        setStep('approval-pending');
        const approveHash = await writeApprove({
          address: tokenAddress,
          abi: ERC20_ABI,
          functionName: 'approve',
          args: [BEAM_ESCROW_ADDRESS, depositAmount],
        });
        setStep('approval-confirming');
        await waitForTxReceipt(approveHash);
      }

      // 4. Deposit into BeamEscrow
      setStep('deposit-pending');
      const depositHash = await writeDeposit({
        address: BEAM_ESCROW_ADDRESS,
        abi: BEAM_ESCROW_ABI,
        functionName: 'depositToken',
        args: [tokenAddress, depositAmount, claimSignerAddress],
      });
      setStep('deposit-confirming');
      const receipt = await waitForTxReceipt(depositHash);
      const depositId = extractDepositId(receipt.logs);
      const link = constructBeamLink(origin, ephemeralPrivKeyRef.current!, depositId);
      const now = Date.now();

      await persistBeamLink({ depositId: depositId.toString(), walletAddress: ownerAddress, beamLink: link, tokenSymbol, usdAmount, createdAt: now });
      setBeamLink(link);
      setStep('link-generated');

    } catch (err) {
      discardAndFail(
        err instanceof Error ? err.message : 'An unexpected error occurred',
      );
    }
  }, [step, sendSwapTx, writeApprove, writeDeposit, discardAndFail]);

  const reset = useCallback(() => {
    ephemeralPrivKeyRef.current = null;
    setStep('idle');
    setBeamLink(null);
    setError(null);
  }, []);

  return { step, beamLink, error, startDeposit, reset };
}
