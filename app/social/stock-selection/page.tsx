import type { Metadata } from 'next';
import { BeamMark } from '@/components/BeamMark';
import { ArrowUpRight } from 'lucide-react';
import presets from '@/lib/crate-bundles.json';
import '../docs-live/poster.css';
import './poster.css';

export const metadata: Metadata = {
  title: 'Beam — Stocks. Crypto. Your pick.',
  robots: { index: false, follow: false },
};

// Stock tickers visible in Beam's picker in the supplied reference, plus
// NVDA, MSFT, and TSLA from the site's canonical starter assets.
const stocks = [
  'AAPL', 'NVDA', 'MSFT', 'AMZN', 'AMD', 'ADBE', 'COIN',
  'CRM', 'BABA', 'ASML', 'AVGO', 'BA', 'DDOG', 'DOCN',
  'AMAT', 'CRWV', 'CLSK', 'APP', 'CVNA', 'ASTS', 'AXON',
  'AAOI', 'ABCL', 'AEHR', 'AEIS', 'ALAB', 'AMBA', 'AMC',
  'AMKR', 'ANET', 'APLD', 'TSLA', 'AVAV', 'AXTI', 'BB',
  'CBRS', 'CCL', 'CEG', 'CIEN', 'CLOV', 'CLS', 'CTSH',
];

// Mix the real Blue Chips and AI & Infra assets into the stock selection.
const cryptoAssets = [...new Map(presets.slice(0, 2).flatMap(p => p.constituents).map(t => [t.symbol, t])).values()];
const cryptoSlots = [3, 11, 19, 26, 36];
const assets = stocks.map((symbol, index) => {
  const crypto = cryptoAssets[cryptoSlots.indexOf(index)];
  return crypto ?? { symbol, logoUrl: `/social/stocks/${symbol.toLowerCase()}.png` };
});

export default function StockSelection({ searchParams }: { searchParams: { native?: string } }) {
  return <main className={`stock-selection-page${searchParams.native === '1' ? ' stock-native' : ''}`}>
    <article className="stock-selection-canvas" aria-label="Beam asset selection — stocks and crypto">
      <div className="docs-launch-curves" aria-hidden="true"><i/><i/><i/></div>
      <div className="docs-launch-brand"><BeamMark/><span>beam</span></div>
      <h1>Stocks.<br/>Crypto.<br/>Your pick.</h1>
      <p>Pick an asset. Send a link.</p>
      <div className="stock-selection-grid">
        {assets.map(asset => <div className="stock-selection-tile" key={asset.symbol}>
          <img src={asset.logoUrl} alt={`${asset.symbol} logo`} width={76} height={76}/>
          <span>{asset.symbol}</span>
        </div>)}
      </div>
      <div className="docs-launch-addresses">
        <a href="https://x.com/use_beam">@use_beam</a>
        <a href="https://usebe.am">usebe.am <ArrowUpRight size={22}/></a>
      </div>
    </article>
  </main>;
}
