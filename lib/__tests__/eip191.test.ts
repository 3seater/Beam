// Feature: beam, Property 10: EIP-191 signing round-trip
// Validates: Requirements 9.3

import { describe, it } from 'vitest';
import fc from 'fast-check';
import { recoverMessageAddress } from 'viem';
import { privateKeyToAddress } from 'viem/accounts';
import { signClaimPayload } from '../eip191';

describe('Property 10: EIP-191 signing round-trip', () => {
  it('recovers the signer address after signing a ClaimPayload', async () => {
    await fc.assert(
      fc.asyncProperty(
        // 64-char hex string → private key (prepend 0x)
        fc.hexaString({ minLength: 64, maxLength: 64 }),
        // arbitrary depositId ≥ 0
        fc.bigInt({ min: 0n }),
        // recipient address: 40-char hex → prepend 0x
        fc.hexaString({ minLength: 40, maxLength: 40 }).map(
          (s) => `0x${s}` as `0x${string}`,
        ),
        async (rawKey, depositId, recipientAddress) => {
          const privKey = `0x${rawKey}` as `0x${string}`;

          // privateKeyToAddress throws on keys that are 0 or >= curve order;
          // use vm.assume-equivalent: skip invalid keys
          let expectedSigner: `0x${string}`;
          try {
            expectedSigner = privateKeyToAddress(privKey);
          } catch {
            // invalid key — skip this run
            return true;
          }

          const signature = await signClaimPayload(
            privKey,
            recipientAddress,
            depositId,
          );

          // signClaimPayload uses keccak256(encodePacked([address,uint256]))
          // then signs with EIP-191 personal_sign prefix via signMessage({raw:...})
          // recoverMessageAddress reverses the same EIP-191 wrapping
          const { keccak256, encodePacked, toBytes } = await import('viem');
          const msgHash = keccak256(
            encodePacked(['address', 'uint256'], [recipientAddress, depositId]),
          );

          const recovered = await recoverMessageAddress({
            message: { raw: toBytes(msgHash) },
            signature,
          });

          return recovered.toLowerCase() === expectedSigner.toLowerCase();
        },
      ),
      { numRuns: 100 },
    );
  });
});
