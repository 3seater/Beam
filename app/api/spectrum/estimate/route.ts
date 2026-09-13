import { NextRequest, NextResponse } from 'next/server';
import { zeroAddress } from 'viem';
import { SPECTRUM_PRESETS, SPECTRUM_ASSETS } from '@/lib/spectrum';
import { buildSpectrumActions, requestEnsoBundle } from '@/lib/enso-bundle';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;
const requests = new Map<string, { count: number; until: number }>();
const previewSender = '0x1111111111111111111111111111111111111111';

export async function POST(req: NextRequest) {
  const now = Date.now();
  for (const [key, value] of requests) if (value.until < now) requests.delete(key);
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown';
  const entry = requests.get(ip) ?? { count: 0, until: now + 60_000 };
  requests.set(ip, entry);
  if (++entry.count > 10) return NextResponse.json({ error: 'Please wait a minute before refreshing.' }, { status: 429 });
  let body;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid request.' }, { status: 400 }); }
  const preset = SPECTRUM_PRESETS.find(p => p.id === body?.presetId);
  if (!preset || typeof body?.amountIn !== 'string' || !/^[1-9]\d{0,24}$/.test(body.amountIn)) return NextResponse.json({ error: 'Invalid allocation.' }, { status: 400 });
  try {
    // Route-only simulation: no escrow, wallet connection, or transaction submission.
    const actions = buildSpectrumActions(preset, SPECTRUM_ASSETS, BigInt(body.amountIn), previewSender, zeroAddress, zeroAddress).slice(0, preset.constituents.length);
    actions.forEach(action => { action.args.receiver = previewSender; });
    // Enso's bundle response reports only the first route's output. Quote each
    // allocated input separately to obtain every preview quantity.
    const quotes = await Promise.all(actions.map(action => requestEnsoBundle([action], previewSender)));
    const amounts = Object.fromEntries(preset.constituents.map((token, i) => {
      const quote = quotes[i];
      const raw = Object.entries(quote.amountsOut ?? {}).find(([address]) => address.toLowerCase() === token.address.toLowerCase())?.[1];
      if (typeof raw !== 'string' || !/^[1-9]\d*$/.test(raw)) throw new Error('Token quantities unavailable.');
      return [token.address.toLowerCase(), raw];
    }));
    return NextResponse.json({ amounts }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ error: 'Token estimates unavailable. Please retry.' }, { status: 502 });
  }
}
