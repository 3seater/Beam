// @vitest-environment node
import { beforeEach, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
const mocks = vi.hoisted(() => ({ quote: vi.fn() }));
vi.mock('@/lib/enso-bundle', async original => ({ ...await original<typeof import('@/lib/enso-bundle')>(), requestEnsoBundle: mocks.quote }));
import { POST } from './route';
import { SPECTRUM_PRESETS } from '@/lib/spectrum';
const request = (body: unknown) => new NextRequest('http://localhost/api/spectrum/estimate', { method: 'POST', body: JSON.stringify(body) });
beforeEach(() => vi.clearAllMocks());
it('quotes every weighted input and returns quantities without transaction calldata', async () => {
  mocks.quote.mockImplementation(async actions => ({ amountsOut: { [actions[0].args.tokenOut]: '12345' }, tx: { data: '0x1234' } }));
  const response = await POST(request({ presetId: 'top-memes', amountIn: '1000001' }));
  expect(response.status).toBe(200);
  expect(mocks.quote.mock.calls.map(([actions]) => actions[0].args.amountIn)).toEqual(['500000', '300000', '200001']);
  expect(mocks.quote.mock.calls.every(([actions]) => actions.length === 1 && actions[0].action === 'route')).toBe(true);
  const body = await response.json();
  expect(body.amounts).toEqual(Object.fromEntries(SPECTRUM_PRESETS[0].constituents.map(t => [t.address.toLowerCase(), '12345'])));
  expect(body.tx).toBeUndefined();
});
it('rejects invalid parameters before calling Enso', async () => {
  expect((await POST(request({ presetId: 'custom', amountIn: '1000' }))).status).toBe(400);
  expect(mocks.quote).not.toHaveBeenCalled();
});
it('does not invent quantities when a route omits its output', async () => {
  mocks.quote.mockResolvedValue({ amountsOut: {} });
  expect((await POST(request({ presetId: 'top-memes', amountIn: '1000001' }))).status).toBe(502);
});
