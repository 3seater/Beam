// @vitest-environment node
import { expect, it } from 'vitest';
import { friendlyWalletError, isWalletRejection } from './wallet-error';

it('recognizes provider codes and nested viem rejections', () => {
  for (const error of [{ code: 4001 }, { code: '4001' }, { code: 'ACTION_REJECTED' }, { cause: { name: 'UserRejectedRequestError' } }]) {
    expect(isWalletRejection(error)).toBe(true);
    expect(friendlyWalletError(error, 'Failed')).toBe('Request cancelled. You can try again when you’re ready.');
  }
});
it('replaces the verbose MetaMask cancellation with a short message', () => {
  const error = new Error('User rejected the request. Request Arguments: chain: undefined (id: 4663) data: 0x1234567890\nDetails: MetaMask Tx Signature: User denied transaction signature. Version: viem@2.56.3');
  expect(friendlyWalletError(error, 'Failed')).toBe('Request cancelled. You can try again when you’re ready.');
});
it('hides raw transaction diagnostics while preserving application messages', () => {
  expect(friendlyWalletError(new Error('Execution failed\nRequest Arguments: data: 0x1234567890'), 'Please try again.')).toBe('Please try again.');
  expect(friendlyWalletError(new Error('Quote expired. Please try again.'), 'Failed')).toBe('Quote expired. Please try again.');
});
it('handles cyclic causes and unknown errors', () => {
  const error: { cause?: unknown } = {}; error.cause = error;
  expect(isWalletRejection(error)).toBe(false);
  expect(friendlyWalletError(error, 'Failed')).toBe('Failed');
});
