import { NextRequest, NextResponse } from 'next/server';
import { saveBeamLink, getBeamLinksForWallet } from '@/lib/beam-store';

/**
 * GET /api/beams?wallet=0x...
 * Returns all stored BeamLinks for a wallet address.
 */
export async function GET(req: NextRequest) {
  const wallet = req.nextUrl.searchParams.get('wallet');
  if (!wallet || !/^0x[0-9a-fA-F]{40}$/.test(wallet)) {
    return NextResponse.json({ error: 'Invalid wallet address' }, { status: 400 });
  }
  const entries = await getBeamLinksForWallet(wallet);
  return NextResponse.json({ entries });
}

/**
 * POST /api/beams
 * Saves a BeamLink server-side so it's never lost.
 *
 * Body: { depositId, walletAddress, beamLink, tokenSymbol, usdAmount, createdAt }
 */
export async function POST(req: NextRequest) {
  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { depositId, walletAddress, beamLink, tokenSymbol, usdAmount, createdAt } =
    body as Record<string, unknown>;

  if (
    typeof depositId     !== 'string' ||
    typeof walletAddress !== 'string' ||
    typeof beamLink      !== 'string' ||
    typeof tokenSymbol   !== 'string' ||
    typeof usdAmount     !== 'number' ||
    typeof createdAt     !== 'number'
  ) {
    return NextResponse.json({ error: 'Missing or invalid fields' }, { status: 400 });
  }

  // Basic sanity: beamLink must contain a #key= fragment
  if (!beamLink.includes('#key=')) {
    return NextResponse.json({ error: 'Invalid beamLink format' }, { status: 400 });
  }

  await saveBeamLink({ depositId, walletAddress, beamLink, tokenSymbol, usdAmount, createdAt });
  return NextResponse.json({ ok: true });
}
