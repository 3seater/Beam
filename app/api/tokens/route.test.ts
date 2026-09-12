// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GET } from './route';

afterEach(() => vi.unstubAllGlobals());

describe('token list proxy', () => {
  it('returns the upstream assets with a bounded server cache', async () => {
    const data = { assets: [{ tokenSymbol: 'EXAMPLE', deployments: [] }] };
    const fetchMock = vi.fn().mockResolvedValue(Response.json(data));
    vi.stubGlobal('fetch', fetchMock);
    const response = await GET();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(data);
    expect(response.headers.get('Cache-Control')).toContain('s-maxage=300');
    expect(fetchMock).toHaveBeenCalledWith('https://api.robinhood.com/rhj/assets', expect.objectContaining({ signal: expect.any(AbortSignal) }));
  });

  it.each([
    () => Promise.resolve(new Response('Unavailable', { status: 503 })),
    () => Promise.resolve(Response.json({ unexpected: [] })),
    () => Promise.reject(new Error('Connection refused')),
  ])('returns a recoverable error when the upstream fails', async (fetchMock) => {
    vi.stubGlobal('fetch', vi.fn(fetchMock));
    const response = await GET();
    expect(response.status).toBe(502);
    expect(await response.json()).toHaveProperty('error');
  });
});
