'use client';

import { ArrowUpRight, RotateCcw, ShieldCheck } from 'lucide-react';
import { AnimatedFingerprint } from './AnimatedFingerprint';
export function WhyBeamSection() {
  return <section id="why-beam" className="premium-section why-section" aria-labelledby="why-heading"><div className="layout why-grid"><div className="security-art" aria-hidden="true"><div className="security-orbit" /><div className="fingerprint-tile"><AnimatedFingerprint /></div><span className="security-tag"><ShieldCheck size={15} /> Yours until it’s theirs.</span></div><div className="why-copy"><h2 id="why-heading">Thoughtfully simple.<br /><span>Secure underneath.</span></h2><div className="feature-line"><ShieldCheck size={21} strokeWidth={1.3} /><div><h3>Protected by your link.</h3><p>Only someone with the full link can claim.</p></div></div><div className="feature-line"><RotateCcw size={21} strokeWidth={1.3} /><div><h3>Cancel before it’s claimed.</h3><p>Cancel an unclaimed Beam to recover your tokens.</p></div></div><a href="/docs" className="text-link">A closer look at the technology <ArrowUpRight size={16} /></a></div></div></section>;
}
