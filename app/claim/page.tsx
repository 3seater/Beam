'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { usePublicClient } from 'wagmi';
import { usePrivy, useWallets } from '@privy-io/react-auth';

import { parseBeamLink } from '@/lib/beam-link';
import { fetchDeposit } from '@/lib/escrow';
import { formatTokenAmount } from '@/lib/format';
import { fetchRobinhoodTokens } from '@/lib/robinhood-tokens';
import { useClaim } from '@/hooks/useClaim';
import type { Deposit } from '@/lib/types';

import { DepositCard } from './DepositCard';
import { ClaimButton } from './ClaimButton';
import { ClaimSuccess } from './ClaimSuccess';

import { AlertTriangle, RefreshCw, Zap, LogIn } from 'lucide-react';

type PageState = 'parsing' | 'invalid-link' | 'loading' | 'error' | 'ready';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
const isNativeEth = (token: `0x${string}`) =>
  token.toLowerCase() === ZERO_ADDRESS;

export default function ClaimPage() {
  const publicClient = usePublicClient();

  const [ephemeralPrivKey, setEphemeralPrivKey] = useState<`0x${string}` | null>(null);
  const [depositId, setDepositId] = useState<bigint | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [deposit, setDeposit] = useState<Deposit | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [pageState, setPageState] = useState<PageState>('parsing');
  const [tokenSymbol, setTokenSymbol] = useState<string>('TOKEN');
  const [tokenDecimals, setTokenDecimals] = useState<number>(18);

  const { claimStep, txHash, recipientAddress: claimedRecipient, error: claimError, claim } = useClaim();
  const { authenticated, login } = usePrivy();
  const { wallets } = useWallets();
  // The claimer's embedded wallet — exists if they previously authenticated
  const embeddedWallet = wallets.find((w) => w.walletClientType === 'privy');

  /* Parse URL hash */
  useEffect(() => {
    try {
      const { ephemeralPrivKey: key, depositId: id } = parseBeamLink(window.location.hash);
      setEphemeralPrivKey(key);
      setDepositId(id);
    } catch (err) {
      setParseError(err instanceof Error ? err.message : 'Invalid BeamLink');
      setPageState('invalid-link');
    }
  }, []);

  /* Fetch deposit from chain */
  const loadDeposit = useCallback(async () => {
    if (depositId === null || !publicClient) return;
    setFetchError(null);
    setPageState('loading');
    try {
      const dep = await fetchDeposit(depositId, publicClient);
      setDeposit(dep);

      // Resolve token symbol/decimals from address
      if (!isNativeEth(dep.token)) {
        const tokens = await fetchRobinhoodTokens();
        const known = tokens.find(
          (t) => t.address.toLowerCase() === dep.token.toLowerCase(),
        );
        if (known) {
          setTokenSymbol(known.symbol);
          setTokenDecimals(known.decimals);
        } else {
          // Unknown token — try reading symbol() from chain
          try {
            const sym = await publicClient.readContract({
              address: dep.token,
              abi: [{ name: 'symbol', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'string' }] }] as const,
              functionName: 'symbol',
            });
            setTokenSymbol(String(sym));
          } catch { /* leave as 'TOKEN' */ }
        }
      } else {
        setTokenSymbol('ETH');
      }

      setPageState('ready');
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : 'Could not load deposit details.');
      setPageState('error');
    }
  }, [depositId, publicClient]);

  useEffect(() => {
    if (depositId !== null) void loadDeposit();
  }, [depositId, loadDeposit]);

  const handleClaim = useCallback(() => {
    if (!ephemeralPrivKey || depositId === null) return;
    void claim(ephemeralPrivKey, depositId);
  }, [ephemeralPrivKey, depositId, claim]);

  const successAmount = deposit
    ? formatTokenAmount(deposit.amount, tokenDecimals)
    : '0';
  const successSymbol = tokenSymbol;

  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center px-4 py-20 gap-8"
      aria-label="Beam claim page"
    >
      {/* Logo */}
      <motion.div
        className="flex flex-col items-center gap-1"
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="glass-pill flex items-center gap-2 px-4 py-2 mb-2">
          <Zap size={16} className="text-white" aria-hidden="true" />
          <span className="text-white font-medium text-lg tracking-wider">BEAM</span>
        </div>
        <p className="text-sm text-white/50">You have received a Beam</p>
      </motion.div>

      {/* ── Parsing ────────────────────────────────────────────────────── */}
      {pageState === 'parsing' && (
        <div className="flex items-center gap-2 text-white/50 text-sm" role="status">
          <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" aria-hidden="true" />
          Reading BeamLink…
        </div>
      )}

      {/* ── Invalid link ───────────────────────────────────────────────── */}
      {pageState === 'invalid-link' && (
        <motion.div
          className="glass flex flex-col items-center gap-4 p-8 w-full max-w-sm text-center"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          role="alert"
          aria-live="assertive"
        >
          <AlertTriangle size={32} className="text-white/60" aria-hidden="true" />
          <div>
            <h2 className="text-base font-medium text-white mb-1">Invalid link</h2>
            <p className="text-sm font-normal text-white/55">
              {parseError ?? 'This BeamLink is malformed or has been tampered with.'}
            </p>
          </div>
          <p className="text-xs text-white/35">Ask the sender to share the original link again.</p>
        </motion.div>
      )}

      {/* ── Loading ────────────────────────────────────────────────────── */}
      {pageState === 'loading' && (
        <div className="flex items-center gap-2 text-white/50 text-sm" role="status">
          <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" aria-hidden="true" />
          Loading deposit details…
        </div>
      )}

      {/* ── Error ──────────────────────────────────────────────────────── */}
      {pageState === 'error' && (
        <motion.div
          className="glass flex flex-col items-center gap-4 p-8 w-full max-w-sm text-center"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          role="alert"
          aria-live="assertive"
        >
          <AlertTriangle size={36} className="text-amber-300" aria-hidden="true" />
          <div>
            <h2 className="text-base font-medium text-white mb-1">Could not load deposit</h2>
            <p className="text-sm font-normal text-white/55">{fetchError ?? 'There was a problem reaching the contract.'}</p>
          </div>
          <button
            onClick={() => void loadDeposit()}
            className="flex items-center gap-1.5 text-sm font-medium text-white/65
                       hover:text-white transition-colors"
            aria-label="Retry"
          >
            <RefreshCw size={14} aria-hidden="true" />
            Try again
          </button>
        </motion.div>
      )}

      {/* ── Ready ──────────────────────────────────────────────────────── */}
      {pageState === 'ready' && deposit !== null && (
        <>
          {/* Already claimed — show wallet access panel */}
          {deposit.claimed && claimStep !== 'success' && (
            <motion.div
              className="glass-sm flex flex-col gap-4 p-6 w-full max-w-sm text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              role="status"
              aria-live="polite"
            >
              <div className="flex flex-col items-center gap-2">
                <AlertTriangle size={22} className="text-amber-300" aria-hidden="true" />
                <h2 className="text-base font-medium text-white">Already claimed</h2>
                <p className="text-sm text-white/55">
                  This Beam was already claimed. If it was yours, sign in to access your wallet.
                </p>
              </div>

              {/* Show wallet if authenticated */}
              {authenticated && embeddedWallet ? (
                <ClaimSuccess
                  amount={successAmount}
                  symbol={successSymbol}
                  decimals={tokenDecimals}
                  recipientAddress={embeddedWallet.address as `0x${string}`}
                  tokenAddress={isNativeEth(deposit.token) ? null : deposit.token}
                  txHash={null}
                />
              ) : (
                <button
                  type="button"
                  onClick={() => login()}
                  className="btn-glass-primary w-full !justify-center flex items-center gap-2 !py-3"
                >
                  <LogIn size={15} />
                  Sign in to access your wallet
                </button>
              )}
            </motion.div>
          )}

          {/* Deposit card */}
          {claimStep !== 'success' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            >
              <DepositCard deposit={deposit} depositId={depositId!} tokenSymbol={tokenSymbol} tokenDecimals={tokenDecimals} />
            </motion.div>
          )}

          {/* Success */}
          {claimStep === 'success' && txHash && (
            <ClaimSuccess
              amount={successAmount}
              symbol={successSymbol}
              decimals={tokenDecimals}
              recipientAddress={claimedRecipient ?? deposit.claimSigner}
              tokenAddress={isNativeEth(deposit.token) ? null : deposit.token}
              txHash={txHash}
            />
          )}

          {/* Claim / retry button */}
          {(!deposit.claimed || claimStep === 'error') && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
              className="w-full"
            >
              <ClaimButton
                claimStep={claimStep}
                error={claimError}
                alreadyClaimed={deposit.claimed}
                onClaim={handleClaim}
              />
            </motion.div>
          )}
        </>
      )}
    </main>
  );
}
