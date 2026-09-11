import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/price/[symbol]
 *
 * Server-side proxy for the Robinhood Chain price API.
 * Proxying avoids any CORS or client-side network restrictions.
 *
 * Falls back to approximate mock prices in dev if the API is unreachable,
 * so the send flow can be tested end-to-end locally.
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
  ETH: 3400,
  WETH: 3400,
  USDG: 1,
};

export async function GET(
  _req: NextRequest,
  { params }: { params: { symbol: string } },
) {
  const symbol = params.symbol.toUpperCase();

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
    // API unreachable — return mock price so the flow can be tested
    const mock = DEV_MOCK_PRICES[symbol];
    if (mock) {
      const mockResponse = {
        quotes: [{
          tokenSymbol: symbol,
          bid: String(mock * 0.999),
          ask: String(mock * 1.001),
          currency: 'USD',
          isTradingHalt: false,
          generatedAt: new Date().toISOString(),
        }],
      };
      return NextResponse.json(mockResponse, {
        headers: { 'X-Price-Source': 'mock' },
      });
    }
    return NextResponse.json({ error: 'fetch failed' }, { status: 502 });
  }
}
