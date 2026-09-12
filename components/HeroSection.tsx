'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, ArrowUpRight, Check, Link2 } from 'lucide-react';
import { LandingTokenLogo } from './LandingTokenLogo';
import { BeamMark } from './BeamMark';
export interface HeroSectionProps {
  onSendClick?: () => void;
}
const ASSETS = ['ETH', 'NVDA', 'MSFT'] as const;
export function HeroSection({
  onSendClick
}: HeroSectionProps) {
  const router = useRouter();
  const [asset, setAsset] = useState<(typeof ASSETS)[number]>('ETH');
  const handleSend = () => onSendClick ? onSendClick() : router.push('/send');
  return <section id="hero" className="premium-hero" aria-labelledby="hero-title">
    <div className="hero-atmosphere" aria-hidden="true" />
    <div className="layout hero-grid"><div className="hero-copy">
      <h1 id="hero-title">Send crypto.<br /><span>Share a link.</span></h1>
      <p>Crypto and stock tokens, sent to anyone.<br className="hidden sm:block" /> No wallet needed to receive.</p>
      <div className="hero-actions"><button className="premium-button" onClick={handleSend}>Send a Beam <ArrowUpRight size={18} /></button><a className="text-link" href="#how-it-works">See how it works <ArrowRight size={16} /></a></div>
    </div><div className="beam-scene" aria-label="Example: send 100 dollars of tokens as a Beam link">
      <div className="orbit orbit-one" aria-hidden="true" /><div className="orbit orbit-two" aria-hidden="true" />
      <div className="scene-star"><BeamMark sculptural /></div><div className="scene-spark spark-one" aria-hidden="true">✦</div><div className="scene-spark spark-two" aria-hidden="true">✦</div>
      <div className="send-preview"><div className="preview-top"><span className="preview-brand"><BeamMark /> Your Beam</span><ArrowUpRight size={16} /></div><div className="preview-amount">$100<span>.00</span></div><div className="asset-switch" aria-label="Preview an asset">{ASSETS.map(item => <button key={item} type="button" aria-pressed={asset === item} onClick={() => setAsset(item)}><LandingTokenLogo symbol={item} size={20} />{item}</button>)}</div><div className="preview-link"><Link2 size={15} /><span>One link. Ready to share.</span><Check size={15} /></div><span className="example-label">Product preview</span></div>
      <div className="message-preview"><span>Sent you a Beam.</span><span className="message-link"><LandingTokenLogo key={asset} symbol={asset} size={28} /> $100 of {asset} <ArrowUpRight size={16} /></span><small>Delivered</small></div>
      <div className="claimed-preview"><span className="claimed-icon"><Check size={17} /></span><div>Received.<small>Beam claimed</small></div></div>
    </div></div>
    <div className="layout hero-base"><span>Built on Robinhood Chain <ArrowUpRight size={12} /></span></div>
  </section>;
}
