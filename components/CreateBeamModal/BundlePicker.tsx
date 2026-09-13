'use client';
import { useState } from 'react';
import { Search, ChevronRight } from 'lucide-react';
import { SPECTRUM_PRESETS, type SpectrumPreset } from '@/lib/spectrum';
import { BundleTokenStack } from '../SpectrumAssets';

export function BundlePicker({ onChange }: { onChange: (preset: SpectrumPreset) => void }) {
  const [query, setQuery] = useState('');
  const matches = SPECTRUM_PRESETS.filter(p => [p.name, ...p.symbols].join(' ').toLowerCase().includes(query.trim().toLowerCase()));
  return <div>
    <div className="flex items-center gap-2 mb-3"><span className="w-5 h-5 rounded-full bg-white/20 border border-white/30 flex items-center justify-center shrink-0 text-[11px]">1</span><p className="text-sm text-white/90">Choose a bundle</p></div>
    <div className="relative mb-3"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50 pointer-events-none" /><input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search bundles or tokens" aria-label="Search bundles or tokens" className="input-glass !pl-9 !py-2 !text-sm !rounded-xl w-full" /></div>
    <div className="bundle-picker-list" aria-label="Choose a bundle">
      {matches.map(p => <button key={p.id} type="button" className="token-tile rounded-xl bundle-picker-row" onClick={() => onChange(p)}>
        <span className="bundle-picker-heading"><strong>{p.name}</strong><ChevronRight size={15} /></span>
        <span className="bundle-picker-content"><BundleTokenStack tokens={p.constituents} size={30} /><span className="bundle-picker-symbols">{p.symbols.join(' · ')}</span></span>
      </button>)}
      {!matches.length && <p className="text-sm text-white/50 text-center py-8">No bundles found.</p>}
    </div>
  </div>;
}
