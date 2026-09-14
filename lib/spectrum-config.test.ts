// @vitest-environment node
import { afterEach, expect, it, vi } from 'vitest';
import { zeroAddress } from 'viem';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

it('enables the deployed contract when hosting omits the public address', async () => {
  vi.stubEnv('NEXT_PUBLIC_SPECTRUM_ESCROW_ADDRESS', undefined);
  vi.resetModules();
  const config = await import('./spectrum');
  expect(config.SPECTRUM_ESCROW_ADDRESS).toBe('0x191618ac8bb752039ee4586cf7aed9a4ff18b234');
  expect(config.spectrumConfigured).toBe(true);
});

it.each([zeroAddress, '', 'invalid'])('keeps an explicit disabled or invalid override closed: %s', async address => {
  vi.stubEnv('NEXT_PUBLIC_SPECTRUM_ESCROW_ADDRESS', address);
  vi.resetModules();
  expect((await import('./spectrum')).spectrumConfigured).toBe(false);
});

it('uses an explicit deployment override for sends and claims', async () => {
  const address = '0x1111111111111111111111111111111111111111';
  vi.stubEnv('NEXT_PUBLIC_SPECTRUM_ESCROW_ADDRESS', address);
  vi.resetModules();
  const config = await import('./spectrum');
  expect(config.SPECTRUM_ESCROW_ADDRESS).toBe(address);
  expect(config.spectrumConfigured).toBe(true);
});
