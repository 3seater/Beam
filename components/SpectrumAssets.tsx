'use client';
import Image from 'next/image';
import { useState } from 'react';
import type { SpectrumConstituent, SpectrumPreset } from '@/lib/spectrum';
import { Modal } from './ui/Modal';

export function BundleTokenImage({ token, size = 32 }: { token: Pick<SpectrumConstituent, 'symbol' | 'logoUrl'>; size?: number }) {
  return <Image src={token.logoUrl} alt={`${token.symbol} logo`} width={size} height={size} unoptimized className="bundle-token-image" style={{ width: size, height: size }} />;
}
export function BundleTokenStack({ tokens, size = 32 }: { tokens: readonly Pick<SpectrumConstituent, 'symbol' | 'logoUrl'>[]; size?: number }) {
  return <span className="bundle-token-stack">{tokens.map(token => <BundleTokenImage key={token.symbol} token={token} size={size} />)}</span>;
}
export function BundleAllocation({ preset, amount }: { preset: SpectrumPreset; amount?: number }) {
  return <div className="bundle-allocation">{preset.constituents.map(token => <div className="bundle-allocation-row" key={token.address}>
    <BundleTokenImage token={token} /><span className="bundle-allocation-token"><strong>{token.symbol}</strong><span>{token.name.replace(' • Robinhood Token', '')}</span></span>
    <span className="bundle-allocation-value"><strong>{Math.round(token.weight * 100)}%</strong>{amount !== undefined && amount > 0 && <span>${(amount * token.weight).toFixed(2)}</span>}</span>
  </div>)}</div>;
}
export function BundleDetails({ preset, amount }: { preset: SpectrumPreset; amount?: number }) {
  const [open, setOpen] = useState(false);
  return <><button type="button" className="bundle-details-link" onClick={() => setOpen(true)}>View {preset.constituents.length} assets & allocations</button>
    <Modal isOpen={open} onClose={() => setOpen(false)} title={preset.name}><p className="text-sm text-white/60 mb-5">{preset.description}</p><BundleAllocation preset={preset} amount={amount} /><p className="text-xs text-white/50 mt-4">Percentages split your spending amount. Token quantities depend on the final swap rates.</p></Modal>
  </>;
}
