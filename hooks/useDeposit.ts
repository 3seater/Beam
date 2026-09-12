// hooks/useDeposit.ts — full send flow: swap ETH → token → escrow deposit
'use client';

import { useState, useCallback, useRef } from 'react';
import { useWriteContract, useSendTransaction } from 'wagmi';
import { decodeEventLog, parseUnits } from 'viem';
import { generateEphemeralKey, constructBeamLink } from '@/lib/beam-link';
import { BEAM_ESCROW_ABI } from '@/lib/escrow-abi';
import { BEAM_ESCROW_ADDRESS, DEPOSIT_TIMEOUT_MS } from '@/lib/constants';
import { fetchUniswapQuote, fetchFirmQuote, buildSwapCalldata } from '@/lib/uniswap-swap'; import { fetchTokenPriceUsd } from '@/lib/robinhood-prices';
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

// ─── Friendly error messages ──────────────────────────────────────────────────

/**
 * Converts raw viem / RPC error messages into concise, user-facing strings.
 * Called in the catch block of startDeposit so both UI surfaces (SendPageClient
 * and CreateBeamModal) automatically get clean messages.
 */
function toFriendlyError(raw: string): string {
  const msg = raw.toLowerCase();

  // Wallet / signing timeouts (the "unknown RPC error … wallet timeout" case)
  if (msg.includes('wallet timeout') || msg.includes('timed out'))
    return 'Your wallet took too long to respond. Please try again.';

  // Insufficient funds for gas + value
  if (msg.includes('insufficient funds'))
    return 'Insufficient ETH balance to cover this transaction and gas fees.';

  // Gas estimation failures / execution reverts with no useful info
  if (msg.includes('gas required exceeds allowance') || msg.includes('out of gas'))
    return 'Transaction ran out of gas. Try a slightly smaller amount.';

  // Contract execution reverted with a reason string
  const revertMatch = raw.match(/reverted(?:\s+with reason string)?[:\s]+"?([^"]+)"?/i);
  if (revertMatch) return `Transaction failed: ${revertMatch[1].trim()}`;
  if (msg.includes('execution reverted'))
    return 'Transaction was rejected by the contract. Please try again.';

  // Network / RPC issues
  if (msg.includes('network') || msg.includes('could not fetch') || msg.includes('failed to fetch')
    || msg.includes('upstream fetch failed') || msg.includes('unknown rpc error'))
    return 'Network error. Check your connection and try again.';

  // Nonce conflicts (can happen when a prior tx is pending)
  if (msg.includes('nonce too low') || msg.includes('nonce too high') || msg.includes('replacement transaction'))
    return 'Transaction conflict detected. Please wait a moment and try again.';

  // Slippage / price impact
  if (msg.includes('slippage') || msg.includes('price impact') || msg.includes('too much'))
    return 'Price moved too much during the swap. Please try again.';

  // No liquidity (already friendly, but normalise capitalisation)
  if (msg.includes('no liquidity'))
    return 'No liquidity found for this token. Try a larger amount or use ETH instead.';

  // Chain / account not connected
  if (msg.includes('no public client') || msg.includes('connector not connected'))
    return 'Wallet disconnected. Please reconnect and try again.';

  // Deposited event not in receipt (shouldn't happen, but surface cleanly)
  if (msg.includes('deposited event not found'))
    return 'Transaction confirmed but deposit ID was not found. Contact support if funds are missing.';

  // Fallback — strip the verbose viem wrapper prefix if present, otherwise generic
  const shortMsg = raw.replace(/^(TransactionExecutionError|ContractFunctionExecutionError|SendTransactionError|BaseError):\s*/i, '').trim();
  if (shortMsg.length > 0 && shortMsg.length <= 120) return shortMsg;
  return 'Something went wrong. Please try again.';
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

  const discardAndFail = useCallback((msg: string | null) => {
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

    // Compute ETH amount from USD using live ETH price (used for native ETH deposits
    // and as a fallback estimate for ERC-20 swaps when EXACT_OUTPUT isn't available)
    const ethPrice = await fetchTokenPriceUsd('ETH') ?? 2500;
    const ethAmtWei = parseUnits((usdAmount / ethPrice).toFixed(18), 18);
    console.log('[useDeposit] ETH price:', ethPrice, '| ethAmtWei:', ethAmtWei.toString());

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

      // ── ERC-20 path: swap ETH → token via Uniswap Trading API (V4/V3/UniswapX), then deposit ────

      // 1. Use EXACT_OUTPUT: compute how many tokens $usdAmount buys, then ask
      //    the API for exactly that many tokens. This way the user gets exactly
      //    $usdAmount of tokens regardless of ETH price fluctuations.
      let exactOutputWei: bigint | undefined;
      try {
        const tokenPrice = await fetchTokenPriceUsd(tokenSymbol);
        if (tokenPrice && tokenPrice > 0) {
          const tokenAmount = usdAmount / tokenPrice;
          exactOutputWei = parseUnits(tokenAmount.toFixed(18), 18);
          console.log('[useDeposit] EXACT_OUTPUT | tokenPrice=', tokenPrice, '| tokenAmount=', tokenAmount, '| wei=', exactOutputWei.toString());
        }
      } catch {
        // fall through to EXACT_INPUT
      }

      // 1. Fetch a firm quote with swap calldata
      const quote = await fetchFirmQuote(tokenAddress, ethAmtWei, ownerAddress, exactOutputWei);
      if (!quote) {
        throw new Error(
          'No liquidity found for this token. ' +
          'Try a larger amount or use ETH instead.',
        );
      }

      // 2. Execute the swap (V4 via UniversalRouter, or V3 fallback)
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
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred';
      // User rejected the wallet prompt — reset silently so they can retry
      const isUserRejection = /user rejected|user denied|rejected the request/i.test(msg);
      discardAndFail(isUserRejection ? null : toFriendlyError(msg));
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
