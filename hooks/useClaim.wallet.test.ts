import { expect, it, vi } from 'vitest';
vi.mock('@privy-io/react-auth', () => ({ usePrivy: vi.fn() }));
import { waitForEmbeddedWallet } from './useClaim';
import type { usePrivy } from '@privy-io/react-auth';
it('observes refreshed Privy state while a new recipient wallet is provisioned', async () => {
  vi.useFakeTimers();
  let current = { user: null } as ReturnType<typeof usePrivy>;
  const promise = waitForEmbeddedWallet(() => current);
  current = { user: { linkedAccounts: [{ type: 'wallet', walletClientType: 'privy', address: '0x1111111111111111111111111111111111111111' }] } } as unknown as ReturnType<typeof usePrivy>;
  await vi.advanceTimersByTimeAsync(500);
  expect(await promise).toBe('0x1111111111111111111111111111111111111111');
  vi.useRealTimers();
});
