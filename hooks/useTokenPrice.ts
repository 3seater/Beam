import { useEffect, useState } from 'react';

/**
 * Fetches the mid-price (USD) for a given token symbol via /api/price/[symbol].
 * Pass `address` for DEX tokens so the route can fall back to DexScreener.
 * Returns null while loading or on error.
 */
export function useTokenPrice(symbol: string | undefined, address?: string): number | null {
  const [price, setPrice] = useState<number | null>(null);

  useEffect(() => {
    if (!symbol || symbol === 'TOKEN') return;
    setPrice(null);
    let cancelled = false;

    async function load() {
      try {
        const url = address
          ? `/api/price/${encodeURIComponent(symbol!.toUpperCase())}?address=${encodeURIComponent(address)}`
          : `/api/price/${encodeURIComponent(symbol!.toUpperCase())}`;
        const res = await fetch(url);
        if (!res.ok) return;
        const data = await res.json() as { quotes?: { bid: string; ask: string }[] };
        const quote = data.quotes?.[0];
        if (!quote) return;
        const mid = (parseFloat(quote.bid) + parseFloat(quote.ask)) / 2;
        if (!cancelled && isFinite(mid)) setPrice(mid);
      } catch {
        // silently ignore — USD value just won't show
      }
    }

    void load();
    return () => { cancelled = true; };
  }, [symbol, address]);

  return price;
}
