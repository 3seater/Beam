import type { Metadata } from 'next';
import './poster.css';

export const metadata: Metadata = { title: 'Beam — Asset orbits', robots: { index: false, follow: false } };
const rings = [
  { radius: 820, tokens: ['aapl', 'amzn', 'nvda', 'ai', 'tsla'], angles: [166, 133, 97, 61, 23] },
  { radius: 590, tokens: ['msft', 'cashcat', 'amd', 'coin'], angles: [155, 113, 70, 27] },
  { radius: 360, tokens: ['adbe', 'crm', 'avgo'], angles: [153, 94, 30] },
];

export default function AssetOrbits({ searchParams }: { searchParams: { native?: string } }) {
  return <main className={`asset-orbits-page${searchParams.native === '1' ? ' orbit-native' : ''}`}>
    <article className="asset-orbits-canvas" aria-label="Stock and crypto logos along three blue orbital arcs">
      <div className="orbit-background-bands" aria-hidden="true"><i/><i/><i/></div>
      <svg className="asset-orbits-lines" viewBox="0 0 1920 1080" fill="none" aria-hidden="true">
        <defs><linearGradient id="orbit-blue" x1="120" y1="900" x2="1740" y2="200" gradientUnits="userSpaceOnUse"><stop stopColor="#d4f7ff" stopOpacity=".3"/><stop offset=".5" stopColor="#fff"/><stop offset="1" stopColor="#effcff" stopOpacity=".7"/></linearGradient></defs>
        {rings.map(ring => <path key={`band-${ring.radius}`} d={`M ${960-ring.radius} 990 A ${ring.radius} ${ring.radius} 0 0 1 ${960+ring.radius} 990`} stroke="#ffffff0c" strokeWidth="48"/>)}
        {rings.map(ring => <path key={ring.radius} d={`M ${960-ring.radius} 990 A ${ring.radius} ${ring.radius} 0 0 1 ${960+ring.radius} 990`} stroke="url(#orbit-blue)" strokeWidth="2"/>)}
      </svg>
      {rings.flatMap((ring, row) => ring.tokens.map((token, index) => {
        const angle = ring.angles[index] * Math.PI / 180;
        const size = row === 0 ? 260 : row === 1 ? 238 : 214;
        const tilt = [-13, 10, -9, 14, -12][(index + row) % 5];
        return <div className={`asset-orbit-node asset-orbit-${token}`} key={`${row}-${index}`} style={{left:960+ring.radius*Math.cos(angle)-size/2,top:990-ring.radius*Math.sin(angle)-size/2,width:size,height:size,transform:`rotate(${tilt}deg)`}}>
          <img src={`/social/hires/${token}.png`} alt={`${token.toUpperCase()} logo`} width={170} height={170}/>
        </div>;
      }))}
      <div className="asset-orbits-fade" aria-hidden="true"/>
    </article>
  </main>;
}
