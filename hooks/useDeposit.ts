// hooks/useDeposit.ts — full send flow: swap ETH → token → escrow deposit
'use client';

import { useState, useCallback, useRef } from 'react';
import { useWriteContract, useSendTransaction } from 'wagmi';
import { decodeEventLog, parseUnits } from 'viem';
import { generateEphemeralKey, constructBeamLink } from '@/lib/beam-link';
import { BEAM_ESCROW_ABI } from '@/lib/escrow-abi';
import { BEAM_ESCROW_ADDRESS, DEPOSIT_TIMEOUT_MS } from '@/lib/constants';
import { fetchUniswapQuote, buildSwapCalldata, quoteEthForUsdg } from '@/lib/uniswap-swap';
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

    // For ERC-20 path: get exact ETH needed for $usdAmount of USDG on-chain
    // (USDG is pegged 1:1 USD, so $10 = 10 USDG = 10e18 wei of USDG)
    // This avoids relying on a price feed that can diverge from pool prices.
    // For native ETH path we still use the price API as a fallback.
    let ethAmtWei: bigint;
    if (tokenAddress !== null) {
      const usdgNeeded = parseUnits(usdAmount.toFixed(6), 18); // $10 → 10e18 USDG
      const quotedEth = await quoteEthForUsdg(usdgNeeded);
      if (quotedEth) {
        ethAmtWei = quotedEth;
        console.log('[useDeposit] on-chain ETH quote:', ethAmtWei.toString(), 'for $', usdAmount, 'USDG');
      } else {
        // Fallback: price API
        const ethPrice = await fetchTokenPriceUsd('ETH') ?? 3400;
        const ethAmt = usdAmount / ethPrice;
        ethAmtWei = parseUnits(ethAmt.toFixed(18), 18);
        console.log('[useDeposit] fallback ETH price quote:', ethAmtWei.toString());
      }
    } else {
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
