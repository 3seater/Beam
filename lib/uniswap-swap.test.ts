import { afterEach, expect, it, vi } from 'vitest';
import { fetchFirmQuote, fetchUniswapQuote } from './uniswap-swap';
const token = '0x1111111111111111111111111111111111111111' as const;
const wallet = '0x2222222222222222222222222222222222222222' as const;
afterEach(() => vi.unstubAllGlobals());
it('does not invent a spot-price quote when the API fails', async () => {
  const fetch = vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({ error: 'unavailable' }) });
  vi.stubGlobal('fetch', fetch);
  expect(await fetchFirmQuote(token, 2000000000000000n, wallet)).toBeNull();
  expect(await fetchUniswapQuote(token, 2000000000000000n)).toBeNull();
  expect(fetch).toHaveBeenCalledTimes(2);
});
it('requires executable calldata before returning a firm quote', async () => {
  const fetch = vi.fn().mockResolvedValueOnce({ ok: true, json: async () => ({ quote: { input: { amount: '100' }, output: { amount: '200' } }, routing: 'CLASSIC' }) }).mockResolvedValueOnce({ ok: false, status: 502, json: async () => ({}) });
  vi.stubGlobal('fetch', fetch);
  expect(await fetchFirmQuote(token, 100n, wallet)).toBeNull();
  expect(fetch).toHaveBeenCalledTimes(2);
});
