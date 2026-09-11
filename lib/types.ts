export interface Deposit {
  sender: `0x${string}`;
  token: `0x${string}`;   // address(0) = native ETH
  amount: bigint;
  claimSigner: `0x${string}`;
  claimed: boolean;
  createdAt: bigint;          // Unix timestamp
}

export interface BeamLinkParams {
  ephemeralPrivKey: `0x${string}`;  // 32-byte hex, 64 chars
  depositId: bigint;
}

export interface ClaimPayload {
  depositId: bigint;
  recipientAddress: `0x${string}`;
  signature: `0x${string}`;  // EIP-191 personal_sign
}

export interface RelayClaimRequest {
  depositId: string;          // base-10 decimal string
  recipientAddress: `0x${string}`;
  signature: `0x${string}`;
}

export interface RelayClaimResponse {
  txHash: `0x${string}`;
  status: 'submitted' | 'confirmed' | 'failed';
  message?: string;
}

export type BeamStep =
  | 'idle'
  | 'swap-pending'
  | 'swap-confirming'
  | 'approval-pending'
  | 'approval-confirming'
  | 'deposit-pending'
  | 'deposit-confirming'
  | 'link-generated';
