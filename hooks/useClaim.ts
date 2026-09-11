'use client';

import { useState, useCallback } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { signClaimPayload } from '@/lib/eip191';
import { WALLET_PROVISION_TIMEOUT_MS } from '@/lib/constants';
import type { RelayClaimRequest, RelayClaimResponse } from '@/lib/types';

// ─── Claim step labels ────────────────────────────────────────────────────────

export type ClaimStep =
  | 'idle'
  | 'authenticating'
  | 'wallet-provisioning'
  | 'signing'
  | 'submitting'
  | 'confirming'
  | 'success'
  | 'error';

export interface UseClaimReturn {
  claimStep: ClaimStep;
  txHash: `0x${string}` | null;
  /** The embedded wallet address provisioned by Privy for the Recipient. */
  recipientAddress: `0x${string}` | null;
  error: string | null;
  claim: (ephemeralPrivKey: `0x${string}`, depositId: bigint) => Promise<void>;
  reset: () => void;
}

// ─── Embedded wallet polling ──────────────────────────────────────────────────

const POLL_INTERVAL_MS = 500;

/**
 * Poll Privy's linked accounts until an EmbeddedWallet of type 'privy' appears,
 * or throw after `timeoutMs` milliseconds (default: WALLET_PROVISION_TIMEOUT_MS).
 *
 * Design reference — Embedded Wallet Provisioning Flow
 * Feature: beam, Property 10: EIP-191 signing round-trip (wallet address used as recipient)
 */
export async function waitForEmbeddedWallet(
  privy: ReturnType<typeof usePrivy>,
  timeoutMs: number = WALLET_PROVISION_TIMEOUT_MS,
): Promise<`0x${string}`> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const wallet = privy.user?.linkedAccounts.find(
      (a) => a.type === 'wallet' && (a as { walletClientType?: string }).walletClientType === 'privy',
    );
    if (wallet && 'address' in wallet) {
      return wallet.address as `0x${string}`;
    }
    await new Promise<void>((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }

  throw new Error('Wallet provisioning timed out after 30 seconds');
}

// ─── useClaim hook ────────────────────────────────────────────────────────────

/**
 * Orchestrates the full Recipient claim flow:
 *   Privy login → wait for embedded wallet → sign ClaimPayload → POST /api/relay/claim
 *
 * Requirements: 9.1–9.7
 */
export function useClaim(): UseClaimReturn {
  const privy = usePrivy();

  const [claimStep, setClaimStep] = useState<ClaimStep>('idle');
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);
  const [recipientAddress, setRecipientAddress] = useState<`0x${string}` | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setClaimStep('idle');
    setTxHash(null);
    setRecipientAddress(null);
    setError(null);
  }, []);

  const claim = useCallback(
    async (ephemeralPrivKey: `0x${string}`, depositId: bigint) => {
      setError(null);
      setTxHash(null);

      try {
        // ── Step 1: Authenticate via Privy (Req 9.1) ──────────────────────────
        if (!privy.authenticated) {
          setClaimStep('authenticating');
          await privy.login();
        }

        // ── Step 2: Wait for embedded wallet (Req 9.2) ────────────────────────
        setClaimStep('wallet-provisioning');
        const recipientAddress = await waitForEmbeddedWallet(privy);
        setRecipientAddress(recipientAddress);

        // ── Step 3: Sign ClaimPayload (Req 9.3) ───────────────────────────────
        setClaimStep('signing');
        const signature = await signClaimPayload(
          ephemeralPrivKey,
          recipientAddress,
          depositId,
        );

        // ── Step 4: Submit to Relayer (Req 9.4) ───────────────────────────────
        setClaimStep('submitting');

        const body: RelayClaimRequest = {
          depositId: depositId.toString(10),
          recipientAddress,
          signature,
        };

        const response = await fetch('/api/relay/claim', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });

        const data = await response.json() as RelayClaimResponse | { error: string; code: string };

        if (!response.ok) {
          const errData = data as { error: string; code: string };
          // Req 9.5: surface already-claimed error clearly
          if (errData.code === 'ALREADY_CLAIMED') {
            throw new Error('This deposit has already been claimed.');
          }
          throw new Error(errData.error ?? `Relay request failed (HTTP ${response.status})`);
        }

        // ── Step 5: Store txHash and transition to success (Req 9.6) ─────────
        setClaimStep('confirming');
        const successData = data as RelayClaimResponse;
        setTxHash(successData.txHash);
        setClaimStep('success');

      } catch (err: unknown) {
        // Req 9.7: preserve error state so retry works without re-authentication
        const message =
          err instanceof Error
            ? err.message
            : 'An unexpected error occurred during the claim.';
        setError(message);
        setClaimStep('error');
      }
    },
    [privy],
  );

  return { claimStep, txHash, recipientAddress, error, claim, reset };
}
