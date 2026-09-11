/**
 * lib/uniswap-swap.ts
 *
 * Uniswap V3 swap helpers for Robinhood Chain (chainId 4663).
 * Uses QuoterV2 for onchain quotes (no API key, no geo-restriction)
 * and UniversalRouter for swap execution.
 *
 * Swap path:  ETH (native) → WETH → USDG → <stock token>
 * Stock tokens on Robinhood Chain trade against USDG.
 */

import { encodeFunctionData, encodeAbiParameters, formatUnits, parseUnits } from 'viem';

// ── Deployed addresses on Robinhood Chain (chainId 4663) ─────────────────────
export const UNISWAP_QUOTER_V2 = '0x33e885eD0Ec9bF04EcfB19341582aADCb4c8A9E7' as const;
export const UNISWAP_UNIVERSAL_ROUTER = '0x8876789976dEcBfCbBbe364623C63652db8C0904' as const;
export const UNISWAP_FACTORY = '0x1f7d7550b1b028f7571e69a784071f0205fd2efa' as const;

export const WETH_ADDRESS = '0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73' as const;
export const USDG_ADDRESS = '0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168' as const;

// Fee tiers to try in order for each hop (picks the first with an active pool)
const WETH_USDG_FEES = [500, 3000, 10000]; // 0.05%, 0.3%, 1%
const USDG_TOKEN_FEES = [3000, 500, 10000]; // try 0.3% first for stock tokens

// Slippage tolerance: 3%
const SLIPPAGE_BPS = 300;

// ── ABIs ─────────────────────────────────────────────────────────────────────

const FACTORY_ABI = [
  {
    name: 'getPool',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'tokenA', type: 'address' },
      { name: 'tokenB', type: 'address' },
      { name: 'fee', type: 'uint24' },
    ],
    outputs: [{ name: 'pool', type: 'address' }],
  },
] as const;

const QUOTER_V2_ABI = [
  {
    name: 'quoteExactInput',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'path', type: 'bytes' },
      { name: 'amountIn', type: 'uint256' },
    ],
    outputs: [
      { name: 'amountOut', type: 'uint256' },
      { name: 'sqrtPriceX96AfterList', type: 'uint160[]' },
      { name: 'initializedTicksCrossedList', type: 'uint32[]' },
      { name: 'gasEstimate', type: 'uint256' },
    ],
  },
] as const;

const UNIVERSAL_ROUTER_ABI = [
  {
    name: 'execute',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      { name: 'commands', type: 'bytes' },
      { name: 'inputs', type: 'bytes[]' },
      { name: 'deadline', type: 'uint256' },
    ],
    outputs: [],
  },
] as const;

// ── Path encoding ─────────────────────────────────────────────────────────────

/** Encodes a Uniswap V3 multihop path: token0 | fee | token1 | fee | token2 */
function encodePath(tokens: readonly string[], fees: readonly number[]): `0x${string}` {
  let hex = tokens[0].toLowerCase().slice(2); // 20 bytes
  for (let i = 0; i < fees.length; i++) {
    hex += fees[i].toString(16).padStart(6, '0'); // 3 bytes uint24
    hex += tokens[i + 1].toLowerCase().slice(2);  // 20 bytes
  }
  return `0x${hex}`;
}

// ── Pool discovery ────────────────────────────────────────────────────────────

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

async function findPoolFee(
  tokenA: string,
  tokenB: string,
  feesToTry: number[],
  client: NonNullable<Awaited<ReturnType<typeof import('wagmi/actions').getPublicClient>>>,
): Promise<number | null> {
  for (const fee of feesToTry) {
    try {
      const pool = await client.readContract({
        address: UNISWAP_FACTORY,
        abi: FACTORY_ABI,
        functionName: 'getPool',
        args: [tokenA as `0x${string}`, tokenB as `0x${string}`, fee],
      }) as string;
      if (pool && pool !== ZERO_ADDRESS) return fee;
    } catch { /* try next fee */ }
  }
  return null;
}

// ── Public types ─────────────────────────────────────────────────────────────

export interface UniswapQuote {
  amountIn: bigint;
  amountOut: bigint;
  amountOutMin: bigint;
  amountOutFormatted: string;
  path: `0x${string}`;
  wethUsdgFee: number;
  usdgTokenFee: number;
}

// ── Quote ─────────────────────────────────────────────────────────────────────

/**
 * Onchain QuoterV2 quote: ETH → WETH → USDG → token.
 * Discovers active pool fee tiers automatically before quoting.
 */
export async function fetchUniswapQuote(
  tokenAddress: `0x${string}`,
  ethAmountWei: bigint,
): Promise<UniswapQuote | null> {
  try {
    const { getPublicClient } = await import('wagmi/actions');
    const { wagmiConfig } = await import('@/lib/wagmi-config');
    const client = getPublicClient(wagmiConfig);
    if (!client) return null;

    // Discover active fee tiers for both hops
    const [wethUsdgFee, usdgTokenFee] = await Promise.all([
      findPoolFee(WETH_ADDRESS, USDG_ADDRESS, WETH_USDG_FEES, client),
      findPoolFee(USDG_ADDRESS, tokenAddress, USDG_TOKEN_FEES, client),
    ]);

    if (!wethUsdgFee || !usdgTokenFee) {
      console.warn('[uniswap-quote] no pool found for pair');
      return null;
    }

    const path = encodePath(
      [WETH_ADDRESS, USDG_ADDRESS, tokenAddress],
      [wethUsdgFee, usdgTokenFee],
    );

    const result = await client.readContract({
      address: UNISWAP_QUOTER_V2,
      abi: QUOTER_V2_ABI,
      functionName: 'quoteExactInput',
      args: [path, ethAmountWei],
    }) as [bigint, bigint[], number[], bigint];

    const amountOut = result[0];
    const amountOutMin = (amountOut * BigInt(10000 - SLIPPAGE_BPS)) / 10000n;

    console.log('[uniswap] pools: WETH/USDG fee=', wethUsdgFee, '| USDG/token fee=', usdgTokenFee);
    console.log('[uniswap] amountIn:', ethAmountWei.toString(), '| amountOut:', amountOut.toString(), '| path:', path);

    return {
      amountIn: ethAmountWei,
      amountOut,
      amountOutMin,
      amountOutFormatted: Number(formatUnits(amountOut, 18)).toPrecision(6).replace(/\.?0+$/, ''),
      path,
      wethUsdgFee,
      usdgTokenFee,
    };
  } catch (err) {
    console.warn('[uniswap-quote] failed:', err);
    return null;
  }
}

// ── Swap calldata ─────────────────────────────────────────────────────────────

/**
 * Builds correct UniversalRouter calldata for: WRAP_ETH + V3_SWAP_EXACT_IN.
 *
 * Command bytes (UR v1.2 / v2):
 *   0x0b = WRAP_ETH         — wrap ETH → WETH, send to router
 *   0x00 = V3_SWAP_EXACT_IN — swap WETH along path, output to recipient
 *
 * Uses encodeFunctionData for type-safe, correct ABI encoding.
 */
export function buildSwapCalldata(
  quote: UniswapQuote,
  recipient: `0x${string}`,
  deadlineSeconds = 300,
): { to: `0x${string}`; data: `0x${string}`; value: bigint } {
  const deadline = BigInt(Math.floor(Date.now() / 1000) + deadlineSeconds);

  // WRAP_ETH input: (address recipient, uint256 amountMin)
  // address(2) = MSG_SENDER constant = the router forwards to itself
  const ROUTER_RECIPIENT = '0x0000000000000000000000000000000000000002' as `0x${string}`;
  const wrapInput = encodeAbiParameters(
    [{ type: 'address' }, { type: 'uint256' }],
    [ROUTER_RECIPIENT, quote.amountIn],
  );

  // V3_SWAP_EXACT_IN input: (address recipient, uint256 amountIn, uint256 amountOutMin, bytes path, bool payerIsUser)
  // payerIsUser = false → router uses its own WETH balance (just wrapped above)
  const swapInput = encodeAbiParameters(
    [
      { type: 'address' },
      { type: 'uint256' },
      { type: 'uint256' },
      { type: 'bytes' },
      { type: 'bool' },
    ],
    [recipient, quote.amountIn, quote.amountOutMin, quote.path, false],
  );

  // commands: byte array where each byte is a command
  // 0x0b = WRAP_ETH, 0x00 = V3_SWAP_EXACT_IN
  const commands = '0x0b00' as `0x${string}`;

  const data = encodeFunctionData({
    abi: UNIVERSAL_ROUTER_ABI,
    functionName: 'execute',
    args: [commands, [wrapInput, swapInput], deadline],
  });

  console.log('[uniswap] swap calldata to:', UNISWAP_UNIVERSAL_ROUTER, '| value:', quote.amountIn.toString());
  console.log('[uniswap] commands:', commands, '| wrapInput:', wrapInput.slice(0, 66), '...');

  return {
    to: UNISWAP_UNIVERSAL_ROUTER,
    data,
    value: quote.amountIn,
  };
}
