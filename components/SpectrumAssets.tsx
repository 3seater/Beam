'use client';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { formatUnits, parseUnits } from 'viem';
import { fetchTokenPriceUsd } from '@/lib/robinhood-prices';
import type { SpectrumConstituent, SpectrumPreset } from '@/lib/spectrum';
import { Modal } from './ui/Modal';
import { DataSkeleton } from './ui/DataSkeleton';

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
export function BundleDetails({ preset, amount, received }: { preset: SpectrumPreset; amount?: number; received?: Record<string, string> }) {
  const [open, setOpen] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [estimate, setEstimate] = useState<{ key: string; amounts?: Record<string, string>; error?: boolean } | null>(null);
  const key = `${preset.id}:${amount}:${attempt}`;
  useEffect(() => {
    if (!open || received || !amount || !Number.isFinite(amount) || amount <= 0) return;
    setEstimate(null);
    let active = true;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 50_000);
    async function load() {
      try {
        const price = await fetchTokenPriceUsd('ETH');
        if (!price) throw new Error();
        const response = await fetch('/api/spectrum/estimate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ presetId: preset.id, amountIn: parseUnits((amount! / price).toFixed(18), 18).toString() }), signal: controller.signal });
        const data = await response.json();
        if (!response.ok) throw new Error();
        if (active) setEstimate({ key, amounts: data.amounts });
      } catch { if (active) setEstimate({ key, error: true }); }
      finally { clearTimeout(timeout); }
    }
    void load();
    return () => { active = false; controller.abort(); clearTimeout(timeout); };
  }, [open, received, amount, preset.id, key]);
  const quantities = received ?? (estimate?.key === key ? estimate.amounts : undefined);
  const failed = !received && estimate?.key === key && estimate.error;
  return <><button type="button" className="bundle-details-link" onClick={() => setOpen(true)}>View {preset.constituents.length} assets & allocations</button>
    <Modal isOpen={open} onClose={() => setOpen(false)} title={preset.name} className="bundle-details-modal">
      <p className="bundle-details-description">{preset.description}</p>
      <div className="bundle-quantity-heading"><span>Asset</span><span>{received ? 'Tokens received' : 'Estimated tokens'}</span></div>
      <div className="bundle-allocation">{preset.constituents.map(token => {
        const raw = quantities?.[token.address.toLowerCase()];
        return <div className="bundle-allocation-row" key={token.address}><BundleTokenImage token={token} size={36} />
          <span className="bundle-allocation-token"><strong>{token.symbol}</strong><span>{token.name.replace(' • Robinhood Token', '')}</span></span>
          <span className="bundle-allocation-value">{!raw && !failed && amount ? <DataSkeleton className="w-24 h-5" label={`Loading ${token.symbol} quantity`} /> : <strong>{raw ? `${received ? '' : '≈ '}${Number(formatUnits(BigInt(raw), token.decimals)).toLocaleString('en-US', { maximumSignificantDigits: 6 })}` : failed ? 'Unavailable' : 'Set an amount'}</strong>}<span>{Math.round(token.weight * 100)}%{amount && amount > 0 ? ` · $${(amount * token.weight).toFixed(2)}` : ''}</span></span>
        </div>;
      })}</div>
      {failed && <button className="bundle-details-link" onClick={() => setAttempt(n => n + 1)}>Retry token estimates</button>}
      <p className="bundle-details-note">{received ? 'These token amounts are held in your Beam for the recipient.' : 'Estimates use live Enso routes. Final quantities may change with prices and slippage.'}</p>
    </Modal>
  </>;
}
