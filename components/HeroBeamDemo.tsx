'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { ArrowRight, ArrowUpRight, Check, Link2, RotateCcw, ChevronLeft, ChevronRight } from 'lucide-react';
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

export function HeroBeamDemo({ onAssetChange }: { onAssetChange?: (asset: string) => void }) {
  const [asset, setAsset] = useState<Asset>('ETH');
  const [amount, setAmount] = useState<number>(100);
  const [step, setStep] = useState(0);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  const updateArrows = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateArrows();
    el.addEventListener('scroll', updateArrows, { passive: true });
    const ro = new ResizeObserver(updateArrows);
    ro.observe(el);
    return () => { el.removeEventListener('scroll', updateArrows); ro.disconnect(); };
  }, [updateArrows]);

  const scroll = (dir: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === 'left' ? -160 : 160, behavior: 'smooth' });
  };

  const selectAsset = (sym: Asset) => {
    setAsset(sym);
    onAssetChange?.(sym);
    // Scroll selected button into view
    const el = scrollRef.current;
    if (!el) return;
    const btn = el.querySelector<HTMLButtonElement>(`[data-symbol="${sym}"]`);
    btn?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
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

      {/* Scrollable asset row with arrows */}
      <div className="hero-demo-assets-wrap">
        <button
          type="button"
          className="hero-demo-scroll-btn hero-demo-scroll-left"
          aria-label="Scroll tokens left"
          onClick={() => scroll('left')}
          style={{ opacity: canScrollLeft ? 1 : 0, pointerEvents: canScrollLeft ? 'auto' : 'none' }}
        >
          <ChevronLeft size={14} />
        </button>

        <div
          ref={scrollRef}
          className="hero-demo-assets"
          role="group"
          aria-label="Preview a token"
        >
          {ASSETS.map(sym => (
            <button
              key={sym}
              type="button"
              data-symbol={sym}
              aria-pressed={asset === sym}
              onClick={() => selectAsset(sym)}
            >
              <LandingTokenLogo symbol={sym} size={20} />{sym}
            </button>
          ))}
        </div>

        <button
          type="button"
          className="hero-demo-scroll-btn hero-demo-scroll-right"
          aria-label="Scroll tokens right"
          onClick={() => scroll('right')}
          style={{ opacity: canScrollRight ? 1 : 0, pointerEvents: canScrollRight ? 'auto' : 'none' }}
        >
          <ChevronRight size={14} />
        </button>
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
