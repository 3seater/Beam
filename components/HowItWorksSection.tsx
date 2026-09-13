'use client';

import { ArrowUpRight, Link2 } from 'lucide-react';
import { LandingTokenLogo } from './LandingTokenLogo';
export function HowItWorksSection() {
  return <section id="how-it-works" className="premium-section how-section" aria-labelledby="hiw-heading"><div className="layout"><div className="section-heading"><div><h2 id="hiw-heading">Pick an asset.<br /><span>Send a link.</span></h2></div></div><ol className="steps-grid">
    <li className="step-card"><div className="step-art token-art" aria-hidden="true"><span className="token-disc token-eth"><LandingTokenLogo symbol="AI" size={40} /></span><span className="token-disc token-nvda"><LandingTokenLogo symbol="NVDA" size={40} /></span><span className="token-disc token-aapl"><LandingTokenLogo symbol="MSFT" size={40} /></span><div className="mini-amount">$100<span>Choose your amount</span></div></div><div className="step-copy"><span className="step-number">01</span><h3>Choose your asset.</h3><p>Pick stocks or crypto and choose an amount.</p></div></li>
    <li className="step-card"><div className="step-art share-art" aria-hidden="true"><div className="share-bubble"><LandingTokenLogo symbol="NVDA" size={22} /> $100 of NVDA <span>↗</span></div><div className="share-link"><Link2 size={18} /> usebe.am/claim<span>↗</span></div><div className="share-apps"><span>Messages</span><span>WhatsApp</span><span>Anywhere</span></div></div><div className="step-copy"><span className="step-number">02</span><h3>Share your link.</h3><p>Share the link in any conversation.</p></div></li>
    <li className="step-card"><div className="step-art receive-art" aria-hidden="true"><div className="receive-mark"><LandingTokenLogo symbol="NVDA" size={56} /></div><div className="receive-notice"><LandingTokenLogo symbol="NVDA" size={28} />NVDA received.<ArrowUpRight size={18} /></div></div><div className="step-copy"><span className="step-number">03</span><h3>Sign in. Claim. It’s yours.</h3><p>They sign in and claim. No existing wallet needed.</p></div></li>
  </ol></div></section>;
}
