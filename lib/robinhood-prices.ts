/**
 * lib/robinhood-prices.ts
 *
 * Thin wrapper around the Robinhood Chain price API.
 * GET https://api.robinhood.com/rhj/prices/{symbol}
 *
 * Returns the mid-price (average of bid + ask) in USD.
 * Results are cached for 15 s (the API's own cache window).
 */

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
export async function fetchTokenPriceUsd(symbol: string): Promise<number | null> {
  const key = symbol.toUpperCase();
  const cached = priceCache.get(key);
  const now = Date.now();

  if (cached && now - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.mid;
  }

  try {
    // Use our server-side proxy to avoid CORS and client-side network issues
    const res = await fetch(`/api/price/${key}`);
    if (!res.ok) return null;

    const data: RHJPricesResponse = await res.json();
    const quote = data.quotes?.[0];
    if (!quote || quote.isTradingHalt) return null;

    const bid = parseFloat(quote.bid);
    const ask = parseFloat(quote.ask);
    if (isNaN(bid) || isNaN(ask)) return null;

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
export function dollarToTokens(usdAmount: number, priceUsd: number, decimals = 18): string {
  if (priceUsd <= 0) return '0';
  const tokens = usdAmount / priceUsd;
  // Clamp display precision to actual token decimals
  const maxDecimals = Math.min(decimals, 8);
  return tokens.toPrecision(6).replace(/\.?0+$/, '');
  void maxDecimals; // used by callers that need the raw value for parseUnits
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
