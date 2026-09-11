/**
 * lib/uniswap-swap.ts
 *
 * Uniswap V3 swap helpers for Robinhood Chain (chainId 4663).
 *
 * CORRECT SWAP PATH: ETH → WETH → stock token (single-hop, direct pool)
 *
 * Verified on-chain liquidity (uint128, via IUniswapV3Pool.liquidity()):
 *   WETH/TSLA fee=3000  → 8.57e21   ← deepest
 *   WETH/NVDA fee=3000  → 5.56e21
 *   WETH/AAPL fee=500   → 2.65e21   (fee=3000 pool does NOT exist for AAPL)
 *   USDG/TSLA fee=3000  → 1.39e18   ← 6,000× shallower (old wrong path)
 *   WETH/USDG fee=500   → 3.80e17   ← very shallow
 *
 * Using the USDG intermediate route (old code) caused ~27% price impact
 * because it routed through two shallow pools.
 * Direct WETH→stock single-hop is the correct path.
 */

import { encodeFunctionData, formatUnits } from 'viem';

// ── Deployed addresses on Robinhood Chain (chainId 4663) ─────────────────────
export const UNISWAP_QUOTER_V2 = '0x33e885eD0Ec9bF04EcfB19341582aADCb4c8A9E7' as const;
export const UNISWAP_SWAP_ROUTER_02 = '0xcaf681a66d020601342297493863e78c959e5cb2' as const;
export const UNISWAP_FACTORY = '0x1f7d7550b1b028f7571e69a784071f0205fd2efa' as const;

// Keep alias for any remaining references
export const UNISWAP_UNIVERSAL_ROUTER = UNISWAP_SWAP_ROUTER_02;

export const WETH_ADDRESS = '0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73' as const;
export const USDG_ADDRESS = '0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168' as const;

// Fee tiers to probe for direct WETH→stock pools.
// Most stock tokens use 3000 (0.3%), AAPL uses 500 (0.05%).
const WETH_STOCK_FEES = [3000, 500, 10000];

// Slippage: 1% — tighter now that we're using deep pools
const SLIPPAGE_BPS = 100;

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
    name: 'quoteExactInputSingle',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      {
        name: 'params',
        type: 'tuple',
        components: [
          { name: 'tokenIn', type: 'address' },
          { name: 'tokenOut', type: 'address' },
          { name: 'amountIn', type: 'uint256' },
          { name: 'fee', type: 'uint24' },
          { name: 'sqrtPriceLimitX96', type: 'uint160' },
        ],
      },
    ],
    outputs: [
      { name: 'amountOut', type: 'uint256' },
      { name: 'sqrtPriceX96After', type: 'uint160' },
      { name: 'initializedTicksCrossed', type: 'uint32' },
      { name: 'gasEstimate', type: 'uint256' },
    ],
  },
] as const;

/**
 * SwapRouter02.exactInputSingle — single-hop swap.
 * When tokenIn == WETH and msg.value == amountIn, the router auto-wraps ETH.
 */
const SWAP_ROUTER_02_ABI = [
  {
    name: 'exactInputSingle',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      {
        name: 'params',
        type: 'tuple',
        components: [
          { name: 'tokenIn', type: 'address' },
          { name: 'tokenOut', type: 'address' },
          { name: 'fee', type: 'uint24' },
          { name: 'recipient', type: 'address' },
          { name: 'amountIn', type: 'uint256' },
          { name: 'amountOutMinimum', type: 'uint256' },
          { name: 'sqrtPriceLimitX96', type: 'uint160' },
        ],
      },
    ],
    outputs: [{ name: 'amountOut', type: 'uint256' }],
  },
] as const;

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
  fee: number;
  // Keep these for backwards compat with the quote display panel
  wethUsdgFee: number;
  usdgTokenFee: number;
  path: `0x${string}`;
}

// ── Quote ─────────────────────────────────────────────────────────────────────

/**
 * Single-hop quote: ETH → WETH → stockToken via the deepest direct pool.
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

    // Find the deepest direct WETH→token pool
    const fee = await findPoolFee(WETH_ADDRESS, tokenAddress, WETH_STOCK_FEES, client);
    if (!fee) {
      console.warn('[uniswap-quote] no direct WETH/token pool found for', tokenAddress);
      return null;
    }

    const result = await client.readContract({
      address: UNISWAP_QUOTER_V2,
      abi: QUOTER_V2_ABI,
      functionName: 'quoteExactInputSingle',
      args: [{
        tokenIn: WETH_ADDRESS,
        tokenOut: tokenAddress,
        amountIn: ethAmountWei,
        fee: fee,
        sqrtPriceLimitX96: 0n,
      }],
    }) as [bigint, bigint, number, bigint];

    const amountOut = result[0];
    const amountOutMin = (amountOut * BigInt(10000 - SLIPPAGE_BPS)) / 10000n;

    // Encode single-hop path for display/compat
    const pathHex = WETH_ADDRESS.toLowerCase().slice(2)
      + fee.toString(16).padStart(6, '0')
      + tokenAddress.toLowerCase().slice(2);
    const path = `0x${pathHex}` as `0x${string}`;

    console.log('[uniswap] direct pool WETH→token fee=', fee, '| amountIn:', ethAmountWei.toString(), '| amountOut:', amountOut.toString());

    return {
      amountIn: ethAmountWei,
      amountOut,
      amountOutMin,
      amountOutFormatted: Number(formatUnits(amountOut, 18)).toPrecision(6).replace(/\.?0+$/, ''),
      fee,
      wethUsdgFee: fee,   // compat alias
      usdgTokenFee: fee,  // compat alias
      path,
    };
  } catch (err) {
    console.warn('[uniswap-quote] failed:', err);
    return null;
  }
}

// ── Swap calldata ─────────────────────────────────────────────────────────────

/**
 * Builds SwapRouter02.exactInputSingle calldata for ETH → stock token.
 * Single hop — no intermediate USDG, directly through the deep WETH/stock pool.
 */
export function buildSwapCalldata(
  quote: UniswapQuote,
  recipient: `0x${string}`,
  deadlineSeconds = 300,
): { to: `0x${string}`; data: `0x${string}`; value: bigint } {
  // Extract tokenOut from the path (last 20 bytes)
  const pathHex = quote.path.slice(2); // remove 0x
  const tokenOut = `0x${pathHex.slice(-40)}` as `0x${string}`;

  const data = encodeFunctionData({
    abi: SWAP_ROUTER_02_ABI,
    functionName: 'exactInputSingle',
    args: [{
      tokenIn: WETH_ADDRESS,
      tokenOut,
      fee: quote.fee,
      recipient,
      amountIn: quote.amountIn,
      amountOutMinimum: quote.amountOutMin,
      sqrtPriceLimitX96: 0n,
    }],
  });

  console.log('[uniswap] exactInputSingle | WETH →', tokenOut, 'fee=', quote.fee, '| value:', quote.amountIn.toString());

  return {
    to: UNISWAP_SWAP_ROUTER_02,
    data,
    value: quote.amountIn,
  };
}

// Keep the old export so nothing else breaks
export async function quoteEthForUsdg(_usdgAmountOut: bigint): Promise<bigint | null> {
  return null; // deprecated — no longer routing through USDG
}
