import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Fetch through our server: Robinhood's asset API does not allow browser CORS.
export async function GET() {
  try {
    const upstream = await fetch('https://api.robinhood.com/rhj/assets', {
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(10_000),
    });
    if (!upstream.ok) {
      return NextResponse.json({ error: 'Token list unavailable' }, { status: 502 });
    }
    const data = await upstream.json();
    if (!Array.isArray(data?.assets)) {
      return NextResponse.json({ error: 'Invalid token list response' }, { status: 502 });
    }
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60' },
    });
  } catch {
    return NextResponse.json({ error: 'Token list unavailable' }, { status: 502 });
  }
}
