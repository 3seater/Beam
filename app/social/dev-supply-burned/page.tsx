import type { Metadata } from 'next';
import { BeamMark } from '@/components/BeamMark';
import { ArrowUpRight } from 'lucide-react';
import '../docs-live/poster.css';
import './poster.css';

export const metadata: Metadata = { title: 'Beam — Dev supply burn announcement artwork', robots: { index: false, follow: false } };
// Prepared announcement artwork for use after the burn is confirmed.
export default function BurnAnnouncement({ searchParams }: { searchParams: { native?: string } }) {
  return <main className={`burn-page${searchParams.native === '1' ? ' burn-native' : ''}`}>
    <article className="burn-canvas" aria-label="Beam dev supply burned announcement">
      <div className="docs-launch-curves" aria-hidden="true"><i/><i/><i/></div>
      <div className="docs-launch-brand"><BeamMark/><span>beam</span></div>
      <svg className="burn-ribbons" viewBox="0 0 2400 960" fill="none" aria-hidden="true"><path d="M-190 1090C380 970 230 280 1130 195S2020 300 2600-60" stroke="#ffffff0f" strokeWidth="130"/><path d="M-190 1090C380 970 230 280 1130 195S2020 300 2600-60" stroke="#ffffff32" strokeWidth="2"/></svg>
      <div className="burn-emblem">
        <svg className="burn-flame" viewBox="0 0 600 700" fill="none" aria-hidden="true">
          <path d="M327 30C359 173 168 208 159 350C113 317 98 273 110 226C20 320 4 415 45 507C90 608 194 661 300 661C448 661 558 554 549 418C545 346 505 266 452 209C469 305 413 321 402 364C414 234 393 123 327 30Z" fill="url(#burn-face)" stroke="white" strokeWidth="3"/>
          <defs><linearGradient id="burn-face" x1="95" y1="95" x2="440" y2="650" gradientUnits="userSpaceOnUse"><stop stopColor="white"/><stop offset=".62" stopColor="#f2fcff"/><stop offset="1" stopColor="#c9eeff"/></linearGradient></defs>
        </svg>
        <div className="burn-coin"><BeamMark/></div>
      </div>
      <h1>Dev supply<br/>burned.</h1>
      <div className="docs-launch-addresses"><a href="https://x.com/use_beam">@use_beam</a><a href="https://usebe.am">usebe.am <ArrowUpRight size={22}/></a></div>
    </article>
  </main>;
}
