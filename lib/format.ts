// lib/format.ts

export function truncateAddress(address: `0x${string}`): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * formatTokenAmount — context-aware rounding for token quantities.
 *
 * Precision tiers (keeps numbers short enough for modals/chips):
 *   ≥ 1 000     →  0 decimals   e.g.  1 234
 *   ≥ 1         →  2 decimals   e.g.  12.34
 *   ≥ 0.01      →  4 decimals   e.g.   0.0261
 *   < 0.01      →  4 sig figs   e.g.   0.000261
 */
export function formatTokenAmount(amount: bigint, decimals: number): string {
  const value = Number(amount) / 10 ** decimals;
  return formatTokenValue(value);
}

/**
 * Shared rounding logic — accepts a plain number.
 * Used by both formatTokenAmount and the uniswap-swap fmt helper.
 */
export function formatTokenValue(value: number): string {
  if (!isFinite(value) || value === 0) return '0';

  const abs = Math.abs(value);

  let formatted: string;
  if (abs >= 1_000) {
    formatted = abs.toLocaleString('en-US', { maximumFractionDigits: 0 });
  } else if (abs >= 1) {
    formatted = abs.toFixed(2);
  } else if (abs >= 0.01) {
    formatted = abs.toFixed(4);
  } else {
    // 4 significant figures for very small values
    formatted = abs.toPrecision(4);
  }

  // Strip trailing zeros after decimal point
  if (formatted.includes('.')) {
    formatted = formatted.replace(/\.?0+$/, '');
  }

  return value < 0 ? `-${formatted}` : formatted;
}

/**
 * formatUsd — formats a USD value for display.
 *   ≥ 1 000     →  $1,234
 *   ≥ 1         →  $12.34
 *   ≥ 0.01      →  $0.03
 *   < 0.01      →  <$0.01
 */
export function formatUsd(value: number): string {
  if (!isFinite(value) || value < 0) return '—';
  if (value < 0.01) return '<$0.01';
  if (value >= 1_000) {
    return '$' + value.toLocaleString('en-US', { maximumFractionDigits: 0 });
  }
  return '$' + value.toFixed(2);
}
