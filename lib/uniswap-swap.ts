/**
 * lib/uniswap-swap.ts
 *
 * Swap helpers for Robinhood Chain (chainId 4663).
 *
 * Quote strategy (in priority order):
 *  1. Uniswap Trading API (trade-api.gateway.uniswap.org) — if UNISWAP_API_KEY set
 *     POST /quote → POST /swap (CLASSIC) → executable calldata
 *  2. V4 StateView on-chain — reads sqrtPriceX96 from PoolManager storage
 *  3. V3 QuoterV2 on-chain — direct pool read, shallow but always available
 *
 * Official Uniswap V4 addresses on Robinhood Chain (chainId 4663):
 *   Source: https://developers.uniswap.org/docs/protocols/v4/deployments.md
 *   PoolManager:      0x8366a39cc670b4001a1121b8f6a443a643e40951
 *   StateView:        0xf3334192d15450cdd385c8b70e03f9a6bd9e673b
 *   V4Quoter:         0x8dc178efb8111bb0973dd9d722ebeff267c98f94
 *   PositionManager:  0x58daec3116aae6d93017baaea7749052e8a04fa7
 *   UniversalRouter:  0x8876789976decbfcbbbe364623c63652db8c0904
 *   Permit2:          0x000000000022d473030f116ddee9f6b43ac78ba3
 */

import { encodeAbiParameters, encodeFunctionData, keccak256, formatUnits } from 'viem';

// ── Addresses ─────────────────────────────────────────────────────────────────
export const POOL_MANAGER = '0x8366a39cc670b4001a1121b8f6a443a643e40951' as `0x${string}`;
export const STATE_VIEW = '0xf3334192d15450cdd385c8b70e03f9a6bd9e673b' as `0x${string}`;
export const V4_QUOTER = '0x8dc178efb8111bb0973dd9d722ebeff267c98f94' as `0x${string}`;
export const UNIVERSAL_ROUTER = '0x8876789976decbfcbbbe364623c63652db8c0904' as `0x${string}`;
export const PERMIT2 = '0x000000000022d473030f116ddee9f6b43ac78ba3' as `0x${string}`;
// V3 (fallback)
export const UNISWAP_SWAP_ROUTER_02 = '0xcaf681a66d020601342297493863e78c959e5cb2' as `0x${string}`;
export const UNISWAP_UNIVERSAL_ROUTER = UNIVERSAL_ROUTER;
export const UNISWAP_QUOTER_V2 = '0x33e885eD0Ec9bF04EcfB19341582aADCb4c8A9E7' as `0x${string}`;
export const UNISWAP_FACTORY = '0x1f7d7550b1b028f7571e69a784071f0205fd2efa' as `0x${string}`;
export const WETH_ADDRESS = '0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73' as `0x${string}`;
export const USDG_ADDRESS = '0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168' as `0x${string}`;
export const POOL_MANAGER_ADDR = POOL_MANAGER; // alias

const NATIVE_ETH = '0x0000000000000000000000000000000000000000' as `0x${string}`;
const CHAIN_ID = 4663;
const SLIPPAGE_BPS = 100; // 1%

// ── V4 fee/tickSpacing candidates ─────────────────────────────────────────────
const V4_CANDIDATES = [
  { fee: 3000, tickSpacing: 60 },
  { fee: 10000, tickSpacing: 200 },
  { fee: 500, tickSpacing: 10 },
  { fee: 100, tickSpacing: 1 },
];

// ── ABIs ─────────────────────────────────────────────────────────────────────

const STATE_VIEW_ABI = [
  {
    name: 'getSlot0',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'poolId', type: 'bytes32' }],
    outputs: [
      { name: 'sqrtPriceX96', type: 'uint160' },
      { name: 'tick', type: 'int24' },
      { name: 'protocolFee', type: 'uint24' },
      { name: 'lpFee', type: 'uint24' },
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

const V3_FACTORY_ABI = [
  {
    name: 'getPool', type: 'function', stateMutability: 'view',
    inputs: [
      { name: 'tokenA', type: 'address' },
      { name: 'tokenB', type: 'address' },
      { name: 'fee', type: 'uint24' },
    ],
    outputs: [{ name: '', type: 'address' }]
  },
] as const;

const V3_QUOTER_ABI = [
  {
    name: 'quoteExactInputSingle', type: 'function', stateMutability: 'nonpayable',
    inputs: [{
      name: 'params', type: 'tuple', components: [
        { name: 'tokenIn', type: 'address' },
        { name: 'tokenOut', type: 'address' },
        { name: 'amountIn', type: 'uint256' },
        { name: 'fee', type: 'uint24' },
        { name: 'sqrtPriceLimitX96', type: 'uint160' },
      ]
    }],
    outputs: [
      { name: 'amountOut', type: 'uint256' },
      { name: 'sqrtPriceX96After', type: 'uint160' },
      { name: 'initializedTicksCrossed', type: 'uint32' },
      { name: 'gasEstimate', type: 'uint256' },
    ]
  },
] as const;

const V3_ROUTER_ABI = [
  {
    name: 'exactInputSingle', type: 'function', stateMutability: 'payable',
    inputs: [{
      name: 'params', type: 'tuple', components: [
        { name: 'tokenIn', type: 'address' },
        { name: 'tokenOut', type: 'address' },
        { name: 'fee', type: 'uint24' },
        { name: 'recipient', type: 'address' },
        { name: 'amountIn', type: 'uint256' },
        { name: 'amountOutMinimum', type: 'uint256' },
        { name: 'sqrtPriceLimitX96', type: 'uint160' },
      ]
    }],
    outputs: [{ name: 'amountOut', type: 'uint256' }]
  },
] as const;

// ── PoolId ────────────────────────────────────────────────────────────────────
function poolId(
  token: `0x${string}`,
  fee: number,
  tickSpacing: number,
): `0x${string}` {
  return keccak256(
    encodeAbiParameters(
      [
        { type: 'address' }, // currency0 = ETH (address(0))
        { type: 'address' }, // currency1 = token
        { type: 'uint24' }, // fee
        { type: 'int24' }, // tickSpacing
        { type: 'address' }, // hooks = address(0)
      ],
      [NATIVE_ETH, token, fee, tickSpacing, NATIVE_ETH],
    ),
  );
}

// ── Spot price from sqrtPriceX96 ─────────────────────────────────────────────
// Pool: currency0=ETH (addr 0), currency1=token
// sqrtPriceX96 = sqrt(token/ETH) * 2^96
// tokenOut = ethIn * sqrtPriceX96^2 / 2^192
function spotAmountOut(sqrtPriceX96: bigint, ethAmountWei: bigint): bigint {
  if (sqrtPriceX96 === 0n) return 0n;
  return (ethAmountWei * sqrtPriceX96 * sqrtPriceX96) / (2n ** 192n);
}

// ── Public quote type ─────────────────────────────────────────────────────────
export interface UniswapQuote {
  amountIn: bigint;
  amountOut: bigint;
  amountOutMin: bigint;
  amountOutFormatted: string;
  tokenOut: `0x${string}`;
  fee: number;
  tickSpacing: number;
  hooks: `0x${string}`;
  isV4: boolean;
  // Populated by fetchFirmQuote — ready-to-use swap calldata
  swapTo: `0x${string}`;
  swapData: `0x${string}`;
  swapValue: bigint;
  // Internal — raw API quote for /swap call
  _apiQuoteObj: unknown;
  _routing: string;
  // Legacy compat
  wethUsdgFee: number;
  usdgTokenFee: number;
  path: `0x${string}`;
}

// ── Price quote (UI preview) ──────────────────────────────────────────────────
export async function fetchUniswapQuote(
  tokenAddress: `0x${string}`,
  ethAmountWei: bigint,
): Promise<UniswapQuote | null> {
  // 1. Trading API (if key available)
  const apiQuote = await tryTradingApiQuote(tokenAddress, ethAmountWei, null);
  if (apiQuote) return apiQuote;

  // 2. V4 StateView on-chain
  const v4Quote = await tryV4Quote(tokenAddress, ethAmountWei);
  if (v4Quote) return v4Quote;

  // 3. V3 fallback
  return tryV3Quote(tokenAddress, ethAmountWei);
}

// ── Firm quote (includes swap calldata for execution) ─────────────────────────
export async function fetchFirmQuote(
  tokenAddress: `0x${string}`,
  ethAmountWei: bigint,
  swapper: `0x${string}`,
  exactOutputWei?: bigint, // if set, use EXACT_OUTPUT (preferred)
): Promise<UniswapQuote | null> {
  // 1. Trading API with /quote then /swap
  const apiQuote = await tryTradingApiQuote(tokenAddress, ethAmountWei, swapper, exactOutputWei);
  if (apiQuote) {
    const withCalldata = await attachSwapCalldata(apiQuote);
    if (withCalldata) return withCalldata;
  }

  // 2. V4 on-chain quote + build calldata ourselves
  const v4Quote = await tryV4Quote(tokenAddress, ethAmountWei);
  if (v4Quote) return v4Quote;

  // 3. V3 fallback
  return tryV3Quote(tokenAddress, ethAmountWei);
}

// ── Trading API /quote ────────────────────────────────────────────────────────
async function tryTradingApiQuote(
  tokenAddress: `0x${string}`,
  ethAmountWei: bigint,
  swapper: `0x${string}` | null,
  exactOutputWei?: bigint, // if provided, use EXACT_OUTPUT
): Promise<UniswapQuote | null> {
  try {
    const effectiveSwapper = swapper ?? NATIVE_ETH;
    const isExactOutput = exactOutputWei !== undefined && exactOutputWei > 0n;

    const res = await fetch('/api/swap/quote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tokenIn: NATIVE_ETH,
        tokenOut: tokenAddress,
        tokenInChainId: CHAIN_ID,
        tokenOutChainId: CHAIN_ID,
        amount: isExactOutput
          ? exactOutputWei!.toString()  // exact token output desired
          : ethAmountWei.toString(),    // ETH input (EXACT_INPUT)
        type: isExactOutput ? 'EXACT_OUTPUT' : 'EXACT_INPUT',
        swapper: effectiveSwapper,
        slippageTolerance: SLIPPAGE_BPS / 100,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.warn('[swap] Trading API /quote error:', res.status, err);
      return null;
    }

    const data = await res.json() as {
      quote: {
        input: { amount: string };
        output: { amount: string; minimumAmount?: string };
      };
      routing: string;
      permitData: unknown;
    };

    const amountOut = BigInt(data.quote.output.amount);
    // For EXACT_OUTPUT: API returns the required ETH input in quote.input.amount
    const actualEthIn = isExactOutput ? BigInt(data.quote.input.amount) : ethAmountWei;
    const amountOutMin = data.quote.output.minimumAmount
      ? BigInt(data.quote.output.minimumAmount)
      : isExactOutput
        ? BigInt(exactOutputWei!) // exact output — we want exactly this
        : (amountOut * BigInt(10000 - SLIPPAGE_BPS)) / 10000n;

    console.log('[swap] Trading API | routing=', data.routing,
      '| type=', isExactOutput ? 'EXACT_OUTPUT' : 'EXACT_INPUT',
      '| ethIn=', actualEthIn.toString(),
      '| out=', amountOut.toString());

    return {
      amountIn: actualEthIn, amountOut, amountOutMin,
      amountOutFormatted: fmt(amountOut),
      tokenOut: tokenAddress, fee: 3000, tickSpacing: 60,
      hooks: NATIVE_ETH, isV4: true,
      swapTo: UNIVERSAL_ROUTER, swapData: '0x', swapValue: actualEthIn,
      _apiQuoteObj: data, _routing: data.routing,
      wethUsdgFee: 3000, usdgTokenFee: 3000, path: '0x',
    };
  } catch (err) {
    console.warn('[swap] Trading API error:', err);
    return null;
  }
}

// ── Trading API /swap (attach calldata to an existing quote) ──────────────────
async function attachSwapCalldata(quote: UniswapQuote): Promise<UniswapQuote | null> {
  if (!quote._apiQuoteObj) return null;
  const data = quote._apiQuoteObj as { quote: unknown; permitData: unknown; routing: string };

  try {
    const res = await fetch('/api/swap/exec', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        quote: data.quote,
        // permitData only needed for ERC-20 input; native ETH swaps usually have no permit
        ...(data.permitData ? { permitData: data.permitData } : {}),
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.warn('[swap] /swap error:', res.status, err);
      return null;
    }

    const swapData = await res.json() as { swap: { to: string; data: string; value: string } };
    return {
      ...quote,
      swapTo: swapData.swap.to as `0x${string}`,
      swapData: swapData.swap.data as `0x${string}`,
      swapValue: BigInt(swapData.swap.value ?? quote.amountIn.toString()),
    };
  } catch (err) {
    console.warn('[swap] /swap attach error:', err);
    return null;
  }
}

// ── V4 StateView on-chain quote ───────────────────────────────────────────────
async function tryV4Quote(
  tokenAddress: `0x${string}`,
  ethAmountWei: bigint,
): Promise<UniswapQuote | null> {
  try {
    const { getPublicClient } = await import('wagmi/actions');
    const { wagmiConfig } = await import('@/lib/wagmi-config');
    const client = getPublicClient(wagmiConfig);
    if (!client) return null;

    for (const { fee, tickSpacing } of V4_CANDIDATES) {
      try {
        const pid = poolId(tokenAddress, fee, tickSpacing);

        const slot0 = await client.readContract({
          address: STATE_VIEW,
          abi: STATE_VIEW_ABI,
          functionName: 'getSlot0',
          args: [pid],
        }) as readonly [bigint, number, number, number];

        const sqrtPriceX96 = slot0[0];
        if (sqrtPriceX96 === 0n) continue;

        const amountOut = spotAmountOut(sqrtPriceX96, ethAmountWei);
        if (amountOut === 0n) continue;

        const amountOutMin = (amountOut * BigInt(10000 - SLIPPAGE_BPS)) / 10000n;

        console.log('[swap] V4 StateView | fee=', fee, 'tick=', tickSpacing,
          '| sqrtP=', sqrtPriceX96.toString(), '| out=', amountOut.toString());

        return {
          amountIn: ethAmountWei, amountOut, amountOutMin,
          amountOutFormatted: fmt(amountOut),
          tokenOut: tokenAddress, fee, tickSpacing,
          hooks: NATIVE_ETH, isV4: true,
          swapTo: UNIVERSAL_ROUTER, swapData: '0x', swapValue: ethAmountWei,
          _apiQuoteObj: null, _routing: 'V4_STATEVIEW',
          wethUsdgFee: fee, usdgTokenFee: fee, path: pid,
        };
      } catch { continue; }
    }
    return null;
  } catch (err) {
    console.warn('[swap] V4 StateView error:', err);
    return null;
  }
}

// ── V3 fallback ───────────────────────────────────────────────────────────────
async function tryV3Quote(
  tokenAddress: `0x${string}`,
  ethAmountWei: bigint,
): Promise<UniswapQuote | null> {
  try {
    const { getPublicClient } = await import('wagmi/actions');
    const { wagmiConfig } = await import('@/lib/wagmi-config');
    const client = getPublicClient(wagmiConfig);
    if (!client) return null;

    const ZERO = '0x0000000000000000000000000000000000000000';
    for (const fee of [3000, 500, 10000]) {
      try {
        const pool = await client.readContract({
          address: UNISWAP_FACTORY, abi: V3_FACTORY_ABI,
          functionName: 'getPool', args: [WETH_ADDRESS, tokenAddress, fee],
        }) as string;
        if (!pool || pool === ZERO) continue;

        const result = await client.readContract({
          address: UNISWAP_QUOTER_V2, abi: V3_QUOTER_ABI,
          functionName: 'quoteExactInputSingle',
          args: [{ tokenIn: WETH_ADDRESS, tokenOut: tokenAddress, amountIn: ethAmountWei, fee, sqrtPriceLimitX96: 0n }],
        }) as [bigint, bigint, number, bigint];

        const amountOut = result[0];
        const amountOutMin = (amountOut * BigInt(10000 - SLIPPAGE_BPS)) / 10000n;
        console.warn('[swap] V3 fallback | fee=', fee, '| out=', amountOut.toString());

        return {
          amountIn: ethAmountWei, amountOut, amountOutMin,
          amountOutFormatted: fmt(amountOut),
          tokenOut: tokenAddress, fee, tickSpacing: 60,
          hooks: NATIVE_ETH, isV4: false,
          swapTo: UNISWAP_SWAP_ROUTER_02, swapData: '0x', swapValue: ethAmountWei,
          _apiQuoteObj: null, _routing: 'V3_FALLBACK',
          wethUsdgFee: fee, usdgTokenFee: fee, path: '0x',
        };
      } catch { continue; }
    }
    return null;
  } catch (err) {
    console.warn('[swap] V3 fallback error:', err);
    return null;
  }
}

// ── buildSwapCalldata ─────────────────────────────────────────────────────────
export function buildSwapCalldata(
  quote: UniswapQuote,
  recipient: `0x${string}`,
  deadlineSeconds = 300,
): { to: `0x${string}`; data: `0x${string}`; value: bigint } {
  // Trading API provided ready-to-use calldata
  if (quote.swapData && quote.swapData !== '0x' &&
    quote.swapTo !== '0x0000000000000000000000000000000000000000') {
    return { to: quote.swapTo, data: quote.swapData, value: quote.swapValue };
  }

  // V4 — build UniversalRouter V4_SWAP calldata
  if (quote.isV4) {
    return buildV4Calldata(quote, deadlineSeconds);
  }

  // V3 — SwapRouter02
  return buildV3Calldata(quote, recipient, deadlineSeconds);
}

// ── V4 UniversalRouter calldata ───────────────────────────────────────────────
// Command 0x10 = V4_SWAP (exactInputSingle, native ETH → token)
function buildV4Calldata(
  quote: UniswapQuote,
  deadlineSeconds: number,
): { to: `0x${string}`; data: `0x${string}`; value: bigint } {
  const deadline = BigInt(Math.floor(Date.now() / 1000) + deadlineSeconds);

  const swapInput = encodeAbiParameters(
    [{
      type: 'tuple',
      components: [
        {
          name: 'poolKey', type: 'tuple', components: [
            { name: 'currency0', type: 'address' },
            { name: 'currency1', type: 'address' },
            { name: 'fee', type: 'uint24' },
            { name: 'tickSpacing', type: 'int24' },
            { name: 'hooks', type: 'address' },
          ]
        },
        { name: 'zeroForOne', type: 'bool' },
        { name: 'amountIn', type: 'uint128' },
        { name: 'amountOutMinimum', type: 'uint128' },
        { name: 'hookData', type: 'bytes' },
      ],
    },
    { name: 'takeClaims', type: 'bool' },
    { name: 'settleUsingBurn', type: 'bool' },
    ],
    [{
      poolKey: {
        currency0: NATIVE_ETH,
        currency1: quote.tokenOut,
        fee: quote.fee,
        tickSpacing: quote.tickSpacing,
        hooks: quote.hooks,
      },
      zeroForOne: true,
      amountIn: quote.amountIn,
      amountOutMinimum: quote.amountOutMin,
      hookData: '0x' as `0x${string}`,
    },
      false, // takeClaims
      false, // settleUsingBurn
    ],
  );

  const data = encodeFunctionData({
    abi: UNIVERSAL_ROUTER_ABI,
    functionName: 'execute',
    args: ['0x10' as `0x${string}`, [swapInput], deadline],
  });

  return { to: UNIVERSAL_ROUTER, data, value: quote.amountIn };
}

// ── V3 calldata ───────────────────────────────────────────────────────────────
function buildV3Calldata(
  quote: UniswapQuote,
  recipient: `0x${string}`,
  deadlineSeconds: number,
): { to: `0x${string}`; data: `0x${string}`; value: bigint } {
  const deadline = BigInt(Math.floor(Date.now() / 1000) + deadlineSeconds);
  const data = encodeFunctionData({
    abi: V3_ROUTER_ABI, functionName: 'exactInputSingle',
    args: [{
      tokenIn: WETH_ADDRESS, tokenOut: quote.tokenOut, fee: quote.fee,
      recipient, amountIn: quote.amountIn,
      amountOutMinimum: quote.amountOutMin, sqrtPriceLimitX96: 0n,
    }],
  });
  void deadline;
  return { to: UNISWAP_SWAP_ROUTER_02, data, value: quote.amountIn };
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(amount: bigint): string {
  return Number(formatUnits(amount, 18)).toPrecision(6).replace(/\.?0+$/, '');
}

// ── Deprecated ────────────────────────────────────────────────────────────────
export async function quoteEthForUsdg(_: bigint): Promise<bigint | null> { return null; }
