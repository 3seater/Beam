'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAccount, useDisconnect } from 'wagmi';
import { usePrivy } from '@privy-io/react-auth';
import { ArrowLeft, Zap, Wallet, LogOut } from 'lucide-react';
import { motion } from 'framer-motion';

import { Button } from '@/components/ui/Button';
import { GaslessBadge } from '@/components/ui/Badge';
import { TokenPicker, type SelectedAsset } from '@/components/CreateBeamModal/TokenPicker';
import { DollarAmountInput } from '@/components/CreateBeamModal/DollarAmountInput';
import { StepIndicator } from '@/components/CreateBeamModal/StepIndicator';
import { BeamLinkDisplay } from '@/components/CreateBeamModal/BeamLinkDisplay';
import { useDeposit } from '@/hooks/useDeposit';
import { SentBeams } from '@/components/SentBeams';
import type { BeamStep } from '@/lib/types';

/* ── Connected wallet bar ────────────────────────────────────────────────── */
function ConnectedBar({ address, onDisconnect }: { address: string; onDisconnect: () => void }) {
  const short = `${address.slice(0, 6)}…${address.slice(-4)}`;
  return (
    <div className="flex items-center gap-2 glass-sm rounded-xl px-3 py-2">
      <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" aria-hidden="true" />
      <span className="text-xs text-white/70 flex-1 font-mono">{short}</span>
      <button
        type="button"
        onClick={onDisconnect}
        className="flex items-center gap-1 text-[11px] text-white/40 hover:text-white/70 transition-colors"
        aria-label="Disconnect wallet"
      >
        <LogOut size={11} />
        Disconnect
      </button>
    </div>
  );
}

function stepLabel(step: BeamStep, isERC20: boolean): string {
  switch (step) {
    case 'swap-pending': return 'Waiting for swap approval…';
    case 'swap-confirming': return 'Swapping ETH → token…';
    case 'approval-pending': return 'Waiting for escrow approval…';
    case 'approval-confirming': return 'Confirming approval…';
    case 'deposit-pending': return 'Depositing into escrow…';
    case 'deposit-confirming': return 'Confirming on-chain…';
    default: return '';
  }
}

/* ── Page ────────────────────────────────────────────────────────────────── */
export default function SendPage() {
  const router = useRouter();
  const { address: walletAddress, isConnected, status: accountStatus } = useAccount();
  const { connectWallet, ready } = usePrivy();
  const { disconnect } = useDisconnect();

  // Prevent hydration flicker: wagmi's store rehydrates after the first render,
  // causing isConnected to briefly be false then flip to true. We wait until
  // the account status is no longer 'connecting' / 'reconnecting' before
  // showing wallet-dependent UI.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const hydrated = mounted && accountStatus !== 'connecting' && accountStatus !== 'reconnecting';

  // Keep the last known address in a ref so SentBeams stays mounted during
  // any transient disconnect (e.g. wallet switching), preventing a full remount
  // and losing scroll position / loaded state.
  const lastAddressRef = useRef<string | undefined>(undefined);
  if (isConnected && walletAddress) lastAddressRef.current = walletAddress;
  const stableAddress = lastAddressRef.current;

  const handleDisconnect = useCallback(() => disconnect(), [disconnect]);

  /* ── Form state ───────────────────────────────────────────────────────── */
  const [selectedAsset, setSelectedAsset] = useState<SelectedAsset>({ type: 'native', symbol: 'ETH' });
  const [dollarValue, setDollarValue] = useState('');
  const [tokenAmount, setTokenAmount] = useState<string | null>(null);
  const [amountError, setAmountError] = useState<string | null>('Please enter an amount');

  const { step, beamLink, error: depositError, startDeposit, reset } = useDeposit();

  /* ── Derived ──────────────────────────────────────────────────────────── */
  const isERC20 = selectedAsset.type === 'erc20';
  const isInProgress = ['swap-pending', 'swap-confirming', 'approval-pending', 'approval-confirming', 'deposit-pending', 'deposit-confirming'].includes(step);
  const isLinkReady = step === 'link-generated';

  const usdAmount = parseFloat(dollarValue) || 0;
  const canConfirm =
    amountError === null &&
    tokenAmount !== null &&
    usdAmount > 0 &&
    hydrated && isConnected &&
    walletAddress !== undefined &&
    step === 'idle';

  const handleAssetChange = useCallback((asset: SelectedAsset) => {
    setSelectedAsset(asset);
    setDollarValue('');
    setTokenAmount(null);
    setAmountError('Please enter an amount');
  }, []);

  const handleConfirm = useCallback(async () => {
    if (!isConnected || !walletAddress) {
      connectWallet();
      return;
    }
    if (!canConfirm) return;

    const tokenAddr = selectedAsset.type === 'erc20' ? selectedAsset.address : null;
    const tokenSymbol = selectedAsset.type === 'native' ? 'ETH' : selectedAsset.symbol;

    console.log('[send] tokenAddr:', tokenAddr, 'symbol:', tokenSymbol, 'usd:', usdAmount);

    await startDeposit(tokenAddr, usdAmount, tokenSymbol, walletAddress,
      typeof window !== 'undefined' ? window.location.origin : '');
  }, [isConnected, walletAddress, canConfirm, isERC20, selectedAsset, usdAmount, startDeposit, connectWallet]);

  const handleSendAnother = useCallback(() => {
    reset();
    setSelectedAsset({ type: 'native', symbol: 'ETH' });
    setDollarValue('');
    setTokenAmount(null);
    setAmountError('Please enter an amount');
  }, [reset]);

  return (
    <>
      <main className="min-h-screen flex flex-col items-center justify-center px-4 py-24">
        <motion.div
          className="w-full max-w-lg"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="glass-strong rounded-[28px] overflow-hidden">

            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-white/15">
              <button type="button" onClick={() => router.back()}
                className="btn-glass-icon !w-8 !h-8" aria-label="Back">
                <ArrowLeft size={16} aria-hidden="true" />
              </button>
              <h1 className="text-base font-medium text-white tracking-tight">
                {isLinkReady ? 'Your Beam is ready' : 'Send a Beam'}
              </h1>
              <div className="w-8" aria-hidden="true" />
            </div>

            {/* Body */}
            <div className="px-6 py-5 flex flex-col gap-5">

              {/* ── In-progress ─────────────────────────────────────────── */}
              {isInProgress && (
                <div className="flex flex-col items-center gap-8 py-6">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-full glass flex items-center justify-center animate-glow-pulse">
                      <Zap size={28} className="text-white" />
                    </div>
                    <div className="absolute inset-0 rounded-full bg-white/10 blur-lg" aria-hidden="true" />
                  </div>
                  <StepIndicator step={step} isERC20={isERC20} />
                  <p className="text-sm text-white/55 text-center">
                    {stepLabel(step, isERC20)}
                  </p>
                </div>
              )}

              {/* ── Link ready ──────────────────────────────────────────── */}
              {isLinkReady && beamLink && (
                <div className="flex flex-col gap-5">
                  <div className="glass-sm flex items-center justify-center gap-2 py-3 px-4">
                    <span className="w-5 h-5 rounded-full bg-emerald-400/30 flex items-center justify-center">
                      <span className="w-2 h-2 rounded-full bg-emerald-300" aria-hidden="true" />
                    </span>
                    <span className="text-sm text-white/80">Beam sent successfully</span>
                  </div>
                  <p className="text-sm text-white/55">
                    Share this link — the recipient claims gaslessly with just a social login.
                  </p>
                  <BeamLinkDisplay beamLink={beamLink} />
                  <div className="pt-2"><StepIndicator step={step} isERC20={isERC20} /></div>
                  <Button variant="ghost" size="sm" leftIcon={<ArrowLeft size={14} />}
                    onClick={handleSendAnother} className="self-start">
                    Send another
                  </Button>
                </div>
              )}

              {/* ── Idle: send form ─────────────────────────────────────── */}
              {step === 'idle' && (
                <>
                  {hydrated && isConnected && walletAddress && (
                    <ConnectedBar address={walletAddress} onDisconnect={handleDisconnect} />
                  )}

                  <TokenPicker value={selectedAsset} onChange={handleAssetChange} />

                  <div className="h-px bg-white/12" aria-hidden="true" />

                  <DollarAmountInput
                    dollarValue={dollarValue}
                    onChange={setDollarValue}
                    onTokenAmount={setTokenAmount}
                    onError={setAmountError}
                    selectedAsset={selectedAsset}
                    walletAddress={walletAddress}
                  />

                  {depositError && (
                    <p className="glass-sm px-3 py-2 text-sm text-red-300">{depositError}</p>
                  )}

                  <StepIndicator step={step} isERC20={isERC20} />

                  <Button
                    variant="primary"
                    size="lg"
                    disabled={hydrated && isConnected ? !canConfirm : !ready}
                    onClick={handleConfirm}
                    aria-label={!hydrated || !isConnected ? 'Connect wallet to send' : 'Confirm and send'}
                    className="w-full !justify-center"
                    leftIcon={!hydrated || !isConnected ? <Wallet size={16} /> : undefined}
                  >
                    {!hydrated || !isConnected ? 'Connect Wallet to Send' : 'Confirm & Send'}
                  </Button>

                  <div className="flex items-center justify-center gap-2 -mt-2">
                    <GaslessBadge />
                    <span className="text-xs text-white/40">Recipient claims gaslessly</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Sent beams history — stays mounted once we have an address so a
              transient wallet reconnect doesn't wipe the loaded list */}
          {stableAddress && (
            <div className="mt-4">
              <SentBeams walletAddress={stableAddress} />
            </div>
          )}
        </motion.div>
      </main>
    </>
  );
}
