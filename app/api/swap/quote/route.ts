import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/swap/quote?type=price|quote&sellToken=...&buyToken=...&sellAmount=...&taker=...
 *
 * Server-side proxy for 0x Swap API v2 (AllowanceHolder flow).
 * Keeps the API key server-side and avoids CORS issues.
 */

const ZERO_EX_BASE = 'https://api.0x.org';
const CHAIN_ID = '4663'; // Robinhood Chain

export async function GET(req: NextRequest) {
  const apiKey = process.env.NEXT_PUBLIC_0X_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'NEXT_PUBLIC_0X_API_KEY not configured' }, { status: 503 });
  }

  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type') ?? 'price';

  // Forward all params except 'type', add chainId
  const upstream = new URLSearchParams();
  for (const [k, v] of searchParams.entries()) {
    if (k !== 'type') upstream.set(k, v);
  }
  upstream.set('chainId', CHAIN_ID);

  const endpoint = type === 'quote'
    ? `/swap/allowance-holder/quote?${upstream}`
    : `/swap/allowance-holder/price?${upstream}`;

  const upstreamUrl = `${ZERO_EX_BASE}${endpoint}`;
  console.log('[swap/quote] →', upstreamUrl);

  try {
    const res = await fetch(upstreamUrl, {
      headers: {
        '0x-api-key': apiKey,
        '0x-version': 'v2',
      },
      next: type === 'price' ? { revalidate: 5 } : { revalidate: 0 },
    });

    // Read body once
    const data = await res.json();

    if (!res.ok) {
      console.warn('[swap/quote] 0x error', res.status, JSON.stringify(data));
      return NextResponse.json(data, { status: res.status });
    }

    return NextResponse.json(data, {
      headers: type === 'price'
        ? { 'Cache-Control': 's-maxage=5, stale-while-revalidate=3' }
        : { 'Cache-Control': 'no-store' },
    });
  } catch (err) {
    console.error('[swap/quote] fetch error:', err);
    return NextResponse.json({ error: 'upstream fetch failed' }, { status: 502 });
  }
}
