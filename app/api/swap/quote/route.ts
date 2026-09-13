import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/swap/quote
 *
 * Server-side proxy for the Uniswap Trading API v1 /quote endpoint.
 * Keeps the API key server-side, avoids CORS, and handles Robinhood Chain (4663).
 *
 * The Uniswap Trading API automatically routes through V4, V3, and UniswapX
 * and returns ready-to-execute Universal Router 2.1.1 calldata.
 *
 * Docs: https://developers.uniswap.org/docs/trading/swapping-api/overview
 */

const UNISWAP_TRADING_API = 'https://trade-api.gateway.uniswap.org/v1/quote';

export async function POST(req: NextRequest) {
  const apiKey = process.env.UNISWAP_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'UNISWAP_API_KEY not configured' }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON body' }, { status: 400 });
  }

  try {
    const res = await fetch(UNISWAP_TRADING_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify(body),
      // Never cache swap quotes — always fresh
      cache: 'no-store',
      signal: AbortSignal.timeout(10_000),
    });

    const data = await res.json();

    if (!res.ok) {
      console.warn('[swap/quote] Uniswap API error', res.status, JSON.stringify(data));
      return NextResponse.json(data, { status: res.status });
    }

    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (err) {
    console.error('[swap/quote] fetch error:', err);
    return NextResponse.json({ error: 'upstream fetch failed' }, { status: 502 });
  }
}

// Keep the old GET handler alive so existing price-preview calls degrade gracefully
// until DollarAmountInput is updated to use the POST endpoint.
export async function GET() {
  return NextResponse.json({ error: 'Use POST /api/swap/quote' }, { status: 405 });
}
