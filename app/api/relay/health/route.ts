// app/api/relay/health/route.ts
//
// Next.js App Router GET handler for the Beam relayer health check endpoint.
// Returns { status: "ok", timestamp: <epoch ms> } with HTTP 200.

import { NextResponse } from 'next/server';

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({ status: 'ok', timestamp: Date.now() }, { status: 200 });
}
