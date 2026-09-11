/**
 * GET|POST /api/rpc
 *
 * Server-side proxy for Robinhood Chain JSON-RPC.
 * The public RPC (rpc.mainnet.chain.robinhood.com) blocks browser requests
 * with CORS. This proxy forwards all RPC calls from the client through the
 * Next.js server, which has no CORS restrictions.
 */

import { NextRequest, NextResponse } from 'next/server';

const RPC_URL =
  process.env.NEXT_PUBLIC_RPC_URL ??
  'https://rpc.mainnet.chain.robinhood.com';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const upstream = await fetch(RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });

    const data = await upstream.text();
    return new NextResponse(data, {
      status: upstream.status,
      headers: {
        'Content-Type': 'application/json',
        ...CORS_HEADERS,
      },
    });
  } catch (err) {
    console.error('[rpc-proxy] upstream error:', err);
    return NextResponse.json(
      { jsonrpc: '2.0', error: { code: -32603, message: 'RPC proxy error' }, id: null },
      { status: 502, headers: CORS_HEADERS },
    );
  }
}

// Some wagmi polling uses GET for eth_blockNumber via URL params
export async function GET(req: NextRequest) {
  try {
    const body = req.nextUrl.searchParams.get('body') ?? '{}';
    const upstream = await fetch(RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });
    const data = await upstream.text();
    return new NextResponse(data, {
      status: upstream.status,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  } catch {
    return NextResponse.json({ error: 'proxy error' }, { status: 502 });
  }
}
