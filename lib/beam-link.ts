import { generatePrivateKey, privateKeyToAddress } from 'viem/accounts';

/**
 * Generates a fresh ephemeral secp256k1 key pair for use as the claim signer.
 * The private key must be stored exclusively in memory (URL hash fragment) and
 * never transmitted to any server.
 */
export function generateEphemeralKey(): {
  ephemeralPrivKey: `0x${string}`;
  claimSignerAddress: `0x${string}`;
} {
  const ephemeralPrivKey = generatePrivateKey();   // 32 random bytes, hex-encoded
  const claimSignerAddress = privateKeyToAddress(ephemeralPrivKey);
  return { ephemeralPrivKey, claimSignerAddress };
}

// Exactly 64 lowercase hex characters (32 bytes, no 0x prefix)
const VALID_KEY_RE = /^[0-9a-f]{64}$/;
// Non-negative base-10 integer with no leading zeros (except bare "0")
const VALID_ID_RE  = /^(0|[1-9]\d*)$/;

export interface ParsedBeamLink {
  ephemeralPrivKey: `0x${string}`;
  depositId: bigint;
}

/**
 * Constructs a BeamLink URL.
 * Encodes the ephemeral private key as a 64-char lowercase hex string (zero-padded)
 * and the depositId as a base-10 decimal with no leading zeros.
 *
 * Produces: {origin}/claim#key=<64hexchars>&id=<decimal>
 *
 * Requirements: 6.2, 14.1
 */
export function constructBeamLink(
  origin: string,
  ephemeralPrivKey: `0x${string}`,
  depositId: bigint,
): string {
  // Strip 0x prefix, lowercase, zero-pad to 64 hex chars (32 bytes)
  const hexKey = ephemeralPrivKey.slice(2).toLowerCase().padStart(64, '0');
  const decId  = depositId.toString(10);
  return `${origin}/claim#key=${hexKey}&id=${decId}`;
}

/**
 * Parses a BeamLink hash fragment and validates its parameters.
 * Throws descriptive errors if either parameter is absent or malformed.
 *
 * Requirements: 6.1, 6.3, 14.2, 14.3
 */
export function parseBeamLink(hash: string): ParsedBeamLink {
  const params = new URLSearchParams(hash.replace(/^#/, ''));
  const rawKey = params.get('key') ?? '';
  const rawId  = params.get('id')  ?? '';

  if (!VALID_KEY_RE.test(rawKey)) {
    throw new Error('Invalid or missing key parameter');
  }
  if (!VALID_ID_RE.test(rawId)) {
    throw new Error('Invalid or missing id parameter');
  }

  return {
    ephemeralPrivKey: `0x${rawKey}`,
    depositId: BigInt(rawId),
  };
}
