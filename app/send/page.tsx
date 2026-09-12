'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAccount, useDisconnect } from 'wagmi';
import { usePrivy } from '@privy-io/react-auth';
import { ArrowLeft, Zap, Wallet, LogOut, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';

import { GaslessBadge } from '@/components/ui/Badge';
import { TokenPicker, type SelectedAsset } from '@/components/CreateBeamModal/TokenPicker';
import { DollarAmountInput } from '@/components/CreateBeamModal/DollarAmountInput';
import { BeamLinkDisplay } from '@/components/CreateBeamModal/BeamLinkDisplay';
import { useDeposit } from '@/hooks/useDeposit';
import { SentBeams } from '@/components/SentBeams';
import type { BeamStep } from '@/lib/types';

// ── Wizard steps ──────────────────────────────────────────────────────────────
type WizardStep = 1 | 2 | 3; // 1=asset, 2=amount, 3=confirm/tx

// ── Helpers ───────────────────────────────────────────────────────────────────
function txStepLabel(step: BeamStep, symbol?: string): string {
  switch (step) {
    case 'swap-pending': return 'Waiting for swap…';
    case 'swap-confirming': return symbol ? `Swapping ETH → ${symbol}…` : 'Swapping…';
    case 'approval-pending': return 'Waiting for approval…';
    case 'approval-confirming': return 'Confirming approval…';
    case 'deposit-pending': return 'Depositing…';
    case 'deposit-confirming': return 'Confirming on-chain…';
    default: return '';
  }
}

const TX_STEPS: BeamStep[] = [
  'swap-pending', 'swap-confirming',
  'approval-pending', 'approval-confirming',
  'deposit-pending', 'deposit-confirming',
];

// ── Wallet bar (top-right of card header) ─────────────────────────────────────
function WalletChip({ address, onDisconnect }: { address: string; onDisconnect: () => void }) {
  return (
    <div className="flex items-center gap-1.5 glass-sm rounded-full pl-2 pr-1 py-1">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
      <span className="text-[11px] font-mono text-white/60">{address.slice(0, 6)}…{address.slice(-4)}</span>
      <button
        type="button" onClick={onDisconnect}
        className="w-5 h-5 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 transition-colors"
        aria-label="Disconnect"
      >
        <LogOut size={9} className="text-white/50" />
      </button>
    </div>
  );
}

// ── Selected asset summary chip ───────────────────────────────────────────────
function AssetChip({ asset, onClick }: { asset: SelectedAsset; onClick: () => void }) {
  const symbol = asset.type === 'native' ? 'ETH' : asset.symbol;
  const name = asset.type === 'native' ? 'Ethereum' : asset.name;
  const logoUrl = asset.type === 'erc20' ? asset.logoUrl : 'https://coin-images.coingecko.com/coins/images/279/small/ethereum.png?1696501628';
  const [imgErr, setImgErr] = useState(false);

  return (
    <button
      type="button" onClick={onClick}
      className="flex items-center gap-3 glass-sm rounded-2xl px-4 py-3 hover:bg-white/15 transition-colors w-full"
      aria-label={`Change asset: ${name}`}
    >
      {!imgErr && logoUrl
        ? <Image src={logoUrl} alt={symbol} width={36} height={36} className="rounded-xl object-contain bg-white/10 shrink-0" onError={() => setImgErr(true)} unoptimized />
        : <span className="w-9 h-9 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center text-xs font-semibold text-white/80 shrink-0">{symbol.slice(0, 2)}</span>
      }
      <div className="text-left flex-1 min-w-0">
        <p className="text-sm font-semibold text-white leading-tight">{name}</p>
        <p className="text-xs text-white/45">{symbol}</p>
      </div>
      <span className="text-xs text-white/40">Change</span>
    </button>
  );
}

// ── Confirm summary ───────────────────────────────────────────────────────────
function ConfirmSummary({ asset, usdAmount }: { asset: SelectedAsset; usdAmount: number }) {
  const symbol = asset.type === 'native' ? 'ETH' : asset.symbol;
  const logoUrl = asset.type === 'erc20' ? asset.logoUrl : 'https://coin-images.coingecko.com/coins/images/279/small/ethereum.png?1696501628';
  const [imgErr, setImgErr] = useState(false);

  return (
    <div className="flex flex-col items-center gap-6 py-4">
      {/* Token logo */}
      <div className="relative">
        {!imgErr && logoUrl
          ? <Image src={logoUrl} alt={symbol} width={72} height={72} className="rounded-2xl object-contain bg-white/10" onError={() => setImgErr(true)} unoptimized />
          : <span className="w-18 h-18 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center text-lg font-semibold text-white/80" style={{ width: 72, height: 72 }}>{symbol.slice(0, 2)}</span>
        }
      </div>

      {/* Amount */}
      <div className="text-center">
        <p className="text-5xl font-semibold text-white tracking-tight">${usdAmount}</p>
        <p className="text-base text-white/50 mt-1">of {symbol}</p>
      </div>

      {/* Gasless note */}
      <div className="flex items-center gap-2 text-sm text-white/45">
        <GaslessBadge />
      </div>
    </div>
  );
}

// ── In-progress spinner ───────────────────────────────────────────────────────
function TxProgress({ step, isERC20, symbol }: { step: BeamStep; isERC20: boolean; symbol?: string }) {
  const stages = isERC20
    ? ['Swap', 'Approve', 'Deposit']
    : ['Deposit'];

  const stageIdx = isERC20
    ? step.startsWith('swap') ? 0 : step.startsWith('approval') ? 1 : 2
    : 0;

  return (
    <div className="flex flex-col items-center gap-8 py-8">
      <div className="relative">
        <div className="w-20 h-20 rounded-full glass flex items-center justify-center animate-glow-pulse">
          <Zap size={32} className="text-white" />
        </div>
        <div className="absolute inset-0 rounded-full bg-white/10 blur-xl" aria-hidden="true" />
      </div>

      {/* Stage pills */}
      <div className="flex items-center gap-2">
        {stages.map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <div className={[
              'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all',
              i < stageIdx ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/20' :
                i === stageIdx ? 'bg-white/20 text-white border border-white/30' :
                  'bg-white/8 text-white/30 border border-white/10',
            ].join(' ')}>
              {i < stageIdx && <Check size={10} />}
              {i === stageIdx && <span className="w-2 h-2 rounded-full bg-white animate-pulse" />}
              {label}
            </div>
            {i < stages.length - 1 && <div className="w-4 h-px bg-white/20" />}
          </div>
        ))}
      </div>

      <p className="text-sm text-white/50 text-center">{txStepLabel(step, symbol)}</p>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function SendPage() {
  const router = useRouter();
  const { address: walletAddress, isConnected, status: accountStatus } = useAccount();
  const { connectWallet } = usePrivy();
  const { disconnect } = useDisconnect();

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const hydrated = mounted && accountStatus !== 'connecting' && accountStatus !== 'reconnecting';

  const lastAddressRef = useRef<string | undefined>(undefined);
  if (isConnected && walletAddress) lastAddressRef.current = walletAddress;
  const stableAddress = lastAddressRef.current;

  // ── Wizard state ────────────────────────────────────────────────────────
  const [wizardStep, setWizardStep] = useState<WizardStep>(1);
  const [selectedAsset, setSelectedAsset] = useState<SelectedAsset>({ type: 'native', symbol: 'ETH' });
  const [dollarValue, setDollarValue] = useState('');
  const [tokenAmount, setTokenAmount] = useState<string | null>(null);
  const [amountError, setAmountError] = useState<string | null>('Please enter an amount');

  const { step: txStep, beamLink, error: depositError, startDeposit, reset } = useDeposit();

  const isInProgress = TX_STEPS.includes(txStep);
  const isLinkReady = txStep === 'link-generated';
  const isERC20 = selectedAsset.type === 'erc20';
  const usdAmount = parseFloat(dollarValue) || 0;

  const canProceedToConfirm =
    amountError === null && tokenAmount !== null && usdAmount > 0;

  // When tx completes or errors, make sure we're on step 3
  useEffect(() => {
    if (isInProgress || isLinkReady) setWizardStep(3);
  }, [isInProgress, isLinkReady]);

  const handleAssetSelect = useCallback((asset: SelectedAsset) => {
    setSelectedAsset(asset);
    setDollarValue('');
    setTokenAmount(null);
    setAmountError('Please enter an amount');
    setWizardStep(2);
  }, []);

  const handleBack = useCallback(() => {
    if (wizardStep === 1) { router.back(); return; }
    setWizardStep((s) => (s - 1) as WizardStep);
  }, [wizardStep, router]);

  const handleSend = useCallback(async () => {
    if (!hydrated || !isConnected || !walletAddress) {
      connectWallet();
      return;
    }
    const tokenAddr = selectedAsset.type === 'erc20' ? selectedAsset.address : null;
    const tokenSymbol = selectedAsset.type === 'native' ? 'ETH' : selectedAsset.symbol;
    await startDeposit(tokenAddr, usdAmount, tokenSymbol, walletAddress,
      typeof window !== 'undefined' ? window.location.origin : '');
  }, [hydrated, isConnected, walletAddress, selectedAsset, usdAmount, startDeposit, connectWallet]);

  const handleSendAnother = useCallback(() => {
    reset();
    setSelectedAsset({ type: 'native', symbol: 'ETH' });
    setDollarValue('');
    setTokenAmount(null);
    setAmountError('Please enter an amount');
    setWizardStep(1);
  }, [reset]);

  // Title per wizard step / tx state
  const cardTitle = isLinkReady
    ? 'Your Beam is ready'
    : isInProgress
      ? 'Sending…'
      : wizardStep === 1 ? 'Choose a token'
        : wizardStep === 2 ? 'Set an amount'
          : 'Confirm & send';

  const slideVariants = {
    enter: (dir: number) => ({ opacity: 0, x: dir > 0 ? 40 : -40 }),
    center: { opacity: 1, x: 0 },
    exit: (dir: number) => ({ opacity: 0, x: dir > 0 ? -40 : 40 }),
  };

  const [dir, setDir] = useState(1);
  const prevStep = useRef(wizardStep);
  useEffect(() => {
    setDir(wizardStep > prevStep.current ? 1 : -1);
    prevStep.current = wizardStep;
  }, [wizardStep]);

  return (
    <>
      <main className="min-h-screen flex flex-col items-center justify-center px-4 py-28">
        <motion.div
          className="w-full max-w-xl"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="glass-strong rounded-[32px] overflow-hidden">

            {/* ── Card header ─────────────────────────────────────────── */}
            <div className="flex items-center justify-between px-7 pt-6 pb-5 border-b border-white/10">
              {/* Back / close */}
              {!isInProgress && !isLinkReady ? (
                <button
                  type="button" onClick={handleBack}
                  className="btn-glass-icon !w-9 !h-9 shrink-0" aria-label="Back"
                >
                  <ArrowLeft size={16} />
                </button>
              ) : <div className="w-9" />}

              <h1 className="text-base font-semibold text-white tracking-tight text-center flex-1 px-4">
                {cardTitle}
              </h1>

              {/* Wallet chip */}
              <div className="shrink-0">
                {hydrated && isConnected && walletAddress
                  ? <WalletChip address={walletAddress} onDisconnect={() => disconnect()} />
                  : <div className="w-9" />
                }
              </div>
            </div>

            {/* ── Card body ───────────────────────────────────────────── */}
            <div className="px-7 py-7 min-h-[400px] flex flex-col">
              <AnimatePresence mode="wait" custom={dir}>
                {/* ── STEP 1: Pick asset ──────────────────────────────── */}
                {!isInProgress && !isLinkReady && wizardStep === 1 && (
                  <motion.div
                    key="step1"
                    custom={dir}
                    variants={slideVariants}
                    initial="enter" animate="center" exit="exit"
                    transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                    className="flex flex-col gap-5 flex-1"
                  >
                    <TokenPicker
                      value={selectedAsset}
                      onChange={handleAssetSelect}
                    />
                  </motion.div>
                )}

                {/* ── STEP 2: Enter amount ─────────────────────────────── */}
                {!isInProgress && !isLinkReady && wizardStep === 2 && (
                  <motion.div
                    key="step2"
                    custom={dir}
                    variants={slideVariants}
                    initial="enter" animate="center" exit="exit"
                    transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                    className="flex flex-col gap-5 flex-1"
                  >
                    {/* Show which asset is selected, tappable to go back */}
                    <AssetChip asset={selectedAsset} onClick={() => setWizardStep(1)} />

                    <DollarAmountInput
                      dollarValue={dollarValue}
                      onChange={setDollarValue}
                      onTokenAmount={setTokenAmount}
                      onError={setAmountError}
                      selectedAsset={selectedAsset}
                      walletAddress={walletAddress}
                    />

                    <div className="mt-auto pt-2">
                      <button
                        type="button"
                        onClick={() => canProceedToConfirm && setWizardStep(3)}
                        disabled={!canProceedToConfirm}
                        className="btn-glass-primary w-full !justify-center !py-4 !text-base flex items-center gap-2 disabled:opacity-40"
                      >
                        Continue
                        <ArrowLeft size={16} className="rotate-180" aria-hidden="true" />
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* ── STEP 3: Confirm ──────────────────────────────────── */}
                {!isInProgress && !isLinkReady && wizardStep === 3 && (
                  <motion.div
                    key="step3"
                    custom={dir}
                    variants={slideVariants}
                    initial="enter" animate="center" exit="exit"
                    transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                    className="flex flex-col gap-5 flex-1"
                  >
                    <ConfirmSummary asset={selectedAsset} usdAmount={usdAmount} />

                    {depositError && (
                      <p className="glass-sm px-4 py-3 text-sm text-red-300 rounded-2xl text-center">
                        {depositError}
                      </p>
                    )}

                    <div className="mt-auto flex flex-col gap-3">
                      <button
                        type="button"
                        onClick={handleSend}
                        className="btn-glass-primary w-full !justify-center !py-4 !text-base flex items-center gap-2"
                      >
                        {!hydrated || !isConnected
                          ? <><Wallet size={16} />Connect Wallet to Send</>
                          : <><Zap size={16} />Send Beam</>
                        }
                      </button>
                      <p className="text-center text-xs text-white/35">
                        Recipients claim gaslessly — no gas, no wallet.
                      </p>
                    </div>
                  </motion.div>
                )}

                {/* ── TX in-progress ───────────────────────────────────── */}
                {isInProgress && (
                  <motion.div
                    key="tx-progress"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="flex-1 flex items-center justify-center"
                  >
                    <TxProgress step={txStep} isERC20={isERC20} symbol={selectedAsset.type === 'native' ? 'ETH' : selectedAsset.symbol} />
                  </motion.div>
                )}

                {/* ── Link ready ───────────────────────────────────────── */}
                {isLinkReady && beamLink && (
                  <motion.div
                    key="link-ready"
                    initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                    className="flex flex-col gap-5 flex-1"
                  >
                    <div className="flex flex-col items-center gap-3 py-4 text-center">
                      <div className="w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center">
                        <Check size={24} className="text-emerald-300" />
                      </div>
                      <p className="text-sm text-white/60 max-w-[28ch]">
                        Send this link. They claim in seconds.
                      </p>
                    </div>

                    <BeamLinkDisplay beamLink={beamLink} />

                    <div className="mt-auto">
                      <button
                        type="button" onClick={handleSendAnother}
                        className="btn-glass-ghost w-full !justify-center !py-3 !text-sm"
                      >
                        Send another Beam
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Past beams */}
          {stableAddress && (
            <div className="mt-5">
              <SentBeams walletAddress={stableAddress} />
            </div>
          )}
        </motion.div>
      </main>
    </>
  );
}
