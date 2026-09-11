// lib/eip191.ts
import { keccak256, encodePacked, toBytes } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

/**
 * Sign the ClaimPayload: EIP-191 personal_sign over
 * keccak256(abi.encodePacked(recipientAddress, depositId))
 *
 * The contract uses MessageHashUtils.toEthSignedMessageHash + ECDSA.recover,
 * which applies the same "\x19Ethereum Signed Message:\n32" prefix — so both
 * sides are symmetric.
 */
export async function signClaimPayload(
  ephemeralPrivKey: `0x${string}`,
  recipientAddress: `0x${string}`,
  depositId: bigint,
): Promise<`0x${string}`> {
  const msgHash = keccak256(
    encodePacked(['address', 'uint256'], [recipientAddress, depositId])
  );
  const account = privateKeyToAccount(ephemeralPrivKey);
  // signMessage applies EIP-191 prefix: "\x19Ethereum Signed Message:\n32"
  return account.signMessage({ message: { raw: toBytes(msgHash) } });
}
