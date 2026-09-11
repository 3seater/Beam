// lib/format.ts

export function truncateAddress(address: `0x${string}`): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
  // "0x1234...abcd"
}

export function formatTokenAmount(
  amount: bigint,
  decimals: number,
): string {
  const value = Number(amount) / 10 ** decimals;
  // Show up to 6 significant figures, remove trailing zeros
  return value.toPrecision(6).replace(/\.?0+$/, '');
}
