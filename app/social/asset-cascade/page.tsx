import type { Metadata } from 'next';
import './poster.css';

export const metadata: Metadata = { title: 'Beam — Asset cascade', robots: { index: false, follow: false } };
const tiles = [
  ['aapl',-90,110,310,-12],['adbe',200,-115,285,10],['msft',310,285,365,-10],
  ['coin',70,695,285,12],['amzn',635,55,330,12],['ai',732,540,320,-12],
  ['nvda',1060,255,440,-9],['crm',1045,-190,285,9],['cashcat',1530,35,335,12],
  ['amd',1515,620,340,10],['tsla',1885,285,360,-12],['pons',2220,40,285,11],
  ['avgo',2220,735,300,-9],
] as const;
export default function AssetCascade({searchParams}:{searchParams:{native?:string}}) {
  return <main className={`asset-cascade-page${searchParams.native === '1' ? ' cascade-native' : ''}`}><article className="asset-cascade-canvas" aria-label="A cascading arrangement of stock and crypto logos">
    <svg className="cascade-ribbons" viewBox="0 0 2400 960" fill="none" aria-hidden="true"><path d="M-300 1130 890-210M270 1270 1460-70M990 1300 2180-40M1730 1250 2920-90" stroke="#ffffff12" strokeWidth="210"/><path d="M-300 1130 890-210M270 1270 1460-70M990 1300 2180-40M1730 1250 2920-90" stroke="#ffffff28" strokeWidth="2"/></svg>
    {tiles.map(([symbol,x,y,size,angle])=><div key={symbol} className={`cascade-tile cascade-${symbol}`} style={{left:x,top:y,width:size,height:size,transform:`rotate(${angle}deg)`}}><div className="cascade-inner"><img src={`/social/hires/${symbol}.png`} alt={`${symbol.toUpperCase()} logo`} width={250} height={250}/></div></div>)}
  </article></main>;
}
