/**
 * lib/0x-swap.ts
 *
 * Client-side helpers for the 0x Swap API v2 (AllowanceHolder flow).
 * All requests are proxied through /api/swap/* to keep the API key
 * server-side and avoid CORS issues.
 *
 * Flow for "send stock token using ETH":
 *   1. fetchSwapPrice()  → indicative quote, no commitment
 *   2. fetchSwapQuote()  → firm quote + executable transaction calldata
 *   3. Execute the swap transaction (ETH → token lands in wallet)
 *   4. Approve BeamEscrow to spend the received token
 *   5. Call BeamEscrow.depositToken()
 */

import { formatUnits } from 'viem';
import { formatTokenValue } from '@/lib/format';

// Native ETH sentinel used by 0x
export const ZERO_EX_NATIVE_ETH = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';

export interface ZeroExFee {
  amount: string;       // token units
  token: string;        // fee token address
  type: 'volume' | 'gas' | string;
}

export interface SwapRoute {
  fills: Array<{
    from: string;
    to: string;
    source: string;
    proportionBps: string;
  }>;
}

export interface SwapPrice {
  sellAmount: string;   // wei
  buyAmount: string;   // token units (18 dp for stock tokens)
  minBuyAmount: string;   // after slippage
  sellToken: string;
  buyToken: string;
  fees: {
    zeroExFee: ZeroExFee | null;
    integratorFee: ZeroExFee | null;
    gasFee: ZeroExFee | null;
  };
  route: SwapRoute;
  totalNetworkFee: string;   // ETH wei
  liquidityAvailable: boolean;
  // Convenience fields computed here
  buyAmountFormatted: string; // human-readable e.g. "0.0741"
  priceImpactBps: number; // estimated impact in bps
}

export interface SwapQuote extends SwapPrice {
  allowanceTarget: string;
  transaction: {
    to: string;
    data: string;
    value: string;
    gas: string;
    gasPrice: string;
  };
}

/**
 * Get an indicative price for swapping ETH → buyToken.
 * @param buyTokenAddress  ERC-20 address of the stock token to buy
 * @param sellAmountWei    ETH amount to spend (in wei, as string)
 * @param takerAddress     User's wallet address
 */
export async function fetchSwapPrice(
  buyTokenAddress: string,
  sellAmountWei: string,
  takerAddress: string,
): Promise<SwapPrice | null> {
  try {
    const params = new URLSearchParams({
      type: 'price',
      sellToken: ZERO_EX_NATIVE_ETH,
      buyToken: buyTokenAddress,
      sellAmount: sellAmountWei,
      taker: takerAddress,
    });

    const res = await fetch(`/api/swap/quote?${params}`);
    const data = await res.json();

    if (!res.ok) {
      console.warn('[0x price] error:', res.status, data);
      return null;
    }
    if (!data.buyAmount) {
      console.warn('[0x price] no buyAmount in response:', data);
      return null;
    }

    return normalisePrice(data);
  } catch (e) {
    console.warn('[0x price] fetch failed:', e);
    return null;
  }
}

/**
 * Get a firm, executable quote for swapping ETH → buyToken.
 * Returns full transaction calldata ready to submit.
 */
export async function fetchSwapQuote(
  buyTokenAddress: string,
  sellAmountWei: string,
  takerAddress: string,
): Promise<SwapQuote | null> {
  try {
    const params = new URLSearchParams({
      type: 'quote',
      sellToken: ZERO_EX_NATIVE_ETH,
      buyToken: buyTokenAddress,
      sellAmount: sellAmountWei,
      taker: takerAddress,
    });

    const res = await fetch(`/api/swap/quote?${params}`);
    if (!res.ok) return null;

    const data = await res.json();
    if (!data.transaction) return null;

    return { ...normalisePrice(data), allowanceTarget: data.allowanceTarget, transaction: data.transaction };
  } catch {
    return null;
  }
}

function normalisePrice(data: Record<string, unknown>): SwapPrice {
  const buyAmount = String(data.buyAmount ?? '0');
  const sellAmount = String(data.sellAmount ?? '0');

  // Stock tokens are always 18 decimals on Robinhood Chain
  const buyAmountFormatted = formatUnits(BigInt(buyAmount), 18);

  // Very rough price impact estimate from minBuyAmount vs buyAmount
  const minBuy = BigInt(String(data.minBuyAmount ?? buyAmount));
  const buy = BigInt(buyAmount);
  const priceImpactBps = buy > 0n
    ? Number(((buy - minBuy) * 10000n) / buy)
    : 0;

  return {
    sellAmount,
    buyAmount,
    minBuyAmount: String(data.minBuyAmount ?? buyAmount),
    sellToken: String(data.sellToken ?? ''),
    buyToken: String(data.buyToken ?? ''),
    fees: (data.fees as SwapPrice['fees']) ?? { zeroExFee: null, integratorFee: null, gasFee: null },
    route: (data.route as SwapRoute) ?? { fills: [] },
    totalNetworkFee: String(data.totalNetworkFee ?? '0'),
    liquidityAvailable: Boolean(data.liquidityAvailable ?? true),
    buyAmountFormatted: formatTokenValue(Number(buyAmountFormatted)),
    priceImpactBps,
  };
}
