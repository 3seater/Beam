import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, http } from 'viem';
import { privateKeyToAddress } from 'viem/accounts';
import { recoveryMessage, validRecoveryTime } from '@/lib/beam-recovery';
import { parseBeamLink } from '@/lib/beam-link';
import { BEAM_ESCROW_ABI } from '@/lib/escrow-abi';
import { BEAM_ESCROW_ADDRESS } from '@/lib/constants';
import { robinhoodChain } from '@/lib/chains';
import { SPECTRUM_ABI, SPECTRUM_ESCROW_ADDRESS, spectrumConfigured } from '@/lib/spectrum';
import { saveBeamLink, getBeamLinksForWallet } from '@/lib/beam-store';

export const dynamic = 'force-dynamic';
const client = createPublicClient({ chain: robinhoodChain, transport: http(process.env.NEXT_PUBLIC_RPC_URL ?? 'https://rpc.mainnet.chain.robinhood.com') });

/**
 * GET /api/beams?wallet=0x...
 * Returns all stored BeamLinks for a wallet address.
 */
export async function GET(req: NextRequest) {
  const wallet = req.nextUrl.searchParams.get('wallet');
  if (!wallet || !/^0x[0-9a-fA-F]{40}$/.test(wallet)) {
    return NextResponse.json({ error: 'Invalid wallet address' }, { status: 400 });
  }
  const kind = req.nextUrl.searchParams.get('kind');
  const entries = (await getBeamLinksForWallet(wallet)).filter(entry => kind === 'spectrum' ? entry.kind === 'spectrum' : entry.kind !== 'spectrum');
  const signature = req.headers.get('x-beam-signature');
  if (!signature) return NextResponse.json({ entries: entries.map(entry => ({ depositId: entry.depositId, walletAddress: entry.walletAddress, tokenSymbol: entry.tokenSymbol, usdAmount: entry.usdAmount, createdAt: entry.createdAt, ...(entry.kind ? { kind: entry.kind } : {}) })) }, { headers: { 'Cache-Control': 'no-store' } });
  const timestamp = Number(req.headers.get('x-beam-timestamp'));
  if (!validRecoveryTime(timestamp) || !/^0x[0-9a-fA-F]+$/.test(signature)) return NextResponse.json({ error: 'Recovery signature expired. Please sign again.' }, { status: 401 });
  try {
    const valid = await client.verifyMessage({ address: wallet as `0x${string}`, message: recoveryMessage(wallet, req.nextUrl.origin, timestamp), signature: signature as `0x${string}` });
    if (!valid) return NextResponse.json({ error: 'Wallet ownership could not be verified' }, { status: 401 });
  } catch { return NextResponse.json({ error: 'Wallet verification unavailable' }, { status: 503 }); }
  return NextResponse.json({ entries }, { headers: { 'Cache-Control': 'no-store' } });
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

  if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  const { depositId, walletAddress, beamLink, tokenSymbol, usdAmount, createdAt, kind } =
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

  if (!/^0x[0-9a-fA-F]{40}$/.test(walletAddress) || !/^(0|[1-9]\d*)$/.test(depositId) || !Number.isFinite(usdAmount) || usdAmount <= 0 || !Number.isSafeInteger(createdAt)) return NextResponse.json({ error: 'Invalid fields' }, { status: 400 });
  try {
    const parsed = parseBeamLink(new URL(beamLink).hash);
    const isSpectrum = new URLSearchParams(new URL(beamLink).hash.slice(1)).get('kind') === 'spectrum';
    if ((kind === 'spectrum') !== isSpectrum || (kind !== undefined && kind !== 'spectrum')) throw new Error('Invalid link kind');
    if (parsed.depositId.toString() !== depositId) throw new Error('Deposit mismatch');
    const deposit = isSpectrum ? await (async () => {
      if (!spectrumConfigured) throw new Error('Spectrum not configured');
      const bundle = await client.readContract({ address: SPECTRUM_ESCROW_ADDRESS, abi: SPECTRUM_ABI, functionName: 'getBundle', args: [parsed.depositId] });
      return { sender: bundle[0], claimSigner: bundle[1] };
    })() : await client.readContract({ address: BEAM_ESCROW_ADDRESS, abi: BEAM_ESCROW_ABI, functionName: 'getDeposit', args: [parsed.depositId] });
    if (deposit.sender.toLowerCase() !== walletAddress.toLowerCase() || deposit.claimSigner.toLowerCase() !== privateKeyToAddress(parsed.ephemeralPrivKey).toLowerCase()) return NextResponse.json({ error: 'Link does not match this deposit' }, { status: 403 });
  } catch { return NextResponse.json({ error: 'Could not verify deposit backup' }, { status: 503 }); }

  // Basic sanity: beamLink must contain a #key= fragment
  if (!beamLink.includes('#key=')) {
    return NextResponse.json({ error: 'Invalid beamLink format' }, { status: 400 });
  }

  await saveBeamLink({ depositId, walletAddress, beamLink, tokenSymbol, usdAmount, createdAt, ...(kind === 'spectrum' ? { kind } : {}) });
  return NextResponse.json({ ok: true });
}
