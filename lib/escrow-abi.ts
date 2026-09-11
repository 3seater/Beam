// lib/escrow-abi.ts — minimal ABI fragments used by the frontend

export const BEAM_ESCROW_ABI = [
  // depositNative
  {
    name: 'depositNative',
    type: 'function',
    stateMutability: 'payable',
    inputs: [{ name: 'claimSignerAddress', type: 'address' }],
    outputs: [{ name: 'depositId', type: 'uint256' }],
  },
  // depositToken
  {
    name: 'depositToken',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'tokenAddress', type: 'address' },
      { name: 'amount', type: 'uint256' },
      { name: 'claimSignerAddress', type: 'address' },
    ],
    outputs: [{ name: 'depositId', type: 'uint256' }],
  },
  // getDeposit
  {
    name: 'getDeposit',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'depositId', type: 'uint256' }],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'sender', type: 'address' },
          { name: 'token', type: 'address' },
          { name: 'amount', type: 'uint256' },
          { name: 'claimSigner', type: 'address' },
          { name: 'claimed', type: 'bool' },
          { name: 'createdAt', type: 'uint256' },
        ],
      },
    ],
  },
  // claim
  {
    name: 'claim',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'depositId', type: 'uint256' },
      { name: 'recipientAddress', type: 'address' },
      { name: 'signature', type: 'bytes' },
    ],
    outputs: [],
  },
  // cancel
  {
    name: 'cancel',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'depositId', type: 'uint256' }],
    outputs: [],
  },
  // Events
  {
    name: 'Deposited',
    type: 'event',
    inputs: [
      { name: 'depositId', type: 'uint256', indexed: true },
      { name: 'sender', type: 'address', indexed: true },
      { name: 'token', type: 'address', indexed: false },
      { name: 'amount', type: 'uint256', indexed: false },
      { name: 'claimSignerAddress', type: 'address', indexed: false },
    ],
  },
  {
    name: 'Claimed',
    type: 'event',
    inputs: [
      { name: 'depositId', type: 'uint256', indexed: true },
      { name: 'recipientAddress', type: 'address', indexed: true },
      { name: 'token', type: 'address', indexed: false },
      { name: 'amount', type: 'uint256', indexed: false },
    ],
  },
  {
    name: 'Cancelled',
    type: 'event',
    inputs: [
      { name: 'depositId', type: 'uint256', indexed: true },
      { name: 'sender', type: 'address', indexed: true },
    ],
  },
] as const;
