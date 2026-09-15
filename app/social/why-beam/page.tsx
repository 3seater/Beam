import type { Metadata } from 'next';
import { BeamMark } from '@/components/BeamMark';
import { BeamGiftCard } from '@/components/BeamGiftCard';
import { stockLogoUrl } from '@/lib/robinhood-tokens';
import { ArrowUpRight, Link2 } from 'lucide-react';
import '../docs-live/poster.css';
import './poster.css';

export const metadata: Metadata = { title: 'Why we made Beam', robots: { index: false, follow: false } };

export default function WhyBeam({ searchParams }: { searchParams: { native?: string } }) {
  return <main className={`why-beam-page${searchParams.native === '1' ? ' why-native' : ''}`}>
    <article className="why-beam-canvas" aria-label="Why we made Beam: stocks and crypto, simply sent">
      <div className="docs-launch-curves" aria-hidden="true"><i/><i/><i/></div>
      <div className="docs-launch-brand"><BeamMark/><span>beam</span></div>
      <div className="why-heading"><p>WHY WE MADE BEAM</p><h1>Sending should<br/>feel this simple.</h1></div>
      <svg className="why-connection" viewBox="0 0 1600 900" aria-hidden="true"><path d="M450 660 C650 820 950 450 1150 660"/></svg>
      <div className="why-card why-stock"><div className="beam-receipt"><BeamGiftCard amount="$10.00" symbol="NVDA" logoUrl={stockLogoUrl('NVDA')} /></div></div>
      <div className="why-link" aria-label="One link"><Link2 size={52} strokeWidth={1.5}/></div>
      <div className="why-card why-crypto"><div className="beam-receipt"><BeamGiftCard amount="$10.00" symbol="ETH" /></div></div>
      <div className="docs-launch-addresses"><a href="https://x.com/use_beam">@use_beam</a><a href="https://usebe.am">usebe.am <ArrowUpRight size={22}/></a></div>
    </article>
  </main>;
}
