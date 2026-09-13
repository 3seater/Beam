import type { Metadata } from 'next';
import Image from 'next/image';
import type { CSSProperties } from 'react';
import '../docs-live/poster.css';
import './poster.css';

export const metadata: Metadata = {
  title: 'Beam — Token collection',
  robots: { index: false, follow: false },
};

const tokens = [
  { name: 'Microsoft', file: 'msft', x: 100, y: 150, size: 190, angle: 12, tint: '#00a4ef12' },
  { name: 'NVIDIA', file: 'nvda', x: 395, y: 82, size: 300, angle: -10, tint: '#76b90020' },
  { name: 'CASHCAT', file: 'cashcat', x: 704, y: 350, size: 332, angle: 9, tint: '#c2a68118' },
  { name: 'AMC', file: 'meme', x: 1116, y: 120, size: 288, angle: 13, tint: '#e0113310' },
  { name: 'AI', file: 'ai', x: 315, y: 558, size: 220, angle: -12, tint: '#a6afdd20' },
  { name: 'Tesla', file: 'tsla', x: 1114, y: 627, size: 160, angle: -10, tint: '#e8212712' },
  { name: 'Amazon', file: 'amzn', x: 1357, y: 465, size: 164, angle: 10, tint: '#ff990018' },
];

export default function TokenCollectionGraphic() {
  return <main className="docs-launch-page">
    <article className="docs-launch-canvas token-collection-canvas" aria-label="Beam token collection: CASHCAT, AMC, NVIDIA, Microsoft, Tesla, AI and Amazon">
      <div className="docs-launch-curves" aria-hidden="true"><i /><i /><i /></div>
      <div className="token-collection-light" aria-hidden="true" />
      {tokens.map(token => <div key={token.file} className={`token-collection-tile token-collection-${token.file}`} style={{ left: token.x, top: token.y, width: token.size, height: token.size, transform: `rotate(${token.angle}deg)`, '--tile-tint': token.tint } as CSSProperties}>
        <span className="token-collection-rim" aria-hidden="true" />
        <Image src={`/social/tokens/${token.file}.png`} alt={`${token.name} logo`} width={220} height={220} unoptimized priority />
      </div>)}
    </article>
  </main>;
}
