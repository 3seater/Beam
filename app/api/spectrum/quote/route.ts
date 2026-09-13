import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, http, isAddress } from 'viem';
import { SPECTRUM_PRESETS, SPECTRUM_ASSETS, SPECTRUM_ESCROW_ADDRESS, spectrumConfigured } from '@/lib/spectrum';
import { buildSpectrumActions, requestEnsoBundle } from '@/lib/enso-bundle';
import { robinhoodChain } from '@/lib/chains';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;
const requests = new Map<string, { count: number; until: number }>();
export async function POST(req: NextRequest) {
  const now = Date.now();
  for (const [key, value] of requests) if (value.until < now) requests.delete(key);
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown';
  const entry = requests.get(ip) ?? { count: 0, until: now + 60_000 };
  if (++entry.count > 10) return NextResponse.json({ error: 'Too many bundle quotes. Please wait a minute.' }, { status: 429 });
  requests.set(ip, entry);
  let body;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid request.' }, { status: 400 }); }
  const preset = SPECTRUM_PRESETS.find(p => p.id === body?.presetId);
  if (!preset || !isAddress(body?.sender ?? '') || !isAddress(body?.signer ?? '') || typeof body?.amountIn !== 'string' || !/^[1-9]\d{0,24}$/.test(body.amountIn)) return NextResponse.json({ error: 'Invalid bundle parameters.' }, { status: 400 });
  if (!spectrumConfigured) return NextResponse.json({ error: 'Spectrum sending opens when the bundle escrow is deployed.', code: 'NOT_CONFIGURED' }, { status: 503 });
  try {
    const client = createPublicClient({ chain: robinhoodChain, transport: http() });
    const code = await client.getBytecode({ address: SPECTRUM_ESCROW_ADDRESS });
    if (!code || code === '0x') throw new Error('Bundle escrow is not deployed on Robinhood Chain.');
    const amount = BigInt(body.amountIn);
    const quote = await requestEnsoBundle(buildSpectrumActions(preset, SPECTRUM_ASSETS, amount, body.sender, body.signer, SPECTRUM_ESCROW_ADDRESS), body.sender);
    if (BigInt(quote.tx.value) !== amount) throw new Error('Bundle spending budget could not be verified.');
    return NextResponse.json({ ...quote, presetId: preset.id, expiresAt: Date.now() + 60_000 }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) { return NextResponse.json({ error: err instanceof Error ? err.message : 'Bundle quote unavailable.' }, { status: 502 }); }
}
