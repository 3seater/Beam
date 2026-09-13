'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';
import { usePrivy } from '@privy-io/react-auth';
import { ArrowLeft, Wallet, Zap } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { SPECTRUM_PRESETS, spectrumConfigured, type SpectrumPreset } from '@/lib/spectrum';
import { useSpectrum } from '@/hooks/useSpectrum';
import { BeamFlowFrame } from './BeamFlowFrame';
import { BeamSentReceipt } from './BeamSentReceipt';
import { BeamGiftCard } from './BeamGiftCard';
import { TxProgress } from './TxProgress';
import { BundleTokenStack, BundleAllocation, BundleDetails } from './SpectrumAssets';
import { BundlePicker } from './CreateBeamModal/BundlePicker';
import { DollarAmountInput } from './CreateBeamModal/DollarAmountInput';
import { Button } from './ui/Button';
import type { NativeAsset } from './CreateBeamModal/TokenPicker';

const ETH: NativeAsset = { type: 'native', symbol: 'ETH' };
const formatAmount = (amount: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(amount);

export function SpectrumComposer({ embedded = false }: { embedded?: boolean }) {
  const router = useRouter();
  const [preset, setPreset] = useState<SpectrumPreset | null>(null);
  const [dollars, setDollars] = useState('');
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1);
  const [tokenAmount, setTokenAmount] = useState<string | null>(null);
  const [amountError, setAmountError] = useState<string | null>(null);
  const { address, isConnected, status } = useAccount();
  const { connectWallet, ready } = usePrivy();
  const hydrated = ready && status !== 'connecting' && status !== 'reconnecting';
  const flow = useSpectrum(address);
  useEffect(() => {
    if (flow.pending) {
      setPreset(SPECTRUM_PRESETS.find(p => p.id === flow.pending?.presetId) ?? null);
      setDollars(String(flow.pending.usdAmount)); setStep(3);
    }
  }, [flow.pending]);
  const amount = Number(dollars);
  const valid = Number.isFinite(amount) && amount >= 5 && amount <= 100_000 && tokenAmount !== null && amountError === null;
  const busy = flow.status !== 'idle' && flow.status !== 'done';
  const finished = flow.status === 'done' && !!flow.link;
  function go(next: number) { setDirection(next > step ? 1 : -1); setStep(next); }
  function back() { if (step === 1) router.back(); else go(step - 1); }
  function select(p: SpectrumPreset) { setPreset(p); setDollars(''); setTokenAmount(null); go(2); }
  function reset() { flow.reset(); setPreset(null); setDollars(''); setTokenAmount(null); go(1); }
  const title = busy ? 'Sending…' : finished ? 'Your Beam is ready' : step === 1 ? 'Choose a bundle' : step === 2 ? 'Set an amount' : 'Confirm & send';
  const visual = preset ? <BundleTokenStack tokens={preset.constituents} /> : undefined;
  return <BeamFlowFrame title={title} finished={finished} busy={busy || !!flow.pending} onBack={back} embedded={embedded}>
    {embedded && step > 1 && !busy && !finished && !flow.pending && <button type="button" className="bundle-details-link mb-4" onClick={back}><ArrowLeft size={14} /> Back</button>}
    <AnimatePresence mode="wait" custom={direction}>
      <motion.div key={finished ? 'receipt' : busy ? 'transaction' : step} custom={direction}
        variants={{ enter: (dir: number) => ({ opacity: 0, x: dir > 0 ? 40 : -40 }), center: { opacity: 1, x: 0 }, exit: (dir: number) => ({ opacity: 0, x: dir > 0 ? -40 : 40 }) }}
        initial="enter" animate="center" exit="exit" transition={{ duration: .28, ease: [.22, 1, .36, 1] }} className="flex flex-col gap-5 flex-1">
        {finished && flow.link && preset ? <BeamSentReceipt beamLink={flow.link} warning={flow.error} amount={formatAmount(amount)} symbol={preset.name} tokenVisual={visual} details={<BundleDetails preset={preset} amount={amount} />} onSendAnother={reset} />
        : busy && preset ? <div className="flex-1 flex items-center justify-center"><TxProgress step={flow.status === 'confirming' ? 'deposit-confirming' : 'deposit-pending'} isERC20={false} symbol={preset.name} tokenVisual={<BundleTokenStack tokens={preset.constituents} size={44} />} bundleStatus={flow.status as 'quoting' | 'signing' | 'confirming'} /></div>
        : step === 1 ? <BundlePicker onChange={select} />
        : preset && step === 2 ? <>
          <button type="button" onClick={() => go(1)} className="flex items-center gap-3 glass-sm rounded-2xl px-4 py-3 hover:bg-white/15 transition-colors w-full" aria-label={`Change bundle: ${preset.name}`}>
            <BundleTokenStack tokens={preset.constituents} size={28} /><span className="text-left flex-1 min-w-0"><span className="block text-sm font-semibold text-white leading-tight">{preset.name}</span><span className="block text-xs text-white/45">{preset.constituents.length} assets</span></span><span className="text-xs text-white/40">Change</span>
          </button>
          <DollarAmountInput dollarValue={dollars} onChange={setDollars} onTokenAmount={setTokenAmount} onError={setAmountError} selectedAsset={ETH} walletAddress={address} bundle />
          <div className="quote-panel glass-sm amount-quote-panel"><div className="amount-quote-header"><span><Zap size={12} /> Your allocation</span><span>{preset.constituents.length} assets</span></div><BundleAllocation preset={preset} amount={amount} /><div className="amount-quote-note">Paid in ETH · final token amounts quoted before sending</div></div>
          {dollars && (!Number.isFinite(amount) || amount < 5 || amount > 100_000) && <p role="alert" className="text-xs text-red-300">Enter an amount from $5 to $100,000.</p>}
          <div className="mt-auto pt-2"><Button variant="primary" size="lg" disabled={!valid} onClick={() => go(3)} rightIcon={<ArrowLeft size={18} className="rotate-180" />} className="w-full !justify-center !py-4">Continue</Button></div>
        </> : preset && <>
          <BeamGiftCard amount={formatAmount(amount)} symbol={preset.name} tokenVisual={visual} label="Your Beam" status="Review & send" />
          <BundleDetails preset={preset} amount={amount} />
          {!spectrumConfigured && <p className="text-xs text-white/50 text-center">Bundle sending is not available yet.</p>}
          {flow.error && <p role="alert" className="glass-sm px-4 py-3 text-sm text-red-300 rounded-2xl text-center">{flow.error}</p>}
          <div className="mt-auto flex flex-col gap-3"><Button variant="primary" size="lg" className="w-full !justify-center !py-4" disabled={!flow.pending && (!valid || !spectrumConfigured)} leftIcon={!hydrated || !isConnected ? <Wallet size={18} /> : <Zap size={18} />} onClick={() => {
            if (flow.pending) { void flow.resume(); return; }
            if (!hydrated || !isConnected || !address) { connectWallet(); return; }
            void flow.send(preset, amount, address);
          }}>{flow.pending ? 'Retry confirmation' : !hydrated || !isConnected ? 'Connect Wallet to Send' : 'Send Beam'}</Button></div>
        </>}
      </motion.div>
    </AnimatePresence>
  </BeamFlowFrame>;
}
