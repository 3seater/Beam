import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
const client = vi.hoisted(() => ({ getLogs: vi.fn().mockRejectedValue(new Error('RPC unavailable')), readContract: vi.fn().mockResolvedValue({ claimed: false, amount: 1n }) }));
vi.mock('wagmi', () => ({ usePublicClient: () => client, useWriteContract: () => ({ writeContractAsync: vi.fn() }), useSignMessage: () => ({ signMessageAsync: vi.fn() }) }));
vi.mock('@/lib/robinhood-tokens', () => ({ fetchRobinhoodTokens: async () => [], stockLogoUrl: () => '' }));
import { SentBeams } from '../SentBeams';
it('shows server history after local storage is cleared even when RPC history fails, and clears it on wallet switch', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  localStorage.clear();
  const wallet = '0x1111111111111111111111111111111111111111';
  vi.stubGlobal('fetch', vi.fn(async (url: string) => ({ ok: true, json: async () => ({ entries: url.includes(wallet) ? [{ depositId: '123', walletAddress: wallet, tokenSymbol: 'AI', usdAmount: 5, createdAt: Date.now() }] : [] }) })));
  const host = document.createElement('div'); document.body.appendChild(host);
  const root = createRoot(host);
  try {
    await act(async () => { root.render(<SentBeams walletAddress={wallet} />); });
    expect(host.textContent).toContain('AI');
    expect(host.textContent).toContain('Restore my links');
    expect(host.querySelector('[aria-label="Copy Beam link"]')).toBeNull();
    await act(async () => { root.render(<SentBeams walletAddress="0x2222222222222222222222222222222222222222" />); });
    expect(host.textContent).not.toContain('Restore my links');
    expect(host.textContent).toContain('No saved Beams');
  } finally { await act(async () => root.unmount()); host.remove(); vi.unstubAllGlobals(); }
});
