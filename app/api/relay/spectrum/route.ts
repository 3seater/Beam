import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, createWalletClient, http, isAddress } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { robinhoodChain } from '@/lib/chains';
import { SPECTRUM_ABI, SPECTRUM_ESCROW_ADDRESS, spectrumConfigured } from '@/lib/spectrum';

const requests = new Map<string, { count: number; until: number }>();
export async function POST(req: NextRequest) {
  const now = Date.now();
  for (const [key, value] of requests) if (value.until < now) requests.delete(key);
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown';
  const entry = requests.get(ip) ?? { count: 0, until: now + 60_000 };
  if (++entry.count > 5) return NextResponse.json({ error: 'Too many claim requests.' }, { status: 429 });
  requests.set(ip, entry);
  let body;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid request.' }, { status: 400 }); }
  if (typeof body?.depositId !== 'string' || !/^[1-9]\d{0,77}$/.test(body.depositId) || !isAddress(body?.recipientAddress ?? '') || typeof body?.signature !== 'string' || !/^0x[0-9a-fA-F]{130}$/.test(body.signature)) return NextResponse.json({ error: 'Invalid claim parameters.' }, { status: 400 });
  if (!spectrumConfigured || !process.env.RELAYER_PRIVATE_KEY) return NextResponse.json({ error: 'Spectrum claims are not configured.' }, { status: 503 });
  try {
    const account = privateKeyToAccount(process.env.RELAYER_PRIVATE_KEY as `0x${string}`);
    const client = createPublicClient({ chain: robinhoodChain, transport: http() });
    const wallet = createWalletClient({ account, chain: robinhoodChain, transport: http() });
    const id = BigInt(body.depositId);
    const bundle = await client.readContract({ address: SPECTRUM_ESCROW_ADDRESS, abi: SPECTRUM_ABI, functionName: 'getBundle', args: [id] });
    if (bundle[2]) return NextResponse.json({ error: 'This Spectrum has already been claimed or cancelled.', code: 'ALREADY_CLAIMED' }, { status: 409 });
    const args = [id, body.recipientAddress as `0x${string}`, body.signature as `0x${string}`] as const;
    const { request } = await client.simulateContract({ account, address: SPECTRUM_ESCROW_ADDRESS, abi: SPECTRUM_ABI, functionName: 'claim', args });
    const txHash = await wallet.writeContract(request);
    return NextResponse.json({ txHash, status: 'submitted' });
  } catch { return NextResponse.json({ error: 'Claim could not be submitted. Verify the link and try again.' }, { status: 400 }); }
}
