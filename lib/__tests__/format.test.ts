// Feature: beam, Property 12: Sender address truncation format
// Validates: Requirements 8.3

import { describe, it } from 'vitest';
import fc from 'fast-check';
import { truncateAddress } from '../format';

describe('Property 12: Sender address truncation format', () => {
  it('produces {first6chars}...{last4chars} with total length 13', () => {
    fc.assert(
      fc.property(
        // 40-char hex string representing a 20-byte Ethereum address
        fc.hexaString({ minLength: 40, maxLength: 40 }).map(
          (s) => `0x${s}` as `0x${string}`,
        ),
        (addr) => {
          const result = truncateAddress(addr);

          // Must equal first 6 chars + "..." + last 4 chars
          const expected = `${addr.slice(0, 6)}...${addr.slice(-4)}`;
          if (result !== expected) return false;

          // Total length: 6 + 3 + 4 = 13
          if (result.length !== 13) return false;

          return true;
        },
      ),
      { numRuns: 100 },
    );
  });
});
