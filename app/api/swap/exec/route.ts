import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/swap/exec
 *
 * Server-side proxy for Uniswap Trading API POST /swap.
 * Converts a CLASSIC /quote response into executable transaction calldata.
 * Body: { quote, permitData?, signature? }
 */

const UNISWAP_SWAP_API = 'https://trade-api.gateway.uniswap.org/v1/swap';

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
    const res = await fetch(UNISWAP_SWAP_API, {
      method:  'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept':        'application/json',
        'x-api-key':     apiKey,
      },
      body:  JSON.stringify(body),
      cache: 'no-store',
    });

    const data = await res.json();

    if (!res.ok) {
      console.warn('[swap/exec] Uniswap /swap error', res.status, JSON.stringify(data));
      return NextResponse.json(data, { status: res.status });
    }

    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (err) {
    console.error('[swap/exec] fetch error:', err);
    return NextResponse.json({ error: 'upstream fetch failed' }, { status: 502 });
  }
}
