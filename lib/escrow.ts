import type { PublicClient } from 'viem';
import { BEAM_ESCROW_ABI } from './escrow-abi';
import { BEAM_ESCROW_ADDRESS, DEPOSIT_QUERY_TIMEOUT_MS } from './constants';
import type { Deposit } from './types';

/**
 * Fetch a Deposit record from the BeamEscrow contract.
 * Rejects if no response is received within DEPOSIT_QUERY_TIMEOUT_MS (15 s).
 */
export async function fetchDeposit(
  depositId: bigint,
  publicClient: PublicClient,
): Promise<Deposit> {
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(
      () => reject(new Error(`getDeposit timed out after ${DEPOSIT_QUERY_TIMEOUT_MS}ms`)),
      DEPOSIT_QUERY_TIMEOUT_MS,
    ),
  );

  const readPromise = publicClient.readContract({
    address: BEAM_ESCROW_ADDRESS,
    abi: BEAM_ESCROW_ABI,
    functionName: 'getDeposit',
    args: [depositId],
  });

  const result = await Promise.race([readPromise, timeoutPromise]);

  // Map the returned tuple to the typed Deposit interface
  return {
    sender:      result.sender,
    token:       result.token,
    amount:      result.amount,
    claimSigner: result.claimSigner,
    claimed:     result.claimed,
    createdAt:   result.createdAt,
  };
}
