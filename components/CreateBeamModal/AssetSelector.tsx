'use client';

import { useState, useMemo } from 'react';
import { Search, Check } from 'lucide-react';

/* ── Types ───────────────────────────────────────────────────────────────── */
export type NativeAsset = { type: 'native'; symbol: 'ETH' };
export type ERC20Asset = { type: 'erc20'; address: `0x${string}`; symbol: string };
export type SelectedAsset = NativeAsset | ERC20Asset;

export interface TokenEntry {
  address: `0x${string}`;
  symbol: string;
  decimals: number;
  name: string;
}

interface AssetSelectorProps {
  value: SelectedAsset;
  onChange: (asset: SelectedAsset) => void;
  tokens?: TokenEntry[];
  disabled?: boolean;
}

/* ── Preloaded popular Robinhood Chain tokens ────────────────────────────── */
// NOTE: This component (AssetSelector) is legacy/unused — the active token
// picker is components/CreateBeamModal/TokenPicker.tsx which pulls real
// addresses from lib/robinhood-tokens.ts. Keeping the structure here but
// addresses are updated to match the real on-chain contracts (chainId 4663).
export const POPULAR_TOKENS: TokenEntry[] = [
  { symbol: 'NVDA', name: 'NVIDIA', address: '0xd0601CE157Db5bdC3162BbaC2a2C8aF5320D9EEC', decimals: 18 },
  { symbol: 'AAPL', name: 'Apple', address: '0xaF3D76f1834A1d425780943C99Ea8A608f8a93f9', decimals: 18 },
  { symbol: 'TSLA', name: 'Tesla', address: '0x322F0929c4625eD5bAd873c95208D54E1c003b2d', decimals: 18 },
  { symbol: 'MSFT', name: 'Microsoft', address: '0xe93237C50D904957Cf27E7B1133b510C669c2e74', decimals: 18 },
  { symbol: 'META', name: 'Meta Platforms', address: '0xc0D6457C16Cc70d6790Dd43521C899C87ce02f35', decimals: 18 },
  { symbol: 'GOOGL', name: 'Alphabet', address: '0x2e0847E8910a9732eB3fb1bb4b70a580ADAD4FE3', decimals: 18 },
  { symbol: 'AMZN', name: 'Amazon', address: '0x12f190a9F9d7D37a250758b26824B97CE941bF54', decimals: 18 },
  { symbol: 'SPCX', name: 'SpaceX', address: '0x4a0E65A3EcceC6dBe60AE065F2e7bb85Fae35eEa', decimals: 18 },
  { symbol: 'MU', name: 'Micron Technology', address: '0xfF080c8ce2E5feadaCa0Da81314Ae59D232d4afD', decimals: 18 },
  { symbol: 'USDG', name: 'Global Dollar', address: '0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168', decimals: 18 },
];

/* Asset initials — ticker abbreviation for the icon tile */
function assetInitials(symbol: string): string {
  return symbol.slice(0, 2).toUpperCase();
}

/* ── Tile ─────────────────────────────────────────────────────────────────── */
function AssetTile({
  symbol,
  name,
  selected,
  onSelect,
}: {
  symbol: string;
  name: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={['token-tile relative', selected ? 'selected' : ''].join(' ')}
      aria-pressed={selected}
      aria-label={`${name} (${symbol})`}
    >
      {selected && (
        <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-white/70 flex items-center justify-center">
          <Check size={10} className="text-sky-mid" strokeWidth={3} aria-hidden="true" />
        </span>
      )}
      <span
        className="text-[11px] font-bold text-white/80 tracking-wide leading-none"
        aria-hidden="true"
      >
        {assetInitials(symbol)}
      </span>
      <span className="text-[11px] font-bold text-white tracking-wide">{symbol}</span>
    </button>
  );
}

/* ── Component ───────────────────────────────────────────────────────────── */
export function AssetSelector({ value, onChange, tokens = [], disabled = false }: AssetSelectorProps) {
  const [query, setQuery] = useState('');

  /* Merge popular + wallet tokens, deduplicate by address */
  const allTokens = useMemo(() => {
    const seen = new Set<string>();
    const merged: TokenEntry[] = [];
    for (const t of [...POPULAR_TOKENS, ...tokens]) {
      const key = t.address.toLowerCase();
      if (!seen.has(key)) { seen.add(key); merged.push(t); }
    }
    return merged;
  }, [tokens]);

  /* Filter by search */
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allTokens;
    return allTokens.filter(
      (t) => t.symbol.toLowerCase().includes(q) || t.name.toLowerCase().includes(q),
    );
  }, [allTokens, query]);

  const isNativeSelected = value.type === 'native';

  /* Contract address paste */
  const isContractAddress = /^0x[0-9a-fA-F]{40}$/.test(query.trim());

  function handleContractPaste() {
    if (!isContractAddress) return;
    const addr = query.trim() as `0x${string}`;
    onChange({ type: 'erc20', address: addr, symbol: addr.slice(0, 6) });
    setQuery('');
  }

  return (
    <div className={disabled ? 'opacity-50 pointer-events-none' : ''}>
      {/* Section label */}
      <p className="text-xs font-semibold text-white/50 uppercase tracking-widest mb-2">
        Choose a stock or token
      </p>

      {/* Search */}
      <div className="relative mb-3">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" aria-hidden="true" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search or paste contract address"
          className="input-glass !pl-9 !py-2 !text-sm !rounded-xl"
          aria-label="Search assets or paste contract address"
        />
      </div>

      {/* Contract address shortcut */}
      {isContractAddress && (
        <button
          type="button"
          onClick={handleContractPaste}
          className="w-full mb-3 glass-sm px-3 py-2 flex items-center gap-2 text-sm text-white/80
                     hover:bg-white/10 transition-colors rounded-xl text-left"
        >
          <span className="w-7 h-7 rounded-lg bg-white/15 flex items-center justify-center text-xs font-bold" aria-hidden="true">0x</span>
          <div>
            <p className="font-semibold text-white text-xs">Use this contract</p>
            <p className="text-white/50 text-[11px] font-mono truncate max-w-[220px]">{query}</p>
          </div>
        </button>
      )}

      {/* Asset grid */}
      <div
        className="grid gap-2"
        style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(72px, 1fr))' }}
        role="listbox"
        aria-label="Select asset"
      >
        {/* Native ETH tile — always first */}
        {(!query || 'eth'.includes(query.toLowerCase()) || 'ethereum'.includes(query.toLowerCase())) && (
          <div role="option" aria-selected={isNativeSelected}>
            <AssetTile
              symbol="ETH"
              name="Ethereum"
              selected={isNativeSelected}
              onSelect={() => onChange({ type: 'native', symbol: 'ETH' })}
            />
          </div>
        )}

        {filtered.map((token) => {
          const sel =
            value.type === 'erc20' &&
            value.address.toLowerCase() === token.address.toLowerCase();
          return (
            <div key={token.address} role="option" aria-selected={sel}>
              <AssetTile
                symbol={token.symbol}
                name={token.name}
                selected={sel}
                onSelect={() =>
                  onChange({ type: 'erc20', address: token.address, symbol: token.symbol })
                }
              />
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && !isContractAddress && query && (
        <p className="text-center text-xs text-white/40 mt-3 py-2">
          No results — try pasting a contract address
        </p>
      )}
    </div>
  );
}
