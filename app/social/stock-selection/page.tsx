import type { Metadata } from 'next';
import { BeamMark } from '@/components/BeamMark';
import { ArrowUpRight } from 'lucide-react';
import presets from '@/lib/crate-bundles.json';
import communityTokens from '@/lib/community-tokens.json';
import '../docs-live/poster.css';
import './poster.css';

export const metadata: Metadata = {
  title: 'Beam — Stocks and crypto',
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
const cryptoAssets = [...communityTokens, ...new Map(presets.slice(0, 2).flatMap(p => p.constituents).map(t => [t.symbol, t])).values()];
const cryptoSlots = [1, 9, 16, 22, 25, 3, 11, 19, 26, 36];
const assets = stocks.map((symbol, index) => {
  const crypto = cryptoAssets[cryptoSlots.indexOf(index)];
  return crypto ?? { symbol, logoUrl: `/social/stocks/${symbol.toLowerCase()}.png` };
});

const positions = Array.from({ length: 60 }, (_, index) => ({
  row: Math.floor(index / 10), column: index % 10,
})).filter(({ row, column }) => !(row === 0 && column < 2) && !(row === 5 && column < 3));

export default function StockSelection({ searchParams }: { searchParams: { native?: string } }) {
  return <main className={`stock-selection-page${searchParams.native === '1' ? ' stock-native' : ''}`}>
    <article className="stock-selection-canvas" aria-label="Beam asset selection — stocks and crypto">
      <div className="docs-launch-curves" aria-hidden="true"><i/><i/><i/></div>
      <div className="docs-launch-brand"><BeamMark/><span>beam</span></div>
      <div className="stock-selection-grid">
        {positions.map(({ row, column }, index) => {
          const asset = assets[index % assets.length];
          const wave = Math.sin(column * 0.8 + row * 0.55);
          const distant = index % 11 === 7 || index % 13 === 9;
          const near = index % 17 === 12;
          const aboveSocials = row === 4 && column < 3;
          return <div className="stock-selection-tile" key={index} style={{
            left: -16 + column * 199 + Math.sin(row * 1.4) * 22 + Math.sin(index * 2.4) * 12,
            top: -22 + row * 199 + wave * 26 - (aboveSocials ? 65 : 0),
            transform: `rotate(${Math.cos(column * 0.8 + row * 0.55) * 9 + Math.sin(index * 1.7) * 7}deg) scale(${aboveSocials ? 0.84 : distant ? 0.84 : near ? 1.22 : 1.02 + Math.sin(index * 2.1) * 0.09})`,
            filter: distant ? 'blur(3px)' : near ? 'blur(1.4px)' : undefined,
            opacity: distant ? 0.72 : 1,
            zIndex: near ? 3 : distant ? 0 : 1,
          }}>
          <img src={asset.logoUrl} alt={`${asset.symbol} logo`} width={104} height={104}/>
        </div>; })}
      </div>
      <div className="docs-launch-addresses">
        <a href="https://x.com/use_beam">@use_beam</a>
        <a href="https://usebe.am">usebe.am <ArrowUpRight size={22}/></a>
      </div>
    </article>
  </main>;
}
