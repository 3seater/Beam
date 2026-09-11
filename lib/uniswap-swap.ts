/**
 * lib/uniswap-swap.ts
 *
 * Uniswap V3 swap helpers for Robinhood Chain (chainId 4663).
 * Uses QuoterV2 for onchain quotes and SwapRouter02 for execution.
 *
 * Swap path: ETH (native) → WETH → USDG → <stock token>
 * Stock tokens on Robinhood Chain trade against USDG.
 *
 * We use SwapRouter02.exactInput (not UniversalRouter) because:
 * - Simpler encoding — no WRAP_ETH command byte needed
 * - Accepts native ETH directly via msg.value
 * - More predictable revert reasons
 */

import { encodeFunctionData, encodeAbiParameters, formatUnits } from 'viem';

// ── Deployed addresses on Robinhood Chain (chainId 4663) ─────────────────────
export const UNISWAP_QUOTER_V2 = '0x33e885eD0Ec9bF04EcfB19341582aADCb4c8A9E7' as const;
export const UNISWAP_SWAP_ROUTER_02 = '0xcaf681a66d020601342297493863e78c959e5cb2' as const;
export const UNISWAP_FACTORY = '0x1f7d7550b1b028f7571e69a784071f0205fd2efa' as const;

// Keep the old export name so existing imports don't break
export const UNISWAP_UNIVERSAL_ROUTER = UNISWAP_SWAP_ROUTER_02;

export const WETH_ADDRESS = '0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73' as const;
export const USDG_ADDRESS = '0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168' as const;

const WETH_USDG_FEES = [500, 3000, 10000];
const USDG_TOKEN_FEES = [3000, 500, 10000];
const SLIPPAGE_BPS = 300; // 3%

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

/**
 * SwapRouter02.exactInput — multihop exact-input swap.
 * When tokenIn == WETH and msg.value > 0 the router auto-wraps ETH.
 */
const SWAP_ROUTER_02_ABI = [
  {
    name: 'exactInput',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      {
        name: 'params',
        type: 'tuple',
        components: [
          { name: 'path', type: 'bytes' },
          { name: 'recipient', type: 'address' },
          { name: 'amountIn', type: 'uint256' },
          { name: 'amountOutMinimum', type: 'uint256' },
        ],
      },
    ],
    outputs: [{ name: 'amountOut', type: 'uint256' }],
  },
] as const;

// ── Path encoding ─────────────────────────────────────────────────────────────

function encodePath(tokens: readonly string[], fees: readonly number[]): `0x${string}` {
  let hex = tokens[0].toLowerCase().slice(2);
  for (let i = 0; i < fees.length; i++) {
    hex += fees[i].toString(16).padStart(6, '0');
    hex += tokens[i + 1].toLowerCase().slice(2);
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
    } catch { /* try next */ }
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

export async function fetchUniswapQuote(
  tokenAddress: `0x${string}`,
  ethAmountWei: bigint,
): Promise<UniswapQuote | null> {
  try {
    const { getPublicClient } = await import('wagmi/actions');
    const { wagmiConfig } = await import('@/lib/wagmi-config');
    const client = getPublicClient(wagmiConfig);
    if (!client) return null;

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
 * Builds SwapRouter02.exactInput calldata for ETH → WETH → USDG → token.
 *
 * SwapRouter02 handles ETH→WETH wrapping automatically when:
 *   - path starts with WETH
 *   - msg.value == amountIn
 * No separate WRAP_ETH command needed (unlike UniversalRouter).
 */
export function buildSwapCalldata(
  quote: UniswapQuote,
  recipient: `0x${string}`,
  deadlineSeconds = 300,
): { to: `0x${string}`; data: `0x${string}`; value: bigint } {
  const deadline = BigInt(Math.floor(Date.now() / 1000) + deadlineSeconds);

  const data = encodeFunctionData({
    abi: SWAP_ROUTER_02_ABI,
    functionName: 'exactInput',
    args: [{
      path: quote.path,
      recipient,
      amountIn: quote.amountIn,
      amountOutMinimum: quote.amountOutMin,
    }],
  });

  console.log('[uniswap] SwapRouter02.exactInput | to:', UNISWAP_SWAP_ROUTER_02, '| value:', quote.amountIn.toString());

  return {
    to: UNISWAP_SWAP_ROUTER_02,
    data,
    value: quote.amountIn,
  };
}
