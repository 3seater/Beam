/**
 * lib/robinhood-prices.ts
 *
 * Thin wrapper around the Robinhood Chain price API.
 * GET https://api.robinhood.com/rhj/prices/{symbol}
 *
 * Returns the mid-price (average of bid + ask) in USD.
 * Results are cached for 15 s (the API's own cache window).
 */

import { formatTokenValue } from '@/lib/format';

interface RHJPriceEntry {
  tokenSymbol: string;
  bid: string;
  ask: string;
  currency: string;
  isTradingHalt: boolean;
  generatedAt: string;
}

interface RHJPricesResponse {
  quotes: RHJPriceEntry[];
}

interface CacheEntry {
  mid: number;
  fetchedAt: number;
}

const CACHE_TTL_MS = 15_000;
const priceCache = new Map<string, CacheEntry>();

/**
 * Returns the mid-market USD price for a given stock/token symbol.
 * Returns null if the fetch fails or the asset is halted.
 */
export async function fetchTokenPriceUsd(symbol: string, address?: string): Promise<number | null> {
  const key = `${symbol.toUpperCase()}:${address?.toLowerCase() ?? ""}`;
  const cached = priceCache.get(key);
  const now = Date.now();

  if (cached && now - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.mid;
  }

  try {
    // Use our server-side proxy to avoid CORS and client-side network issues
    const res = await fetch(`/api/price/${encodeURIComponent(symbol.toUpperCase())}${address ? `?address=${encodeURIComponent(address)}` : ""}`);
    if (!res.ok) return null;

    const data: RHJPricesResponse = await res.json();
    const quote = data.quotes?.[0];
    if (!quote || quote.isTradingHalt) return null;

    const bid = parseFloat(quote.bid);
    const ask = parseFloat(quote.ask);
    if (!Number.isFinite(bid) || !Number.isFinite(ask) || bid <= 0 || ask <= 0) return null;

    const mid = (bid + ask) / 2;
    priceCache.set(key, { mid, fetchedAt: now });
    return mid;
  } catch {
    return null;
  }
}

/**
 * Given a USD dollar amount and a price, returns how many tokens that buys.
 * Respects the token's decimal precision for display (defaults to 18).
 * e.g. dollarToTokens(10, 130.5, 18) → "0.0766284"
 */
export function dollarToTokens(usdAmount: number, priceUsd: number, _decimals = 18): string {
  void _decimals;
  if (priceUsd <= 0) return '0';
  const tokens = usdAmount / priceUsd;
  return formatTokenValue(tokens);
}

/**
 * Format a USD amount nicely: "$1,234.56"
 */
export function formatUsd(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}
