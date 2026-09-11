// app/api/relay/claim/route.ts
//
// Next.js App Router POST handler for the Beam relayer claim endpoint.
//
// Rate limiting: this implementation uses an in-memory counter keyed by IP
// address, allowing a maximum of 5 requests per IP per 60-second window.
// For multi-instance deployments, replace with a shared store (e.g. Redis).
//
// Security: RELAYER_PRIVATE_KEY is a server-side-only env var. It must
// never be prefixed with NEXT_PUBLIC_ and is never included in any response.

import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, createWalletClient, http, isAddress, isHex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { robinhoodChain } from '@/lib/chains';
import { BEAM_ESCROW_ABI } from '@/lib/escrow-abi';
import { BEAM_ESCROW_ADDRESS } from '@/lib/constants';

// ── Rate limiting ────────────────────────────────────────────────────────────

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 5;

interface RateLimitEntry {
  count: number;
  windowStart: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now - entry.windowStart >= RATE_LIMIT_WINDOW_MS) {
    // New window
    rateLimitMap.set(ip, { count: 1, windowStart: now });
    return false;
  }

  if (entry.count >= RATE_LIMIT_MAX_REQUESTS) {
    return true;
  }

  entry.count += 1;
  return false;
}

// ── Input validation helpers ─────────────────────────────────────────────────

/** Accept base-10 decimal strings with no leading zeros (except "0" itself). */
const VALID_DEPOSIT_ID_RE = /^(0|[1-9]\d*)$/;

/** EIP-55 or lower-case 20-byte hex address. */
function isValidAddress(value: unknown): value is `0x${string}` {
  return typeof value === 'string' && isAddress(value);
}

/** 65-byte (130 hex chars) EIP-191 signature. */
function isValidSignature(value: unknown): value is `0x${string}` {
  return (
    typeof value === 'string' &&
    isHex(value) &&
    value.length === 132 // '0x' + 130 hex chars = 65 bytes
  );
}

// ── POST /api/relay/claim ────────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
  // ── Rate limiting ──────────────────────────────────────────────────────────
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    req.headers.get('x-real-ip') ??
    'unknown';

  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: 'Too many requests. Maximum 5 relay requests per minute per IP.', code: 'RATE_LIMITED' },
      { status: 429 },
    );
  }

  // ── Parse request body ─────────────────────────────────────────────────────
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body', code: 'BAD_REQUEST' },
      { status: 400 },
    );
  }

  if (typeof body !== 'object' || body === null) {
    return NextResponse.json(
      { error: 'Request body must be a JSON object', code: 'BAD_REQUEST' },
      { status: 400 },
    );
  }

  const { depositId, recipientAddress, signature } = body as Record<string, unknown>;

  // ── Field validation ───────────────────────────────────────────────────────
  if (typeof depositId !== 'string' || !VALID_DEPOSIT_ID_RE.test(depositId)) {
    return NextResponse.json(
      { error: 'depositId must be a valid base-10 decimal string', code: 'BAD_REQUEST' },
      { status: 400 },
    );
  }

  if (!isValidAddress(recipientAddress)) {
    return NextResponse.json(
      { error: 'recipientAddress must be a valid EVM address', code: 'BAD_REQUEST' },
      { status: 400 },
    );
  }

  if (!isValidSignature(signature)) {
    return NextResponse.json(
      { error: 'signature must be a 65-byte hex-encoded EIP-191 signature (132 chars including 0x)', code: 'BAD_REQUEST' },
      { status: 400 },
    );
  }

  // ── Relayer wallet setup ───────────────────────────────────────────────────
  const relayerPrivateKey = process.env.RELAYER_PRIVATE_KEY;
  if (!relayerPrivateKey || !isHex(relayerPrivateKey)) {
    console.error('[relay/claim] RELAYER_PRIVATE_KEY is missing or not a valid hex string');
    return NextResponse.json(
      { error: 'Relayer is not configured', code: 'RELAY_FAILED' },
      { status: 503 },
    );
  }

  const account = privateKeyToAccount(relayerPrivateKey as `0x${string}`);

  const publicClient = createPublicClient({
    chain: robinhoodChain,
    transport: http(),
  });

  const walletClient = createWalletClient({
    account,
    chain: robinhoodChain,
    transport: http(),
  });

  const depositIdBigInt = BigInt(depositId);

  // ── Check deposit state ────────────────────────────────────────────────────
  let deposit: Awaited<ReturnType<typeof publicClient.readContract>>;
  try {
    deposit = await publicClient.readContract({
      address: BEAM_ESCROW_ADDRESS,
      abi: BEAM_ESCROW_ABI,
      functionName: 'getDeposit',
      args: [depositIdBigInt],
    });
  } catch (err) {
    console.error('[relay/claim] getDeposit failed:', err);
    return NextResponse.json(
      { error: 'Failed to read deposit from chain', code: 'RELAY_FAILED' },
      { status: 502 },
    );
  }

  const dep = deposit as {
    sender: `0x${string}`;
    token: `0x${string}`;
    amount: bigint;
    claimSigner: `0x${string}`;
    claimed: boolean;
    createdAt: bigint;
  };

  if (dep.claimed) {
    return NextResponse.json(
      { error: 'This deposit has already been claimed or cancelled', code: 'ALREADY_CLAIMED' },
      { status: 409 },
    );
  }

  // ── Dry-run via eth_call ───────────────────────────────────────────────────
  try {
    await publicClient.simulateContract({
      address: BEAM_ESCROW_ADDRESS,
      abi: BEAM_ESCROW_ABI,
      functionName: 'claim',
      args: [depositIdBigInt, recipientAddress, signature],
      account: account.address,
    });
  } catch (err) {
    console.error('[relay/claim] claim simulation failed:', err);
    return NextResponse.json(
      { error: 'Claim simulation failed — signature is likely invalid', code: 'INVALID_SIG' },
      { status: 400 },
    );
  }

  // ── Estimate gas and submit transaction ────────────────────────────────────
  let gasEstimate: bigint;
  try {
    gasEstimate = await publicClient.estimateContractGas({
      address: BEAM_ESCROW_ADDRESS,
      abi: BEAM_ESCROW_ABI,
      functionName: 'claim',
      args: [depositIdBigInt, recipientAddress, signature],
      account: account.address,
    });
  } catch (err) {
    console.error('[relay/claim] gas estimation failed:', err);
    return NextResponse.json(
      { error: 'Gas estimation failed', code: 'RELAY_FAILED' },
      { status: 502 },
    );
  }

  // Apply 20% buffer to gas estimate
  const gasLimit = (gasEstimate * 12n) / 10n;

  let txHash: `0x${string}`;
  try {
    txHash = await walletClient.writeContract({
      address: BEAM_ESCROW_ADDRESS,
      abi: BEAM_ESCROW_ABI,
      functionName: 'claim',
      args: [depositIdBigInt, recipientAddress, signature],
      gas: gasLimit,
    });
  } catch (err) {
    console.error('[relay/claim] claim transaction submission failed:', err);
    return NextResponse.json(
      { error: 'Failed to submit claim transaction', code: 'RELAY_FAILED' },
      { status: 502 },
    );
  }

  return NextResponse.json({ txHash, status: 'submitted' }, { status: 200 });
}
