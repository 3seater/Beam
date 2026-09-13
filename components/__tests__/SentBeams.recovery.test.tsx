import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
const client = vi.hoisted(() => ({ getLogs: vi.fn().mockRejectedValue(new Error('RPC unavailable')), readContract: vi.fn().mockResolvedValue({ claimed: false, amount: 1n }) }));
vi.mock('wagmi', () => ({ usePublicClient: () => client, useWriteContract: () => ({ writeContractAsync: vi.fn() }), useSignMessage: () => ({ signMessageAsync: vi.fn().mockResolvedValue('0x1234') }) }));
vi.mock('@/lib/robinhood-tokens', () => ({ fetchRobinhoodTokens: async () => [], stockLogoUrl: () => '' }));
import { SentBeams } from '../SentBeams';
it('automatically recovers an initial status failure without a Refresh click', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.useFakeTimers();
  localStorage.clear();
  const wallet = '0x3333333333333333333333333333333333333333';
  client.readContract.mockRejectedValue(new Error('RPC temporarily busy'));
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ entries: [{ depositId: '999', walletAddress: wallet, tokenSymbol: 'ETH', usdAmount: 5, createdAt: Date.now() }] }) })));
  const host = document.createElement('div'); document.body.appendChild(host);
  const root = createRoot(host);
  try {
    await act(async () => { root.render(<SentBeams walletAddress={wallet} />); });
    expect(host.textContent).not.toContain('Status unavailable');
    expect(host.querySelector('[aria-label="Loading Beam status"]')).not.toBeNull();
    client.readContract.mockResolvedValue({ claimed: false, amount: 1n });
    await act(async () => { await vi.advanceTimersByTimeAsync(800); });
    expect(host.textContent).toContain('Pending');
    expect(host.textContent).not.toContain('Status unavailable');
  } finally {
    await act(async () => root.unmount()); host.remove();
    client.readContract.mockResolvedValue({ claimed: false, amount: 1n });
    vi.useRealTimers(); vi.unstubAllGlobals();
  }
});
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

it('explains an absent backup after successful wallet verification', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  localStorage.clear();
  const wallet = '0x1111111111111111111111111111111111111111';
  vi.stubGlobal('fetch', vi.fn(async (_url: string, options?: RequestInit) => ({ ok: true, json: async () => ({ entries: options?.headers ? [] : [{ depositId: '123', walletAddress: wallet, tokenSymbol: 'ETH', usdAmount: 5, createdAt: Date.now() }] }) })));
  const host = document.createElement('div'); document.body.appendChild(host);
  const root = createRoot(host);
  try {
    await act(async () => { root.render(<SentBeams walletAddress={wallet} />); });
    const restore = [...host.querySelectorAll('button')].find(button => button.textContent === 'Restore my links')!;
    await act(async () => { restore.click(); });
    expect(host.querySelector('[role="alert"]')?.textContent).toContain('Wallet verified, but no link backups were found');
    expect(host.querySelector('[aria-label="Copy Beam link"]')).toBeNull();
  } finally { await act(async () => root.unmount()); host.remove(); vi.unstubAllGlobals(); }
});

it('keeps a recovered claim link when a previously started refresh finishes', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  localStorage.clear();
  const wallet = '0x1111111111111111111111111111111111111111';
  const metadata = { depositId: '123', walletAddress: wallet, tokenSymbol: 'ETH', usdAmount: 5, createdAt: Date.now() };
  let finishRefresh!: () => void;
  let reads = 0;
  vi.stubGlobal('fetch', vi.fn(async (_url: string, options?: RequestInit) => {
    if (!options?.headers && ++reads === 2) await new Promise<void>(resolve => { finishRefresh = resolve; });
    return { ok: true, json: async () => ({ entries: [{ ...metadata, ...(options?.headers ? { beamLink: 'https://example.invalid/claim#key=secret&id=123' } : {}) }] }) };
  }));
  const host = document.createElement('div'); document.body.appendChild(host);
  const root = createRoot(host);
  try {
    await act(async () => { root.render(<SentBeams walletAddress={wallet} />); });
    await act(async () => { (host.querySelector('[aria-label="Refresh beams"]') as HTMLButtonElement).click(); });
    await act(async () => { [...host.querySelectorAll('button')].find(button => button.textContent === 'Restore my links')!.click(); });
    expect(host.querySelector('[aria-label="Copy Beam link"]')).not.toBeNull();
    await act(async () => { finishRefresh(); });
    expect(host.querySelector('[aria-label="Copy Beam link"]')).not.toBeNull();
  } finally { await act(async () => root.unmount()); host.remove(); vi.unstubAllGlobals(); }
});
