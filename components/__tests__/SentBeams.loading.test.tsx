import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ getLogs: vi.fn(), readContract: vi.fn() }));
vi.mock('wagmi', () => ({ usePublicClient: () => mocks, useWriteContract: () => ({}), useSignMessage: () => ({}) }));
vi.mock('@/lib/robinhood-tokens', () => ({ fetchRobinhoodTokens: async () => [], stockLogoUrl: () => '' }));
import { SentBeams } from '../SentBeams';
import { cacheBeamStatus } from '@/lib/beam-status-cache';
import { BEAM_ESCROW_ADDRESS } from '@/lib/constants';

it('renders database rows and cached status while chain requests remain unresolved', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  localStorage.clear();
  cacheBeamStatus(BEAM_ESCROW_ADDRESS, '91', 'claimed');
  mocks.getLogs.mockImplementation(() => new Promise(() => {}));
  mocks.readContract.mockImplementation(() => new Promise(() => {}));
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ entries: [{ depositId: '91', tokenSymbol: 'ETH', usdAmount: 12, createdAt: Date.now() }] }) })));
  const host = document.createElement('div');
  const root = createRoot(host);
  try {
    await act(async () => root.render(<SentBeams walletAddress="0x1111111111111111111111111111111111111191" />));
    expect(host.textContent).toContain('$12');
    expect(host.textContent).toContain('Claimed');
    expect(host.querySelector('[aria-label="Loading Beam status"]')).toBeNull();
  } finally {
    await act(async () => root.unmount());
    localStorage.clear();
    vi.unstubAllGlobals();
  }
});
