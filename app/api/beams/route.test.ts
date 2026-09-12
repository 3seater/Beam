// @vitest-environment node
import { expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
const mocks = vi.hoisted(() => ({ verifyMessage: vi.fn(), readContract: vi.fn() }));
vi.mock('viem', async importOriginal => ({ ...await importOriginal<typeof import('viem')>(), createPublicClient: () => mocks }));
vi.mock('@/lib/beam-store', () => ({ getBeamLinksForWallet: async () => [{ depositId: '1', walletAddress: '0x1111111111111111111111111111111111111111', tokenSymbol: 'ETH', usdAmount: 5, createdAt: 1, beamLink: 'https://example.invalid/claim#key=private&id=1' }], saveBeamLink: vi.fn() }));
import { GET } from './route';
const url = 'http://localhost:3000/api/beams?wallet=0x1111111111111111111111111111111111111111';
it('returns history but never a claim secret without wallet verification', async () => {
  const response = await GET(new NextRequest(url));
  const body = await response.json();
  expect(body.entries).toHaveLength(1);
  expect(body.entries[0].beamLink).toBeUndefined();
  expect(response.headers.get('cache-control')).toBe('no-store');
});
it('rejects expired recovery signatures', async () => {
  const response = await GET(new NextRequest(url, { headers: { 'x-beam-signature': '0x1234', 'x-beam-timestamp': '1' } }));
  expect(response.status).toBe(401);
});
it('only returns links after the requested wallet verifies', async () => {
  mocks.verifyMessage.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
  const request = () => new NextRequest(url, { headers: { 'x-beam-signature': '0x1234', 'x-beam-timestamp': String(Date.now()) } });
  expect((await GET(request())).status).toBe(401);
  expect((await (await GET(request())).json()).entries[0].beamLink).toContain('#key=');
});
