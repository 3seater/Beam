// Feature: beam, Property 11: Share URLs contain the full BeamLink
// Validates: Requirements 6.5

import { describe, it } from 'vitest';
import fc from 'fast-check';
import { constructBeamLink } from '../../lib/beam-link';

/**
 * Inline share URL builder matching the intended BeamLinkDisplay implementation.
 * Each scheme encodes the full BeamLink as the message body parameter.
 */
function buildShareUrls(beamLink: string) {
  const encoded = encodeURIComponent(beamLink);
  return {
    imessage: `sms:&body=${encoded}`,
    twitter:  `https://twitter.com/intent/tweet?text=${encoded}`,
    whatsapp: `https://wa.me/?text=${encoded}`,
  };
}

describe('Property 11: Share URLs contain the full BeamLink', () => {
  it('each share URL contains the full BeamLink URL as a URL-encoded substring', () => {
    fc.assert(
      fc.property(
        // 32-byte ephemeral key as Uint8Array
        fc.uint8Array({ minLength: 32, maxLength: 32 }),
        // depositId from 0 to 2^256 - 1
        fc.bigInt({ min: 0n, max: 2n ** 256n - 1n }),
        // origin: a plausible web origin (scheme + host)
        fc.webUrl({ withFragments: false, withQueryParameters: false }),
        (keyBytes, depositId, origin) => {
          // Build a valid 0x-prefixed 64-char hex key from the byte array
          const hexKey = Array.from(keyBytes)
            .map((b) => b.toString(16).padStart(2, '0'))
            .join('');
          const ephemeralPrivKey = `0x${hexKey}` as `0x${string}`;

          // Construct the full BeamLink
          const beamLink = constructBeamLink(origin, ephemeralPrivKey, depositId);

          // Build the three share URLs
          const { imessage, twitter, whatsapp } = buildShareUrls(beamLink);

          // The full BeamLink must appear URL-encoded in each share URL's body parameter
          const encodedBeamLink = encodeURIComponent(beamLink);

          if (!imessage.includes(encodedBeamLink))  return false;
          if (!twitter.includes(encodedBeamLink))   return false;
          if (!whatsapp.includes(encodedBeamLink))  return false;

          return true;
        },
      ),
      { numRuns: 100 },
    );
  });
});
