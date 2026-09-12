'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { usePublicClient } from 'wagmi';
import { usePrivy, useWallets } from '@privy-io/react-auth';

import { parseBeamLink } from '@/lib/beam-link';
import { fetchDeposit } from '@/lib/escrow';
import { formatTokenAmount } from '@/lib/format';
import { fetchRobinhoodTokens, stockLogoUrl } from '@/lib/robinhood-tokens';
import { useClaim } from '@/hooks/useClaim';
import type { Deposit } from '@/lib/types';

import { DepositCard } from './DepositCard';
import { ClaimButton } from './ClaimButton';
import { ClaimSuccess } from './ClaimSuccess';

import { AlertTriangle, RefreshCw, LogIn, ArrowRight, Link2 } from 'lucide-react';
import { ICON_SIZE } from '@/lib/icons';

type PageState = 'parsing' | 'no-link' | 'invalid-link' | 'loading' | 'error' | 'ready';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
const isNativeEth = (token: `0x${string}`) =>
  token.toLowerCase() === ZERO_ADDRESS;

/* ── Link entry panel — shown when user arrives with no hash ─────────────── */
function LinkEntryPanel() {
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) { setError('Please paste your Beam link.'); return; }

    // Accept either a full URL (https://…/claim#key=…) or just the hash fragment
    try {
      let hash = '';
      if (trimmed.startsWith('#')) {
        hash = trimmed;
      } else {
        // Try to parse as URL and grab the hash
        const url = new URL(trimmed.startsWith('http') ? trimmed : `https://x${trimmed}`);
        hash = url.hash;
      }
      if (!hash) throw new Error('No fragment found');
      // Validate it parses correctly before navigating
      parseBeamLink(hash);
      // Navigate — preserves the current origin so it works in any environment
      window.location.hash = hash.startsWith('#') ? hash.slice(1) : hash;
      window.location.reload();
    } catch {
      setError('That doesn\'t look like a valid Beam link. Make sure you pasted the full link.');
    }
  }, [value]);

  return (
    <motion.div
      className="glass-strong rounded-[28px] w-full max-w-sm overflow-hidden"
      initial={{ opacity: 0, y: 20, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Header */}
      <div className="flex flex-col items-center gap-3 px-7 pt-8 pb-6 border-b border-white/10">
        <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center">
          <Link2 size={ICON_SIZE.lg} className="text-white/70" aria-hidden="true" />
        </div>
        <div className="text-center">
          <h2 className="text-base font-semibold text-white">Enter your Beam link</h2>
          <p className="text-sm text-white/50 mt-1 leading-relaxed">
            Paste the full link you received to claim your tokens.
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="px-7 py-6 flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <input
            type="text"
            value={value}
            onChange={(e) => { setValue(e.target.value); setError(null); }}
            placeholder="https://beam.finance/claim#key=…"
            className="input-glass !text-sm !py-3"
            aria-label="Beam link"
            autoFocus
            spellCheck={false}
            autoComplete="off"
          />
          {error && (
            <p className="text-xs text-red-300/90 px-1">{error}</p>
          )}
        </div>

        <button
          type="submit"
          className="btn-glass-primary w-full !justify-center flex items-center gap-2 !py-3 !text-sm"
        >
          Claim tokens
          <ArrowRight size={ICON_SIZE.sm} aria-hidden="true" />
        </button>

        <p className="text-center text-xs text-white/30">
          Don&apos;t have a link? Ask the sender to share it with you.
        </p>
      </form>
    </motion.div>
  );
}

export function ClaimPageClient() {
  const publicClient = usePublicClient();

  const [ephemeralPrivKey, setEphemeralPrivKey] = useState<`0x${string}` | null>(null);
  const [depositId, setDepositId] = useState<bigint | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [deposit, setDeposit] = useState<Deposit | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [pageState, setPageState] = useState<PageState>('parsing');
  const [tokenSymbol, setTokenSymbol] = useState<string>('TOKEN');
  const [tokenDecimals, setTokenDecimals] = useState<number>(18);
  const [tokenLogoUrl, setTokenLogoUrl] = useState<string | undefined>(undefined);

  const { claimStep, txHash, recipientAddress: claimedRecipient, error: claimError, claim } = useClaim();
  const { authenticated, login } = usePrivy();
  const { wallets } = useWallets();
  // The claimer's embedded wallet — exists if they previously authenticated
  const embeddedWallet = wallets.find((w) => w.walletClientType === 'privy');

  /* Parse URL hash */
  useEffect(() => {
    const hash = window.location.hash;
    // No hash at all — show the link entry UI
    if (!hash || hash === '#') {
      setPageState('no-link');
      return;
    }
    try {
      const { ephemeralPrivKey: key, depositId: id } = parseBeamLink(hash);
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
          setTokenLogoUrl(known.logoUrl);
        } else {
          // Unknown token — try reading symbol() from chain
          try {
            const sym = await publicClient.readContract({
              address: dep.token,
              abi: [{ name: 'symbol', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'string' }] }] as const,
              functionName: 'symbol',
            });
            const symStr = String(sym);
            setTokenSymbol(symStr);
            setTokenLogoUrl(stockLogoUrl(symStr));
          } catch { /* leave as 'TOKEN' */ }
        }
      } else {
        setTokenSymbol('ETH');
        setTokenLogoUrl('https://coin-images.coingecko.com/coins/images/279/small/ethereum.png?1696501628');
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
    <>
      <main
        className="min-h-screen flex flex-col items-center justify-center px-4 py-20 gap-8"
        aria-label="Beam claim page"
      >
        {/* ── Parsing ────────────────────────────────────────────────────── */}
        {pageState === 'parsing' && (
          <div className="flex items-center gap-2 text-white/50 text-sm" role="status">
            <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" aria-hidden="true" />
            Reading BeamLink…
          </div>
        )}

        {/* ── No link — let user paste one ──────────────────────────────── */}
        {pageState === 'no-link' && <LinkEntryPanel />}

        {/* ── Invalid link — show entry panel with error context ─────────── */}
        {pageState === 'invalid-link' && (
          <motion.div
            className="flex flex-col items-center gap-4 w-full max-w-sm"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="glass flex items-center gap-3 px-4 py-3 w-full rounded-2xl"
              role="alert" aria-live="assertive">
              <AlertTriangle size={ICON_SIZE.md} className="text-amber-300 shrink-0" aria-hidden="true" />
              <p className="text-sm text-white/70">
                {parseError ?? 'This link looks malformed — try pasting it again below.'}
              </p>
            </div>
            <LinkEntryPanel />
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
              <RefreshCw size={ICON_SIZE.sm} aria-hidden="true" />
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
                  <AlertTriangle size={ICON_SIZE.lg} className="text-amber-300" aria-hidden="true" />
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
                    tokenLogoUrl={tokenLogoUrl}
                    txHash={null}
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => login()}
                    className="btn-glass-primary w-full !justify-center flex items-center gap-2 !py-3"
                  >
                    <LogIn size={ICON_SIZE.md} />
                    Sign in to access your wallet
                  </button>
                )}
              </motion.div>
            )}

            {/* Deposit card + claim button — share the same max-w-sm column */}
            {claimStep !== 'success' && (
              <div className="w-full max-w-sm flex flex-col gap-4">
                {!deposit.claimed && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                    className="text-center"
                  >
                    <p className="text-sm font-medium text-white/60 tracking-wide">
                      You received a beam
                    </p>
                  </motion.div>
                )}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                  className="w-full"
                >
                  <DepositCard deposit={deposit} depositId={depositId!} tokenSymbol={tokenSymbol} tokenDecimals={tokenDecimals} tokenLogoUrl={tokenLogoUrl} />
                </motion.div>

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
              </div>
            )}

            {/* Success */}
            {claimStep === 'success' && txHash && (
              <ClaimSuccess
                amount={successAmount}
                symbol={successSymbol}
                decimals={tokenDecimals}
                recipientAddress={claimedRecipient ?? deposit.claimSigner}
                tokenAddress={isNativeEth(deposit.token) ? null : deposit.token}
                tokenLogoUrl={tokenLogoUrl}
                txHash={txHash}
              />
            )}
          </>
        )}
      </main>
    </>
  );
}
