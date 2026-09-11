'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import Image from 'next/image';
import { Search, Check, Loader2, X } from 'lucide-react';
import { fetchRobinhoodTokens, POPULAR_SYMBOLS, stockLogoUrl, type RHToken } from '@/lib/robinhood-tokens';

/* ── Types re-exported for the parent ───────────────────────────────────── */
export type NativeAsset = { type: 'native'; symbol: 'ETH' };
export type ERC20Asset = { type: 'erc20'; address: `0x${string}`; symbol: string; logoUrl: string; name: string; decimals: number };
export type SelectedAsset = NativeAsset | ERC20Asset;

interface TokenPickerProps {
  value: SelectedAsset;
  onChange: (asset: SelectedAsset) => void;
  disabled?: boolean;
}

/* ── Minimal ERC-20 metadata ABI ────────────────────────────────────────── */
const ERC20_META_ABI = [
  { name: 'symbol', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'string' }] },
  { name: 'name', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'string' }] },
  { name: 'decimals', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint8' }] },
] as const;

async function resolveTokenMeta(address: `0x${string}`): Promise<{ symbol: string; name: string; decimals: number } | null> {
  try {
    const { getPublicClient } = await import('wagmi/actions');
    const { wagmiConfig } = await import('@/lib/wagmi-config');
    const client = getPublicClient(wagmiConfig);
    if (!client) return null;

    const [symbol, name, decimals] = await Promise.all([
      client.readContract({ address, abi: ERC20_META_ABI, functionName: 'symbol' }),
      client.readContract({ address, abi: ERC20_META_ABI, functionName: 'name' }),
      client.readContract({ address, abi: ERC20_META_ABI, functionName: 'decimals' }),
    ]);

    return { symbol: String(symbol), name: String(name), decimals: Number(decimals) };
  } catch {
    return null;
  }
}

/* ── Token logo with graceful fallback ──────────────────────────────────── */
function TokenLogo({ logoUrl, symbol, size = 36 }: { logoUrl: string; symbol: string; size?: number }) {
  const [err, setErr] = useState(false);
  // Reset error state if logoUrl changes
  const prevUrl = useRef(logoUrl);
  if (prevUrl.current !== logoUrl) { prevUrl.current = logoUrl; setErr(false); }

  const initials = symbol.slice(0, 3).toUpperCase();

  if (err || !logoUrl) {
    return (
      <span
        className="flex items-center justify-center rounded-xl bg-white/15 border border-white/20
                   text-[10px] font-semibold text-white/80 shrink-0"
        style={{ width: size, height: size }}
        aria-hidden="true"
      >
        {initials}
      </span>
    );
  }

  return (
    <Image
      src={logoUrl}
      alt={symbol}
      width={size}
      height={size}
      className="rounded-xl object-contain bg-white/10"
      onError={() => setErr(true)}
      unoptimized
    />
  );
}

/* ── Individual tile in the grid ────────────────────────────────────────── */
function TokenTile({
  token,
  selected,
  onSelect,
}: {
  token: { symbol: string; name: string; logoUrl: string };
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      aria-label={`${token.name} (${token.symbol})`}
      className={[
        'token-tile relative flex flex-col items-center gap-1.5 py-3 px-2',
        selected ? 'selected' : '',
      ].join(' ')}
    >
      {selected && (
        <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-white/80
                         flex items-center justify-center z-10">
          <Check size={9} className="text-sky-top" strokeWidth={3} aria-hidden="true" />
        </span>
      )}
      <TokenLogo logoUrl={token.logoUrl} symbol={token.symbol} size={32} />
      <span className="text-[11px] font-medium text-white tracking-normal leading-none">
        {token.symbol}
      </span>
    </button>
  );
}

/* ── ETH pseudo-token ────────────────────────────────────────────────────── */
const ETH_TOKEN = {
  symbol: 'ETH' as const,
  name: 'Ethereum' as const,
  logoUrl: 'https://coin-images.coingecko.com/coins/images/279/small/ethereum.png?1696501628',
  isStock: false as const,
  decimals: 18,
};

/* ── Selected token chip ─────────────────────────────────────────────────── */
function SelectedChip({ asset, onClear }: { asset: SelectedAsset; onClear: () => void }) {
  const symbol = asset.type === 'native' ? 'ETH' : asset.symbol;
  const name = asset.type === 'native' ? 'Ethereum' : asset.name;
  const logoUrl = asset.type === 'native' ? ETH_TOKEN.logoUrl : asset.logoUrl;

  return (
    <div className="flex items-center gap-2.5 glass-sm rounded-xl px-3 py-2.5 mb-3">
      <TokenLogo logoUrl={logoUrl} symbol={symbol} size={28} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white leading-tight">{symbol}</p>
        <p className="text-[11px] text-white/50 leading-tight truncate">{name}</p>
      </div>
      <button
        type="button"
        onClick={onClear}
        className="w-6 h-6 rounded-full flex items-center justify-center
                   bg-white/10 hover:bg-white/20 transition-colors shrink-0"
        aria-label={`Deselect ${symbol}`}
      >
        <X size={11} className="text-white/60" />
      </button>
    </div>
  );
}

/* ── Resolved-token tile (for a pasted CA not in the known list) ─────────── */
type ResolvedToken = { address: `0x${string}`; symbol: string; name: string; decimals: number; logoUrl: string };

/* ── Component ──────────────────────────────────────────────────────────── */
export function TokenPicker({ value, onChange, disabled = false }: TokenPickerProps) {
  const [allTokens, setAllTokens] = useState<RHToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  // A resolved-but-not-yet-selected token from a pasted CA
  const [resolvedToken, setResolvedToken] = useState<ResolvedToken | null>(null);
  const [resolving, setResolving] = useState(false);
  const [resolveErr, setResolveErr] = useState(false);
  // Track which address we last resolved so we don't re-resolve on every keystroke
  const lastResolvedAddr = useRef<string>('');

  /* Fetch real token list on mount */
  useEffect(() => {
    let cancelled = false;
    fetchRobinhoodTokens().then((tokens) => {
      if (!cancelled) { setAllTokens(tokens); setLoading(false); }
    });
    return () => { cancelled = true; };
  }, []);

  const popularTokens = useMemo(() => {
    if (allTokens.length === 0) return [];
    return POPULAR_SYMBOLS
      .map((sym) => allTokens.find((t) => t.symbol === sym))
      .filter((t): t is RHToken => t !== undefined);
  }, [allTokens]);

  const q = query.trim().toLowerCase();
  const rawAddr = query.trim();
  const isContractPaste = /^0x[0-9a-fA-F]{40}$/.test(rawAddr);

  const filtered = useMemo(() => {
    if (!q) return popularTokens;
    if (isContractPaste) {
      const known = allTokens.find((t) => t.address.toLowerCase() === rawAddr.toLowerCase());
      return known ? [known] : [];
    }
    return allTokens.filter(
      (t) => t.symbol.toLowerCase().includes(q) || t.name.toLowerCase().includes(q),
    );
  }, [q, allTokens, popularTokens, isContractPaste, rawAddr]);

  /* Auto-resolve unknown CA as soon as it's pasted */
  useEffect(() => {
    if (!isContractPaste) {
      setResolvedToken(null);
      setResolveErr(false);
      return;
    }

    const addr = rawAddr as `0x${string}`;

    // Already in our known token list — no need to resolve
    const known = allTokens.find((t) => t.address.toLowerCase() === addr.toLowerCase());
    if (known) {
      setResolvedToken(null);
      return;
    }

    // Already resolved this address
    if (lastResolvedAddr.current === addr.toLowerCase()) return;

    lastResolvedAddr.current = addr.toLowerCase();
    setResolving(true);
    setResolveErr(false);
    setResolvedToken(null);

    resolveTokenMeta(addr).then((meta) => {
      setResolving(false);
      if (!meta) {
        setResolveErr(true);
      } else {
        setResolvedToken({ address: addr, ...meta, logoUrl: stockLogoUrl(meta.symbol) });
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawAddr, isContractPaste, allTokens.length]);

  const showEth = !q || 'ethereum'.includes(q) || 'eth'.includes(q);
  const isNativeSelected = value.type === 'native';
  const hasSelection = value.type === 'native' || (value.type === 'erc20' && value.symbol !== '');

  function selectERC20(token: RHToken) {
    onChange({ type: 'erc20', address: token.address, symbol: token.symbol, logoUrl: token.logoUrl, name: token.name, decimals: token.decimals });
    setQuery('');
    setResolvedToken(null);
    lastResolvedAddr.current = '';
  }

  function selectResolved(token: ResolvedToken) {
    onChange({ type: 'erc20', address: token.address, symbol: token.symbol, logoUrl: token.logoUrl, name: token.name, decimals: token.decimals });
    setQuery('');
    setResolvedToken(null);
    lastResolvedAddr.current = '';
  }

  function clearSelection() {
    onChange({ type: 'native', symbol: 'ETH' });
  }

  return (
    <div className={disabled ? 'opacity-50 pointer-events-none' : ''}>
      {/* Step label */}
      <div className="flex items-center gap-2 mb-3">
        <span className="w-5 h-5 rounded-full bg-white/20 border border-white/30 flex items-center justify-center shrink-0"
          style={{ fontSize: '11px', fontWeight: 500, color: 'rgba(255,255,255,0.90)' }}>
          1
        </span>
        <p className="text-sm font-normal text-white/90">Choose a token</p>
      </div>

      {/* Selected token chip — shown when a token is chosen and user isn't searching */}
      {hasSelection && !query && (
        <SelectedChip asset={value} onClear={clearSelection} />
      )}

      {/* Search bar */}
      <div className="relative mb-3">
        <Search
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none"
          aria-hidden="true"
        />
        <input
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setResolveErr(false); }}
          placeholder={hasSelection ? 'Change token…' : 'Search stocks & crypto or paste contract address'}
          className="input-glass !pl-9 !py-2 !text-sm !rounded-xl w-full"
          aria-label="Search or paste contract address"
          disabled={disabled}
        />
      </div>

      {/* Resolving spinner */}
      {resolving && (
        <div className="flex items-center gap-2 px-1 mb-3 text-sm text-white/50">
          <Loader2 size={13} className="animate-spin shrink-0" aria-hidden="true" />
          Resolving token…
        </div>
      )}

      {/* Resolve error */}
      {resolveErr && (
        <p className="text-xs text-red-300/80 px-1 mb-3">
          Could not resolve — make sure this is a valid ERC-20 on Robinhood Chain.
        </p>
      )}

      {/* Token grid */}
      <div style={{ padding: '4px' }}>
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-6 text-white/45 text-sm">
            <Loader2 size={15} className="animate-spin" aria-hidden="true" />
            Loading tokens…
          </div>
        ) : (
          <div
            role="listbox"
            aria-label="Select token"
            className="grid gap-2"
            style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(68px, 1fr))' }}
          >
            {showEth && !resolvedToken && (
              <div role="option" aria-selected={isNativeSelected}>
                <TokenTile
                  token={ETH_TOKEN}
                  selected={isNativeSelected}
                  onSelect={() => { onChange({ type: 'native', symbol: 'ETH' }); setQuery(''); }}
                />
              </div>
            )}

            {/* Known tokens from search/popular */}
            {filtered.map((token) => {
              const sel =
                value.type === 'erc20' &&
                value.address.toLowerCase() === token.address.toLowerCase();
              return (
                <div key={token.address} role="option" aria-selected={sel}>
                  <TokenTile
                    token={token}
                    selected={sel}
                    onSelect={() => selectERC20(token)}
                  />
                </div>
              );
            })}

            {/* Resolved unknown CA — shown as a normal clickable tile */}
            {resolvedToken && (
              <div role="option" aria-selected={false}>
                <TokenTile
                  token={{ symbol: resolvedToken.symbol, name: resolvedToken.name, logoUrl: resolvedToken.logoUrl }}
                  selected={
                    value.type === 'erc20' &&
                    value.address.toLowerCase() === resolvedToken.address.toLowerCase()
                  }
                  onSelect={() => selectResolved(resolvedToken)}
                />
              </div>
            )}
          </div>
        )}

        {!loading && !resolving && !resolvedToken && filtered.length === 0 && !resolveErr && q && !isContractPaste && (
          <p className="text-center text-xs text-white/40 mt-3 py-2">
            No results — try pasting a contract address above
          </p>
        )}
      </div>
    </div>
  );
}
