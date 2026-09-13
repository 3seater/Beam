import { formatUnits } from 'viem';
import { formatTokenValue } from '@/lib/format';

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
  signal?: AbortSignal,
): Promise<UniswapQuote | null> {
  // Slot0 is a spot price, not a liquidity-aware executable quote.
  return tryTradingApiQuote(tokenAddress, ethAmountWei, null, undefined, signal);
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

  return null;
}

// ── Trading API /quote ────────────────────────────────────────────────────────
async function tryTradingApiQuote(
  tokenAddress: `0x${string}`,
  ethAmountWei: bigint,
  swapper: `0x${string}` | null,
  exactOutputWei?: bigint, // if provided, use EXACT_OUTPUT
  signal?: AbortSignal,
): Promise<UniswapQuote | null> {
  try {
    const effectiveSwapper = swapper ?? NATIVE_ETH;
    const isExactOutput = exactOutputWei !== undefined && exactOutputWei > 0n;

    const res = await fetch('/api/swap/quote', {
      signal,
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

// Only execute calldata obtained from the live Trading API.
export function buildSwapCalldata(quote: UniswapQuote, recipient: `0x${string}`) {
  void recipient;
  if (!quote.swapData || quote.swapData === '0x' || quote.swapValue <= 0n || quote.swapValue > quote.amountIn || quote.swapTo.toLowerCase() !== UNIVERSAL_ROUTER.toLowerCase()) throw new Error('Invalid or unavailable swap transaction. Request a new quote.');
  return { to: quote.swapTo, data: quote.swapData, value: quote.swapValue };
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(amount: bigint): string {
  return formatTokenValue(Number(formatUnits(amount, 18)));
}

// ── Deprecated ────────────────────────────────────────────────────────────────
export async function quoteEthForUsdg(_: bigint): Promise<bigint | null> { void _; return null; }
