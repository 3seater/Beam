import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import { encodeAbiParameters, encodeEventTopics, parseAbi } from 'viem';
const mocks = vi.hoisted(() => ({ getLogs: vi.fn(), getBlock: vi.fn(), readContract: vi.fn(), waitForTransactionReceipt: vi.fn(), writeContractAsync: vi.fn() }));
vi.mock('wagmi', () => ({ usePublicClient: () => mocks, useWriteContract: () => mocks, useSignMessage: () => ({ signMessageAsync: vi.fn() }) }));
vi.mock('@/lib/robinhood-tokens', () => ({ fetchRobinhoodTokens: async () => [], stockLogoUrl: () => '' }));
import { SentBeams } from '../SentBeams';

it('retains the sent amount and chain timestamp after cancellation and reload', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  localStorage.clear();
  const wallet = '0x1111111111111111111111111111111111111111';
  const zero = '0x0000000000000000000000000000000000000000';
  const event = parseAbi(['event Deposited(uint256 indexed depositId, address indexed sender, address token, uint256 amount, address claimSignerAddress)']);
  let cancelled = false;
  mocks.getLogs.mockImplementation(async ({ event: requested }) => requested.name === 'Cancelled' ? (cancelled ? [{ args: { depositId: 11n } }] : []) : [{
    topics: encodeEventTopics({ abi: event, eventName: 'Deposited', args: { depositId: 11n, sender: wallet } }),
    data: encodeAbiParameters([{ type: 'address' }, { type: 'uint256' }, { type: 'address' }], [zero, 1000000000000000000n, wallet]), blockNumber: 10n,
  }]);
  mocks.getBlock.mockResolvedValue({ timestamp: BigInt(Math.floor(Date.now() / 1000) - 7200) });
  mocks.readContract.mockImplementation(async () => ({ sender: wallet, claimed: cancelled, amount: 1000000000000000000n }));
  mocks.writeContractAsync.mockResolvedValue('0x1234');
  mocks.waitForTransactionReceipt.mockImplementation(async () => { cancelled = true; return { status: 'success' }; });
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ entries: [] }) })));
  const host = document.createElement('div'); document.body.appendChild(host);
  const root = createRoot(host);
  try {
    await act(async () => { root.render(<SentBeams walletAddress={wallet} />); });
    expect(host.textContent).toContain('1 ETH');
    expect(host.textContent).toContain('2h ago');
    await act(async () => { (host.querySelector('[aria-label="Cancel and recover funds"]') as HTMLButtonElement).click(); });
    expect(host.textContent).toContain('Cancelled');
    expect(host.textContent).toContain('1 ETH');
    expect(host.textContent).toContain('2h ago');
    await act(async () => { root.render(<SentBeams key="reload" walletAddress={wallet} />); });
    expect(host.textContent).toContain('Cancelled');
    expect(host.textContent).toContain('1 ETH');
    mocks.getLogs.mockRejectedValue(new Error('Log service unavailable'));
    await act(async () => { (host.querySelector('[aria-label="Refresh beams"]') as HTMLButtonElement).click(); });
    expect(host.textContent).toContain('Cancelled');
    expect(host.textContent).toContain('1 ETH');
  } finally { await act(async () => root.unmount()); host.remove(); vi.unstubAllGlobals(); }
});
