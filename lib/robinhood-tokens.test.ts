import { afterEach, describe, expect, it, vi } from 'vitest';
import { clearTokenCache, fetchRobinhoodTokens, STARTER_ASSETS } from './robinhood-tokens';
import snapshot from './rh-assets-snapshot.json';

afterEach(() => { clearTokenCache(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe('Robinhood token catalog', () => {
  it('preserves every active chain 4663 stock in the audited fallback', () => {
    const official = snapshot.assets.filter((a) => a.status === 'ASSET_STATUS_ACTIVE' && a.deployments.some((d) => d.chainId === 4663));
    expect(STARTER_ASSETS.filter((a) => a.isStock)).toHaveLength(official.length);
    expect(STARTER_ASSETS.find((a) => a.symbol === 'AEHR')?.address).toBe('0x5F604fBA1162193A4388A5DFa56F556f3E133cC2');
  });

  it('retries after failure instead of permanently caching fallback results', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const fetchMock = vi.fn().mockRejectedValueOnce(new Error('Unavailable')).mockResolvedValueOnce({ ok: true, json: async () => snapshot });
    vi.stubGlobal('fetch', fetchMock);
    expect((await fetchRobinhoodTokens()).some((a) => a.symbol === 'AEHR')).toBe(true);
    await fetchRobinhoodTokens();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('uses official decimals and excludes deployments on other chains', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ assets: [
      { ...snapshot.assets[0], tokenSymbol: 'TEST', tokenDecimals: 6 },
      { ...snapshot.assets[0], tokenSymbol: 'OTHER', deployments: [{ chainId: 1, contractAddress: snapshot.assets[0].deployments[0].contractAddress }] },
    ] }) }));
    const tokens = await fetchRobinhoodTokens();
    expect(tokens.find((a) => a.symbol === 'TEST')?.decimals).toBe(6);
    expect(tokens.some((a) => a.symbol === 'OTHER')).toBe(false);
  });
});
