// @vitest-environment node
import { beforeEach, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
const mocks = vi.hoisted(() => ({ getBytecode: vi.fn(), quote: vi.fn() }));
vi.mock('viem', async original => ({ ...await original<typeof import('viem')>(), createPublicClient: () => ({ getBytecode: mocks.getBytecode }) }));
vi.mock('@/lib/spectrum', async original => ({ ...await original<typeof import('@/lib/spectrum')>(), spectrumConfigured: true, SPECTRUM_ESCROW_ADDRESS: '0x3333333333333333333333333333333333333333' }));
vi.mock('@/lib/enso-bundle', async original => ({ ...await original<typeof import('@/lib/enso-bundle')>(), requestEnsoBundle: mocks.quote }));
import { POST } from './route';
const params = { presetId: 'top-memes', sender: '0x1111111111111111111111111111111111111111', signer: '0x2222222222222222222222222222222222222222', amountIn: '10000000000000000' };
const request = (body: unknown) => new NextRequest('http://localhost/api/spectrum/quote', { method: 'POST', body: JSON.stringify(body) });
beforeEach(() => { vi.clearAllMocks(); mocks.getBytecode.mockResolvedValue('0x1234'); });
it('rejects arbitrary presets and malformed amounts before calling Enso', async () => {
  expect((await POST(request({ ...params, presetId: 'custom' }))).status).toBe(400);
  expect((await POST(request({ ...params, amountIn: '-1' }))).status).toBe(400);
  expect(mocks.quote).not.toHaveBeenCalled();
});
it('rejects a missing onchain escrow', async () => {
  mocks.getBytecode.mockResolvedValue('0x');
  expect((await POST(request(params))).status).toBe(502);
  expect(mocks.quote).not.toHaveBeenCalled();
});
it('rejects a quote that exceeds the fixed input budget', async () => {
  mocks.quote.mockResolvedValue({ tx: { value: '10000000000000001' } });
  expect((await POST(request(params))).status).toBe(502);
});
it('returns a short-lived transaction without caching or exposing the API key', async () => {
  mocks.quote.mockResolvedValue({ tx: { value: params.amountIn, to: params.sender, data: '0x1234' } });
  const response = await POST(request(params));
  expect(response.status).toBe(200); expect(response.headers.get('cache-control')).toBe('no-store');
  const body = await response.json(); expect(body.expiresAt).toBeGreaterThan(Date.now()); expect(body.apiKey).toBeUndefined();
});
