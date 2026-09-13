'use client';

import { useState, useRef, useEffect } from 'react';
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

// Pixels per second for the auto-scroll
const SCROLL_SPEED = 28;

export function HeroBeamDemo({ onAssetChange }: { onAssetChange?: (asset: string) => void }) {
  const [asset, setAsset] = useState<Asset>('ETH');
  const [amount, setAmount] = useState<number>(100);
  const [step, setStep] = useState(0);

  const scrollRef = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);

  // Auto-scroll ticker — loops by jumping back when we reach the midpoint
  // (we render the list twice side-by-side so the loop is seamless)
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    // Respect prefers-reduced-motion — skip the ticker entirely
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const tick = (ts: number) => {
      if (!pausedRef.current) {
        const dt = lastTimeRef.current !== null ? ts - lastTimeRef.current : 0;
        lastTimeRef.current = ts;
        el.scrollLeft += (SCROLL_SPEED * dt) / 1000;
        // Seamless loop: when we've scrolled past the first copy, jump back
        const half = el.scrollWidth / 2;
        if (el.scrollLeft >= half) {
          el.scrollLeft -= half;
        }
      } else {
        lastTimeRef.current = null;
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current !== null) cancelAnimationFrame(rafRef.current); };
  }, []);

  const pause = () => { pausedRef.current = true; };
  const resume = () => { pausedRef.current = false; };

  const selectAsset = (sym: Asset) => {
    setAsset(sym);
    onAssetChange?.(sym);
  };

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

      {/* Auto-scrolling ticker — two copies for seamless loop */}
      <div
        className="hero-demo-assets-wrap"
        onMouseEnter={pause}
        onMouseLeave={resume}
        onFocus={pause}
        onBlur={resume}
      >
        <div
          ref={scrollRef}
          className="hero-demo-assets"
          role="group"
          aria-label="Preview a token"
        >
          {/* Two identical copies so the scroll loops seamlessly */}
          {[0, 1].map(copy =>
            ASSETS.map(sym => (
              <button
                key={`${copy}-${sym}`}
                type="button"
                data-symbol={sym}
                aria-pressed={asset === sym}
                aria-label={sym}
                onClick={() => selectAsset(sym)}
                tabIndex={copy === 0 ? 0 : -1}
              >
                <LandingTokenLogo symbol={sym} size={20} />{sym}
              </button>
            ))
          )}
        </div>
      </div>

      <div className="hero-demo-stage" data-step={step}>
        <div className="hero-demo-beam" style={tokenCardStyle(asset)}>
          <div className="hero-demo-card-top">
            <span>{step === 0 ? 'Your Beam' : step === 1 ? 'Sent you a Beam.' : 'Beam claimed'}</span>
            {step === 2 ? <span className="hero-demo-check"><Check size={16} /></span> : <ArrowUpRight size={18} />}
          </div>
          <div className="hero-demo-value" aria-live="polite" aria-atomic="true">
            <span>${amount}<span>.00</span></span>
            <span className="hero-demo-asset"><LandingTokenLogo key={asset} symbol={asset} size={48} /><span>{asset}</span></span>
          </div>
          <div className="hero-demo-card-bottom">
            {step === 0 ? <span>Choose how much to send.</span> : step === 1 ? <><Link2 size={14} /><span>One private link. Ready to share.</span></> : <><Check size={14} /><span>${amount} of {asset}, received.</span></>}
          </div>
        </div>

        <div className="hero-demo-detail">
          {step === 0 ? (
            <div className="hero-demo-amounts" role="group" aria-label="Preview an amount">
              {AMOUNTS.map(value => <button key={value} type="button" aria-pressed={amount === value} onClick={() => setAmount(value)}>${value}</button>)}
            </div>
          ) : step === 1 ? <p><span className="hero-demo-link">usebe.am/claim#••••••</span>Send the link in any conversation.</p> : <p>They sign in with Apple or Google. No existing wallet needed.</p>}
        </div>
      </div>

      <button className="hero-demo-next" type="button" onClick={() => setStep((step + 1) % STEPS.length)}>
        {step === 0 ? 'Preview the link' : step === 1 ? 'See how they claim' : 'Try another Beam'}
        {step === 2 ? <RotateCcw size={16} /> : <ArrowRight size={17} />}
      </button>
    </div>
  );
}
