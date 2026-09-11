import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/token-logo/[address]
 *
 * Looks up a token logo by its contract address on the Robinhood Chain
 * (chainId 4663). Uses CoinGecko's coin list (with platform data) to
 * find the coin ID, then fetches the small logo URL.
 *
 * Results are cached for 24 h — logos never change.
 */

const CACHE_HEADERS = {
  'Cache-Control': 's-maxage=86400, stale-while-revalidate=3600',
};

export async function GET(
  _req: NextRequest,
  { params }: { params: { address: string } },
) {
  const address = params.address.toLowerCase();

  if (!/^0x[0-9a-f]{40}$/.test(address)) {
    return NextResponse.json({ error: 'invalid address' }, { status: 400 });
  }

  try {
    // CoinGecko coin list with platform addresses — includes Robinhood chain
    const listRes = await fetch(
      'https://api.coingecko.com/api/v3/coins/list?include_platform=true',
      { next: { revalidate: 3600 }, signal: AbortSignal.timeout(8000) },
    );
    if (!listRes.ok) throw new Error(`CoinGecko list HTTP ${listRes.status}`);

    const coins: Array<{
      id: string;
      symbol: string;
      name: string;
      platforms: Record<string, string>;
    }> = await listRes.json();

    // Find the coin whose Robinhood platform address matches
    const match = coins.find(
      (c) => c.platforms?.['robinhood']?.toLowerCase() === address,
    );

    if (!match) {
      return NextResponse.json({ logoUrl: null }, { headers: CACHE_HEADERS });
    }

    // Fetch the coin detail to get the image URL
    const detailRes = await fetch(
      `https://api.coingecko.com/api/v3/coins/${match.id}?localization=false&tickers=false&market_data=false&community_data=false&developer_data=false`,
      { next: { revalidate: 86400 }, signal: AbortSignal.timeout(8000) },
    );
    if (!detailRes.ok) throw new Error(`CoinGecko detail HTTP ${detailRes.status}`);

    const detail: { image?: { small?: string } } = await detailRes.json();
    const logoUrl = detail.image?.small ?? null;

    return NextResponse.json({ logoUrl }, { headers: CACHE_HEADERS });
  } catch (err) {
    console.warn('[token-logo] lookup failed:', err);
    return NextResponse.json({ logoUrl: null }, { status: 502 });
  }
}
