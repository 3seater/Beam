'use client';

import { useRouter } from 'next/navigation';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { HeroBeamDemo } from './HeroBeamDemo';
import { HeroRibbon } from './HeroRibbon';
import { useState } from 'react';
import '@/app/hero-demo.css';
export interface HeroSectionProps {
  onSendClick?: () => void;
}
export function HeroSection({
  onSendClick
}: HeroSectionProps) {
  const router = useRouter();
  const [asset, setAsset] = useState('ETH');
  const handleSend = () => onSendClick ? onSendClick() : router.push('/send');
  return <section id="hero" className="premium-hero" aria-labelledby="hero-title">
    <div className="hero-atmosphere" aria-hidden="true" />
    <HeroRibbon asset={asset} />
    <div className="layout hero-grid"><div className="hero-copy">
      <h1 id="hero-title">Send crypto.<br /><span>Share a link.</span></h1>
      <p>Crypto and stock tokens, sent to anyone.<br className="hidden sm:block" /> No wallet needed to receive.</p>
      <div className="hero-actions"><button className="premium-button" onClick={handleSend}>Send a Beam <ArrowUpRight size={18} /></button><a className="text-link" href="#how-it-works">See how it works <ArrowRight size={16} /></a></div>
    </div><HeroBeamDemo onAssetChange={setAsset} /></div>
    <div className="layout hero-base"><span>Built on Robinhood Chain <ArrowUpRight size={12} /></span></div>
  </section>;
}
