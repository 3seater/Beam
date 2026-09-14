'use client';

import { useRef, useState } from 'react';
import { ArrowRight, RotateCcw } from 'lucide-react';
import { BeamMark } from '@/components/BeamMark';
import './pattern-lock.css';

const labels = ['Top left', 'Top center', 'Top right', 'Middle left', 'Center', 'Middle right', 'Bottom left', 'Bottom center', 'Bottom right'];
const point = (n: number) => `${40 + n % 3 * 100},${40 + Math.floor(n / 3) * 100}`;

export default function PatternLock() {
  const [pattern, setPattern] = useState<number[]>([]);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  function choose(index: number) {
    if (busy || pattern.includes(index) || pattern.length === 4) return;
    setMessage(''); setPattern([...pattern, index]);
  }
  async function unlock() {
    if (inFlight.current || pattern.length !== 4) return;
    inFlight.current = true; setBusy(true); setMessage('');
    try {
      const response = await fetch('/api/site-access', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pattern }) });
      const body = await response.json();
      if (!response.ok) { setMessage(body.error || 'Unable to unlock. Please try again.'); setPattern([]); return; }
      // Reload the original address, preserving private claim-link fragments.
      if (window.location.pathname === '/locked') window.location.replace('/');
      else window.location.reload();
    } catch { setMessage('Connection interrupted. Please try again.'); }
    finally { inFlight.current = false; setBusy(false); }
  }
  return <main className="pattern-screen">
    <div className="pattern-orb pattern-orb-one" /><div className="pattern-orb pattern-orb-two" />
    <section className="pattern-card" aria-labelledby="pattern-title">
      <div className="pattern-brand beam-wordmark" aria-label="Beam"><BeamMark />beam</div>
      <h1 id="pattern-title">Enter password</h1>
      <div className="pattern-grid" role="group" aria-label="Select four dots in order">
        <svg viewBox="0 0 280 280" aria-hidden="true"><polyline points={pattern.map(point).join(' ')} /></svg>
        {labels.map((label, index) => <button key={label} type="button" className={`pattern-dot ${pattern.includes(index) ? 'selected' : ''}`} aria-label={label} aria-pressed={pattern.includes(index)} disabled={busy || pattern.includes(index) || pattern.length === 4} onClick={() => choose(index)}><span /></button>)}
      </div>
      <div className="pattern-status" role="status" aria-live="polite">{message || (busy ? 'Unlocking…' : '')}</div>
      <button className="pattern-unlock" disabled={busy || pattern.length !== 4} onClick={() => void unlock()}>Unlock Beam <ArrowRight size={17} /></button>
      <button className="pattern-reset" disabled={busy || !pattern.length} onClick={() => { setPattern([]); setMessage(''); }}><RotateCcw size={13} /> Start again</button>
    </section>
  </main>;
}
