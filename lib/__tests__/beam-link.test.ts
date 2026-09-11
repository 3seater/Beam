// Feature: beam, Property 1: BeamLink encode/parse round-trip
// Validates: Requirements 14.1, 14.2, 14.4

import { describe, it } from 'vitest';
import fc from 'fast-check';
import { constructBeamLink, parseBeamLink } from '../beam-link';

describe('Property 1: BeamLink encode/parse round-trip', () => {
  it('recovers the original ephemeral key and depositId after encode→parse', () => {
    fc.assert(
      fc.property(
        // 32-byte key as Uint8Array
        fc.uint8Array({ minLength: 32, maxLength: 32 }),
        // depositId from 0 to 2^256 - 1
        fc.bigInt({ min: 0n, max: 2n ** 256n - 1n }),
        (keyBytes, depositId) => {
          // Convert Uint8Array → 0x-prefixed 64-char lowercase hex
          const hexKey = Array.from(keyBytes)
            .map((b) => b.toString(16).padStart(2, '0'))
            .join('');
          const ephemeralPrivKey = `0x${hexKey}` as `0x${string}`;

          const link = constructBeamLink(
            'http://localhost:3000',
            ephemeralPrivKey,
            depositId,
          );

          // Extract only the hash fragment to pass to parseBeamLink
          const hash = link.split('#')[1] ?? '';
          const parsed = parseBeamLink(`#${hash}`);

          // Key must round-trip byte-for-byte (64 lowercase hex chars after 0x)
          const expectedKey = `0x${hexKey.padStart(64, '0')}`;
          if (parsed.ephemeralPrivKey !== expectedKey) return false;

          // DepositId must round-trip exactly
          if (parsed.depositId !== depositId) return false;

          return true;
        },
      ),
      { numRuns: 100 },
    );
  });
});
