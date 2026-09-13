import type { Metadata } from 'next';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { BeamMark } from '@/components/BeamMark';
import { ArrowUpRight } from 'lucide-react';
import '../docs-live/poster.css';
import './poster.css';

export const metadata: Metadata = {
  title: 'Beam — DEX is paid',
  robots: { index: false, follow: false },
};

export default function DexPaidGraphic() {
  // Inline the locally saved official path so the logo stays vector in Figma.
  const source = readFileSync(join(process.cwd(), 'public/brand-icons/dexscreener.svg'), 'utf8');
  const path = source.match(/\sd="([^"]+)"/)?.[1];
  if (!path) throw new Error('Dexscreener SVG path is missing');

  return <main className="docs-launch-page">
    <article className="docs-launch-canvas dex-paid-canvas" aria-label="Beam — DEX is paid announcement">
      <div className="docs-launch-curves" aria-hidden="true"><i /><i /><i /></div>
      <div className="docs-launch-brand"><BeamMark /><span>beam</span></div>
      <div className="docs-launch-heading"><h1>DEX<br />is paid.</h1></div>
      <div className="docs-launch-addresses">
        <a href="https://x.com/use_beam">@use_beam</a>
        <a href="https://usebe.am">usebe.am <ArrowUpRight size={22} /></a>
      </div>
      <div className="dex-paid-halo" aria-hidden="true" />
      <div className="dex-paid-glass">
        <div className="dex-paid-glass-rim" aria-hidden="true" />
        <svg className="dex-paid-logo" viewBox="0 0 24 24" role="img" aria-label="DEX Screener logo">
          <defs>
            <linearGradient id="dex-logo-face" x1="3" y1="1" x2="20" y2="24" gradientUnits="userSpaceOnUse">
              <stop stopColor="#61c6f4" /><stop offset=".42" stopColor="#38a0e1" /><stop offset="1" stopColor="#236d9d" />
            </linearGradient>
          </defs>
          <path d={path} fill="url(#dex-logo-face)" fillRule="evenodd" clipRule="evenodd" />
        </svg>
      </div>
    </article>
  </main>;
}
