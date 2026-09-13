'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';
import { usePrivy } from '@privy-io/react-auth';
import { ArrowLeft, Zap, Wallet } from 'lucide-react';
import { ICON_SIZE } from '@/lib/icons';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';

import { TokenPicker, type SelectedAsset } from '@/components/CreateBeamModal/TokenPicker';
import { DollarAmountInput } from '@/components/CreateBeamModal/DollarAmountInput';
import { TxProgress } from '@/components/TxProgress';
import { BeamSentReceipt } from '@/components/BeamSentReceipt';
import { BeamGiftCard } from '@/components/BeamGiftCard';
import { Button } from '@/components/ui/Button';
import { useDeposit } from '@/hooks/useDeposit';
import type { BeamStep } from '@/lib/types';
import { BeamFlowFrame } from '@/components/BeamFlowFrame';
import { SpectrumComposer } from '@/components/SpectrumComposer';

// ── Wizard steps ──────────────────────────────────────────────────────────────
type WizardStep = 1 | 2 | 3; // 1=asset, 2=amount, 3=confirm/tx

// ── Helpers ───────────────────────────────────────────────────────────────────
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
  return <BeamGiftCard amount={new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(usdAmount)} symbol={symbol} logoUrl={asset.type === 'erc20' ? asset.logoUrl : undefined} label="Your Beam" status="Review & send" />;
}

// ── Page ──────────────────────────────────────────────────────────────────────
export function SendPageClient() {
  const [mode, setMode] = useState<'single' | 'spectrum'>(() => typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('mode') === 'spectrum' ? 'spectrum' : 'single');
  return <>
    <div className="beam-send-mode" role="tablist" aria-label="Beam type">
      <button id="single-tab" role="tab" aria-controls="single-panel" aria-selected={mode === 'single'} onClick={() => setMode('single')}>Single asset</button>
      <button id="spectrum-tab" role="tab" aria-controls="spectrum-panel" aria-selected={mode === 'spectrum'} onClick={() => setMode('spectrum')}>Spectrum <span>Bundle</span></button>
    </div>
    <div id="single-panel" role="tabpanel" aria-labelledby="single-tab" hidden={mode !== 'single'}><SingleSendPage /></div>
    <div id="spectrum-panel" role="tabpanel" aria-labelledby="spectrum-tab" hidden={mode !== 'spectrum'}><SpectrumComposer /></div>
  </>;
}

function SingleSendPage() {
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
    try {
      await startDeposit(tokenAddr, usdAmount, tokenSymbol, walletAddress,
        typeof window !== 'undefined' ? window.location.origin : '');
    } finally { setSubmitting(false); }
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

  return <BeamFlowFrame title={cardTitle} finished={isLinkReady} busy={isInProgress || submitting} onBack={handleBack}>
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
                    <TxProgress logoUrl={selectedAsset?.type === 'erc20' ? selectedAsset.logoUrl : undefined} step={txStep} isERC20={isERC20} symbol={selectedAsset?.type === 'native' ? 'ETH' : (selectedAsset?.symbol ?? 'ETH')} />
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
                    <BeamSentReceipt beamLink={beamLink} logoUrl={selectedAsset?.type === 'erc20' ? selectedAsset.logoUrl : undefined} warning={depositError} amount={new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(usdAmount)} symbol={selectedAsset?.symbol ?? 'ETH'} onSendAnother={handleSendAnother} />
                  </motion.div>
                )}
              </AnimatePresence>
  </BeamFlowFrame>;
}
