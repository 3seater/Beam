'use client';

import { useState, memo, useCallback, useRef, useEffect } from 'react';
import { ArrowRight, ArrowUpRight, Check, Link2, RotateCcw } from 'lucide-react';
import { BeamMark } from './BeamMark';
import { LandingTokenLogo } from './LandingTokenLogo';
import { tokenCardStyle } from '@/lib/token-card-theme';

const ASSETS = [
  'ETH', 'NVDA', 'AAPL', 'TSLA', 'MSFT', 'META', 'GOOGL', 'AMZN',
  'SPCX', 'MU', 'USDG', 'AI', 'CASHCAT', 'PONS', 'MEME',
] as const;

type Asset = typeof ASSETS[number];

const STEPS = ['Choose', 'Share', 'Claim'] as const;
const AMOUNTS = [10, 50, 100] as const;

const SPEED_NORMAL = 40;  // px/s
const SPEED_HOVER = 8;   // px/s
const LERP = 0.06; // how fast speed transitions (per frame)

// Memoized so parent re-renders (token selection) never interrupt the loop
const AssetTicker = memo(function AssetTicker({
  selected,
  onSelect,
}: {
  selected: Asset;
  onSelect: (sym: Asset) => void;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const posRef = useRef(0);          // current translateX in px (negative)
  const speedRef = useRef(SPEED_NORMAL); // current speed, lerped
  const targetRef = useRef(SPEED_NORMAL);
  const rafRef = useRef<number | null>(null);
  const lastRef = useRef<number | null>(null);
  const reducedMotion = useRef(false);

  useEffect(() => {
    reducedMotion.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion.current) return;

    const track = trackRef.current;
    if (!track) return;

    const tick = (ts: number) => {
      const dt = lastRef.current !== null ? Math.min(ts - lastRef.current, 50) : 0;
      lastRef.current = ts;

      // Lerp speed toward target
      speedRef.current += (targetRef.current - speedRef.current) * LERP;

      posRef.current += speedRef.current * (dt / 1000);

      // Seamless loop: jump back when we've scrolled one full copy
      const half = track.scrollWidth / 2;
      if (half > 0 && posRef.current >= half) {
        posRef.current -= half;
      }

      track.style.transform = `translateX(${-posRef.current}px)`;
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, []);

  // Mouse enter/leave on the wrapper — no state, just flip target speed
  const handleEnter = useCallback(() => { targetRef.current = SPEED_HOVER; }, []);
  const handleLeave = useCallback(() => { targetRef.current = SPEED_NORMAL; }, []);

  return (
    <div
      ref={wrapRef}
      className="hero-demo-assets-wrap"
      role="group"
      aria-label="Preview a token"
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      <div ref={trackRef} className="hero-demo-assets-track">
        {[0, 1].map(copy => (
          <div key={copy} className="hero-demo-assets-row" aria-hidden={copy === 1}>
            {ASSETS.map(sym => (
              <button
                key={sym}
                type="button"
                aria-pressed={selected === sym}
                onClick={() => onSelect(sym)}
                tabIndex={copy === 0 ? 0 : -1}
              >
                <LandingTokenLogo symbol={sym} size={20} />{sym}
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
});

export function HeroBeamDemo({ onAssetChange }: { onAssetChange?: (asset: string) => void }) {
  const [asset, setAsset] = useState<Asset>('ETH');
  const [amount, setAmount] = useState<number>(100);
  const [step, setStep] = useState(0);

  const selectAsset = useCallback((sym: Asset) => {
    setAsset(sym);
    onAssetChange?.(sym);
  }, [onAssetChange]);

  return (
    <div className="hero-demo" aria-label="Interactive Beam preview">
      <div className="hero-demo-header">
        <span><BeamMark /> Try a Beam</span>
        <span className="hero-demo-label">Interactive preview</span>
      </div>

      <div className="hero-demo-steps" role="group" aria-label="Preview the sending process">
        {STEPS.map((label, index) => (
          <button key={label} type="button" aria-pressed={step === index} onClick={() => setStep(index)}>
            <span>{index < step ? <Check size={12} /> : index + 1}</span>{label}
          </button>
        ))}
      </div>

      <AssetTicker selected={asset} onSelect={selectAsset} />

      <div className="hero-demo-stage" data-step={step}>
        <div className="hero-demo-beam" style={tokenCardStyle(asset)}>
          <div className="hero-demo-card-top">
            <span>{step === 0 ? 'Your Beam' : step === 1 ? 'Sent you a Beam.' : 'Beam claimed'}</span>
            {step === 2 ? <span className="hero-demo-check"><Check size={16} /></span> : <ArrowUpRight size={18} />}
          </div>
          <div className="hero-demo-value" aria-live="polite" aria-atomic="true">
            <span>${amount}<span>.00</span></span>
            <span className="hero-demo-asset">
              <LandingTokenLogo key={asset} symbol={asset} size={48} />
              <span>{asset}</span>
            </span>
          </div>
          <div className="hero-demo-card-bottom">
            {step === 0
              ? <span>Choose how much to send.</span>
              : step === 1
                ? <><Link2 size={14} /><span>One private link. Ready to share.</span></>
                : <><Check size={14} /><span>${amount} of {asset}, received.</span></>}
          </div>
        </div>

        <div className="hero-demo-detail">
          {step === 0 ? (
            <div className="hero-demo-amounts" role="group" aria-label="Preview an amount">
              {AMOUNTS.map(value => (
                <button key={value} type="button" aria-pressed={amount === value} onClick={() => setAmount(value)}>
                  ${value}
                </button>
              ))}
            </div>
          ) : step === 1
            ? <p><span className="hero-demo-link">usebe.am/claim#••••••</span>Send the link in any conversation.</p>
            : <p>They sign in with Apple or Google. No existing wallet needed.</p>}
        </div>
      </div>

      <button className="hero-demo-next" type="button" onClick={() => setStep((step + 1) % STEPS.length)}>
        {step === 0 ? 'Preview the link' : step === 1 ? 'See how they claim' : 'Try another Beam'}
        {step === 2 ? <RotateCcw size={16} /> : <ArrowRight size={17} />}
      </button>
    </div>
  );
}
