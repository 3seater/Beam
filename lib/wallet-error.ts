/** Wallet providers and viem can wrap a rejection in several cause objects. */
export function isWalletRejection(error: unknown): boolean {
  const seen = new Set<unknown>();
  let current = error;
  while (current && typeof current === 'object' && !seen.has(current)) {
    seen.add(current);
    const value = current as { code?: unknown; name?: unknown; message?: unknown; cause?: unknown };
    if (value.code === 4001 || value.code === '4001' || value.code === 'ACTION_REJECTED'
      || value.name === 'UserRejectedRequestError'
      || (typeof value.message === 'string' && /user rejected|user denied|rejected the request/i.test(value.message))) return true;
    current = value.cause;
  }
  return false;
}

export function friendlyWalletError(error: unknown, fallback: string): string {
  if (isWalletRejection(error)) return 'Request cancelled. You can try again when you’re ready.';
  const raw = error instanceof Error ? error.message : '';
  if (/insufficient funds/i.test(raw)) return 'Insufficient ETH to cover this transaction and gas fees.';
  if (/timed out|timeout/i.test(raw)) return 'Your wallet or network took too long to respond. Please try again.';
  // Preserve short application errors, but never display transaction arguments,
  // calldata, stack traces, or provider diagnostics in the send card.
  if (raw && raw.length <= 180 && !/[\r\n]|0x[0-9a-f]{8}|request arguments|details:|version:|rpc error/i.test(raw)) return raw;
  return fallback;
}
