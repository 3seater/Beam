'use client';

import { BeamMark } from '@/components/BeamMark';
import { ArrowRight, ArrowUpRight, Link2, Check } from 'lucide-react';
import './poster.css';

export default function SendByLink({ searchParams }: { searchParams: { native?: string } }) {
  return <main className={`send-cover-page${searchParams.native === '1' ? ' send-cover-native' : ''}`}><article className="send-cover" aria-label="Beam: send stocks and crypto by link">
    <div className="send-cover-brand"><BeamMark/><span>beam</span></div>
    <h1>Send it by link.</h1>
    <svg className="send-cover-path" viewBox="0 0 2400 960" fill="none" aria-hidden="true"><path d="M -100 780 C 280 780 240 450 580 450 L 1900 450 C 2120 450 2130 170 2510 170" stroke="#ffffff25" strokeWidth="110"/><path d="M -100 780 C 280 780 240 450 580 450 L 1900 450 C 2120 450 2130 170 2510 170" stroke="#ffffff85" strokeWidth="2"/></svg>
    <div className="send-cover-assets"><div className="send-cover-asset back"><img src="/social/hires/ai.png" alt="AI logo"/></div><div className="send-cover-asset middle"><img src="/social/hires/msft.png" alt="Microsoft logo"/></div><div className="send-cover-asset front"><img src="/social/hires/nvda.png" alt="NVIDIA logo"/></div></div>
    <ArrowRight className="send-cover-arrow first" size={60} strokeWidth={1.3}/>
    <div className="send-cover-card"><div className="send-cover-card-header"><BeamMark/><span>Your Beam</span><ArrowUpRight size={28}/></div><div className="send-cover-value">$100</div><div className="send-cover-token"><img src="/social/hires/nvda.png" alt="NVIDIA logo"/><span>NVDA</span></div><div className="send-cover-link"><Link2 size={30}/><span>usebe.am/claim</span><ArrowUpRight size={26}/></div></div>
    <ArrowRight className="send-cover-arrow second" size={60} strokeWidth={1.3}/>
    <div className="send-cover-received"><div className="send-cover-recipient"><svg viewBox="0 0 100 100" fill="none" aria-label="Recipient"><circle cx="50" cy="33" r="17" fill="#77bedf"/><path d="M19 84c0-21 12-32 31-32s31 11 31 32" fill="#77bedf"/></svg></div><div className="send-cover-notice"><img src="/social/hires/nvda.png" alt="NVIDIA logo"/><span>NVDA received.</span><span className="send-cover-check"><Check size={25}/></span></div></div>
    <div className="send-cover-foot">Stocks + crypto</div>
  </article></main>;
}
