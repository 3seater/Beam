import type { Metadata } from 'next';

import type { CSSProperties } from 'react';
import './poster.css';

export const metadata: Metadata = { title: 'Beam — Asset stream artwork', robots: { index: false, follow: false } };

const stock = (symbol: string) => `/social/hires/${symbol.toLowerCase()}.png`;
const tokens = [
  { name: 'Apple', src: stock('AAPL'), x: -200, y: 417, size: 375, angle: -18 },
  { name: 'PONS', src: '/social/hires/pons.png', x: 112, y: 256, size: 390, angle: 12 },
  { name: 'NVIDIA', src: stock('NVDA'), x: 432, y: 352, size: 425, angle: -13 },
  { name: 'CASHCAT', src: '/social/hires/cashcat.png', x: 784, y: 241, size: 455, angle: 10 },
  { name: 'Microsoft', src: stock('MSFT'), x: 1161, y: 352, size: 398, angle: -12 },
  { name: 'AI', src: '/social/hires/ai.png', x: 1488, y: 235, size: 410, angle: 14 },
  { name: 'Tesla', src: stock('TSLA'), x: 1830, y: 385, size: 370, angle: -14 },
];

export default function AssetStream({ searchParams }: { searchParams: { native?: string } }) {
  return <main className={`asset-stream-page${searchParams.native === '1' ? ' asset-stream-native' : ''}`}>
    <article className="asset-stream-canvas" aria-label="Stocks and crypto flowing side to side through Beam">
      <div className="asset-stream-curves" aria-hidden="true"><i/><i/><i/></div>
      <svg className="asset-stream-ribbon" viewBox="0 0 1920 1080" fill="none" aria-hidden="true">
        <path d="M-300 800C180 800 160 280 650 485S1200 735 1520 455 2010 345 2240 620" stroke="#ffffff16" strokeWidth="160"/>
        <path d="M-300 800C180 800 160 280 650 485S1200 735 1520 455 2010 345 2240 620" stroke="#ffffff50" strokeWidth="2"/>
      </svg>
      {tokens.map((token, index) => <div className="asset-stream-tile" key={token.name} style={{left:token.x,top:token.y,width:token.size,height:token.size,transform:`rotate(${token.angle}deg)`,zIndex:index+1} as CSSProperties}>
        <div className="asset-stream-inner"><img src={token.src} alt={`${token.name} logo`} width={240} height={240}/></div>
      </div>)}
    </article>
  </main>;
}
