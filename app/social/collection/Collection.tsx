'use client';

import { BeamMark } from '@/components/BeamMark';
import { BeamGiftCard } from '@/components/BeamGiftCard';
import { ArrowUpRight, ArrowRight, ArrowLeftRight, Link2, Check } from 'lucide-react';
import type { CSSProperties, ReactNode } from 'react';
import presets from '@/lib/crate-bundles.json';

const memes = presets[0].constituents;
function Logo({ symbol, size = 100 }: { symbol: string; size?: number }) {
  const asset = memes.find(t => t.symbol === symbol);
  return <img src={asset?.logoUrl ?? `/social/tokens/${symbol.toLowerCase()}.png`} alt={`${symbol} logo`} width={size} height={size} />;
}
function Tile({ symbol, x, y, size = 210, rotate = 0 }: { symbol: string; x: number; y: number; size?: number; rotate?: number }) {
  return <div className="art-tile" style={{ left:x, top:y, width:size, height:size, transform:`rotate(${rotate}deg)` }}><Logo symbol={symbol} size={size * .48} /></div>;
}
function Board({ id, title, children, className = '' }: { id: string; title: string; children: ReactNode; className?: string }) {
  return <section className="art-section" id={id}><div className="art-caption">{id} / {title}<span>1920 × 1080</span></div><article className={`beam-artboard ${className}`} aria-label={title}>
    <div className="art-curves"><i/><i/><i/></div>
    <div className="art-brand"><BeamMark/><span>beam</span></div>
    <h2>{title}</h2>{children}
    <footer><a href="https://x.com/use_beam">@use_beam</a><a href="https://usebe.am">usebe.am <ArrowUpRight size={22}/></a></footer>
  </article></section>;
}
function LinkPill({ style }: { style?: CSSProperties }) { return <div className="art-link" style={style}><Link2 size={34}/><span>usebe.am/claim</span><ArrowUpRight size={30}/></div>; }
export function Collection({ native = false }: { native?: boolean }) {
  return <main className={`art-collection${native ? ' art-native' : ''}`}><header className="collection-header"><div><strong>beam / artwork collection</strong><p>Five editable artboards. Each frame is 1920 × 1080.</p></div><a href={native ? '?' : '?native=1'}>{native ? 'Fit to screen' : 'Native size ↗'}</a></header>
    <Board id="01" title="Pick your asset." className="asset-board">
      <div className="asset-orbit orbit-one"/><div className="asset-orbit orbit-two"/>
      <Tile symbol="NVDA" x={814} y={253} size={310} rotate={-12}/><Tile symbol="MSFT" x={1240} y={150} size={225} rotate={10}/>
      <Tile symbol="TSLA" x={1530} y={386} size={280} rotate={17}/><Tile symbol="CASHCAT" x={1185} y={575} size={315} rotate={-8}/>
      <Tile symbol="PONS" x={750} y={697} size={185} rotate={8}/><Tile symbol="AMZN" x={1590} y={800} size={180} rotate={-12}/>
      <span className="art-small asset-note">Stocks + crypto</span>
    </Board>
    <Board id="02" title="Send a Beam." className="send-board">
      <svg className="art-lines" viewBox="0 0 1920 1080"><path d="M 330 850 C 500 450 1000 350 1630 600"/></svg>
      <div className="real-beam-card"><BeamGiftCard amount="$100" symbol="NVDA" logoUrl="/social/tokens/nvda.png"/></div>
      <LinkPill style={{left:1080,top:720,transform:'rotate(5deg)'}}/>
      <div className="send-token"><Logo symbol="NVDA" size={120}/></div><div className="flow-arrow"><ArrowUpRight size={65} strokeWidth={1.2}/></div>
    </Board>
    <Board id="03" title="Meet Spectrum." className="spectrum-board">
      <svg className="art-lines spectrum-lines" viewBox="0 0 1920 1080"><path d="M 520 370 C 900 370 750 610 1110 610 M 520 610 L 1110 610 M 520 850 C 900 850 750 610 1110 610 M 1320 610 L 1780 610"/></svg>
      {memes.map((t,i)=><div className="spectrum-source" key={t.symbol} style={{top:340+i*195}}><Logo symbol={t.symbol} size={90}/><span>{t.symbol}</span></div>)}
      <div className="spectrum-glass"><div className="spectrum-stack">{memes.map(t=><Logo key={t.symbol} symbol={t.symbol} size={116}/>)}</div><strong>Blue Chips</strong><span>Spectrum</span><div className="spectrum-bars"><i/><i/><i/></div></div>
      <div className="spectrum-link"><Link2 size={68} strokeWidth={1.3}/></div><span className="spectrum-caption">Several assets. One link.</span>
    </Board>
    <Board id="04" title="Swap. Then send." className="swap-board">
      <div className="swap-track"><svg viewBox="0 0 1560 480"><path d="M 190 240 C 480 -20 880 -20 1230 240"/><path d="M 1230 240 C 880 500 480 500 190 240"/></svg></div>
      <div className="swap-input"><span>You pay</span><svg width="96" height="148" viewBox="0 0 32 48" aria-label="Ethereum"><path fill="#7186bd" d="M16 0 0 25l16 9 16-9Z"/><path fill="#a8b9e1" d="m16 0 0 34 16-9Z"/><path fill="#7186bd" d="M0 29 16 48 32 29 16 38Z"/></svg><strong>ETH</strong></div>
      <div className="swap-hub"><ArrowLeftRight size={75} strokeWidth={1.2}/></div>
      <div className="swap-output"><Logo symbol="NVDA" size={132}/><strong>NVDA</strong></div>
      <LinkPill style={{left:1165,top:793}}/>
      <span className="swap-step">Swap <ArrowRight size={22}/> Create Beam <ArrowRight size={22}/> Share</span>
    </Board>
    <Board id="05" title="Claim. It’s yours." className="claim-board">
      <div className="claim-rings"><i/><i/><i/></div>
      <LinkPill style={{left:185,top:513,transform:'rotate(-6deg)'}}/>
      <div className="claim-arrow"><ArrowRight size={88} strokeWidth={1}/></div>
      <div className="claim-token"><Logo symbol="CASHCAT" size={190}/><div className="claim-check"><Check size={54}/></div></div>
      <div className="claim-notice"><Logo symbol="CASHCAT" size={46}/><span>CASHCAT received.</span><ArrowUpRight size={30}/></div>
      <span className="claim-caption">Open the link. Sign in. Claim.</span>
    </Board>
  </main>;
}
