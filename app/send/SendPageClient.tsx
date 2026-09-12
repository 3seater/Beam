'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';
import { usePrivy } from '@privy-io/react-auth';
import { ArrowLeft, Zap, Wallet, Check } from 'lucide-react';
import { ICON_SIZE } from '@/lib/icons';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';

import { TokenPicker, type SelectedAsset } from '@/components/CreateBeamModal/TokenPicker';
import { DollarAmountInput } from '@/components/CreateBeamModal/DollarAmountInput';
import { BeamLinkDisplay } from '@/components/CreateBeamModal/BeamLinkDisplay';
import { Button } from '@/components/ui/Button';
import { useDeposit } from '@/hooks/useDeposit';
import type { BeamStep } from '@/lib/types';

// ── Wizard steps ──────────────────────────────────────────────────────────────
type WizardStep = 1 | 2 | 3; // 1=asset, 2=amount, 3=confirm/tx

// ── Helpers ───────────────────────────────────────────────────────────────────
function txStepLabel(step: BeamStep, symbol?: string): string {
  switch (step) {
    case 'swap-pending': return 'Waiting for swap';
    case 'swap-confirming': return symbol ? `Swapping ETH → ${symbol}` : 'Swapping';
    case 'approval-pending': return 'Waiting for approval';
    case 'approval-confirming': return 'Confirming approval';
    case 'deposit-pending': return 'Depositing';
    case 'deposit-confirming': return 'Confirming on-chain';
    default: return '';
  }
}

const TX_STEPS: BeamStep[] = [
  'swap-pending', 'swap-confirming',
  'approval-pending', 'approval-confirming',
  'deposit-pending', 'deposit-confirming',
];

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
    <div className="flex flex-col items-center gap-6 py-8">
      {/* Token logo */}
      <div className="relative">
        {!imgErr && logoUrl
          ? <Image src={logoUrl} alt={symbol} width={96} height={96} className="rounded-2xl object-contain bg-white/10" onError={() => setImgErr(true)} unoptimized />
          : <span className="rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center text-2xl font-semibold text-white/80" style={{ width: 96, height: 96 }}>{symbol.slice(0, 2)}</span>
        }
      </div>

      {/* Amount */}
      <div className="text-center">
        <p className="text-6xl font-semibold text-white tracking-tight">${usdAmount}</p>
        <p className="text-lg text-white/50 mt-2">of {symbol}</p>
      </div>
    </div>
  );
}

function AnimatedDots() {
  const [count, setCount] = useState(1);
  useEffect(() => {
    const id = setInterval(() => setCount((c) => (c % 3) + 1), 500);
    return () => clearInterval(id);
  }, []);
  return (
    <span className="inline-block w-5 text-left" aria-hidden="true">
      {'.'.repeat(count)}
    </span>
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
      {/* Icon tile with animated border tracer */}
      <div className="w-20 h-20 rounded-[18px] glass flex items-center justify-center shadow-glass animate-glow-pulse border-tracer">
        <Zap size={ICON_SIZE.xl} className="text-white" />
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
              {i < stageIdx && <Check size={ICON_SIZE.xs} />}
              {i === stageIdx && <span className="w-2 h-2 rounded-full bg-white animate-pulse" />}
              {label}
            </div>
            {i < stages.length - 1 && <div className="w-4 h-px bg-white/20" />}
          </div>
        ))}
      </div>

      <p className="text-sm text-white/50 text-center">
        {txStepLabel(step, symbol)}<AnimatedDots />
      </p>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export function SendPageClient() {
  const router = useRouter();
  const { address: walletAddress, isConnected, status: accountStatus } = useAccount();
  const { ready, connectWallet } = usePrivy();

  // ssr:false guarantees this only runs on the client, so no mounted guard needed.
  // Gate on both wagmi accountStatus AND Privy `ready` — Privy `ready` is the
  // authoritative signal that the SDK has read its session from storage. Without
  // it, wagmi can briefly report disconnected before Privy's reconnect handshake
  // finishes, flashing "Connect Wallet to Send" to an already-authenticated user.
  const hydrated = ready && accountStatus !== 'connecting' && accountStatus !== 'reconnecting';

  // ── Wizard state ────────────────────────────────────────────────────────
  const [wizardStep, setWizardStep] = useState<WizardStep>(1);
  const [selectedAsset, setSelectedAsset] = useState<SelectedAsset | null>(null);
  const [dollarValue, setDollarValue] = useState('');
  const [tokenAmount, setTokenAmount] = useState<string | null>(null);
  const [amountError, setAmountError] = useState<string | null>('Please enter an amount');

  const { step: txStep, beamLink, error: depositError, startDeposit, reset } = useDeposit();

  const isInProgress = TX_STEPS.includes(txStep);
  const isLinkReady = txStep === 'link-generated';
  const isERC20 = selectedAsset?.type === 'erc20';
  const usdAmount = parseFloat(dollarValue) || 0;

  // Local flag: true from Send Beam click until tx step moves (covers wallet prompt + rpc gap)
  const [submitting, setSubmitting] = useState(false);
  useEffect(() => {
    if (txStep !== 'idle') setSubmitting(false);
  }, [txStep]);

  const canProceedToConfirm =
    amountError === null && tokenAmount !== null && usdAmount > 0;

  // When tx completes or errors, make sure we're on step 3
  useEffect(() => {
    if (isInProgress || isLinkReady) setWizardStep(3);
  }, [isInProgress, isLinkReady]);

  const handleAssetSelect = useCallback((asset: SelectedAsset | null) => {
    setSelectedAsset(asset);
    setDollarValue('');
    setTokenAmount(null);
    setAmountError('Please enter an amount');
    // Only advance to step 2 when a token is actually chosen
    if (asset !== null) setWizardStep(2);
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
    setSubmitting(true);
    const tokenAddr = selectedAsset?.type === 'erc20' ? selectedAsset.address : null;
    const tokenSymbol = selectedAsset?.type === 'native' ? 'ETH' : (selectedAsset?.symbol ?? 'ETH');
    await startDeposit(tokenAddr, usdAmount, tokenSymbol, walletAddress,
      typeof window !== 'undefined' ? window.location.origin : '');
  }, [hydrated, isConnected, walletAddress, selectedAsset, usdAmount, startDeposit, connectWallet]);

  const handleSendAnother = useCallback(() => {
    reset();
    setSubmitting(false);
    setSelectedAsset(null);
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
                  <ArrowLeft size={ICON_SIZE.md} />
                </button>
              ) : <div className="w-9" />}

              <h1 className="text-base font-semibold text-white tracking-tight text-center flex-1 px-4">
                {cardTitle}
              </h1>

              {/* Right spacer to keep title centered */}
              <div className="w-9 shrink-0" />
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
                    {selectedAsset && <AssetChip asset={selectedAsset} onClick={() => setWizardStep(1)} />}

                    <DollarAmountInput
                      dollarValue={dollarValue}
                      onChange={setDollarValue}
                      onTokenAmount={setTokenAmount}
                      onError={setAmountError}
                      selectedAsset={selectedAsset ?? { type: 'native', symbol: 'ETH' }}
                      walletAddress={walletAddress}
                    />

                    <div className="mt-auto pt-2">
                      <Button
                        variant="primary"
                        size="lg"
                        disabled={!canProceedToConfirm}
                        onClick={() => canProceedToConfirm && setWizardStep(3)}
                        rightIcon={<ArrowLeft size={ICON_SIZE.md} className="rotate-180" aria-hidden="true" />}
                        className="w-full !justify-center !py-4"
                      >
                        Continue
                      </Button>
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
                    <ConfirmSummary asset={selectedAsset ?? { type: 'native', symbol: 'ETH' }} usdAmount={usdAmount} />

                    {depositError && (
                      <p className="glass-sm px-4 py-3 text-sm text-red-300 rounded-2xl text-center">
                        {depositError}
                      </p>
                    )}

                    <div className="mt-auto flex flex-col gap-3">
                      <Button
                        variant="primary"
                        size="lg"
                        isLoading={submitting}
                        loadingLabel={!hydrated || !isConnected ? 'Connecting' : 'Sending'}
                        onClick={handleSend}
                        leftIcon={!hydrated || !isConnected ? <Wallet size={ICON_SIZE.md} /> : <Zap size={ICON_SIZE.md} />}
                        className="w-full !justify-center !py-4"
                      >
                        {!hydrated || !isConnected ? 'Connect Wallet to Send' : 'Send Beam'}
                      </Button>
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
                    <TxProgress step={txStep} isERC20={isERC20} symbol={selectedAsset?.type === 'native' ? 'ETH' : (selectedAsset?.symbol ?? 'ETH')} />
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
                        <Check size={ICON_SIZE.lg} className="text-emerald-300" />
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
        </motion.div>
      </main>
    </>
  );
}
