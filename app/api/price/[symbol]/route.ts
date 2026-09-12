import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/price/[symbol]
 *
 * Server-side proxy for the Robinhood Chain price API.
 * For ETH/WETH, falls back to CoinGecko (Robinhood API doesn't serve these).
 */

const DEV_MOCK_PRICES: Record<string, number> = {
  NVDA: 135,
  AAPL: 215,
  TSLA: 250,
  MSFT: 420,
  META: 580,
  GOOGL: 185,
  AMZN: 205,
  SPCX: 35,
  MU: 110,
  USDG: 1,
};

async function fetchEthPriceFromCoinGecko(): Promise<number | null> {
  try {
    const res = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd',
      { next: { revalidate: 30 }, signal: AbortSignal.timeout(5000) },
    );
    if (!res.ok) return null;
    const data = await res.json() as { ethereum?: { usd?: number } };
    return data.ethereum?.usd ?? null;
  } catch {
    return null;
  }
}

function makeMockResponse(symbol: string, mid: number) {
  return {
    quotes: [{
      tokenSymbol: symbol,
      bid: String(mid * 0.999),
      ask: String(mid * 1.001),
      currency: 'USD',
      isTradingHalt: false,
      generatedAt: new Date().toISOString(),
    }],
  };
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { symbol: string } },
) {
  const symbol = params.symbol.toUpperCase();

  // ETH/WETH: not a Robinhood stock token — use CoinGecko
  if (symbol === 'ETH' || symbol === 'WETH') {
    const price = await fetchEthPriceFromCoinGecko();
    const mid = price ?? 2500;
    return NextResponse.json(makeMockResponse(symbol, mid), {
      headers: {
        'Cache-Control': 's-maxage=30, stale-while-revalidate=15',
        'X-Price-Source': price ? 'coingecko' : 'fallback',
      },
    });
  }

  try {
    const res = await fetch(`https://api.robinhood.com/rhj/prices/${symbol}`, {
      next: { revalidate: 10 },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) throw new Error(`upstream ${res.status}`);
    const data = await res.json();
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 's-maxage=10, stale-while-revalidate=5' },
    });
  } catch {
    const mock = DEV_MOCK_PRICES[symbol];
    if (mock) {
      return NextResponse.json(makeMockResponse(symbol, mock), {
        headers: { 'X-Price-Source': 'mock' },
      });
    }
    return NextResponse.json({ error: 'fetch failed' }, { status: 502 });
  }
}
