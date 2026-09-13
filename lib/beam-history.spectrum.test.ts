import { beforeEach, expect, it } from 'vitest';
import { saveBeamEntry, loadBeamHistory, removeBeamEntry } from './beam-history';
const wallet = '0x1111111111111111111111111111111111111111';
const entry = { depositId: '1', beamLink: '/claim#key=example&id=1', tokenSymbol: 'ETH', usdAmount: 5, createdAt: 1 };
beforeEach(() => localStorage.clear());
it('keeps matching numeric IDs from different escrows separate', () => {
  saveBeamEntry(wallet, entry);
  saveBeamEntry(wallet, { ...entry, kind: 'spectrum', tokenSymbol: 'Compute' });
  expect(loadBeamHistory(wallet)).toHaveLength(2);
  removeBeamEntry(wallet, '1');
  expect(loadBeamHistory(wallet)).toEqual([{ ...entry, kind: 'spectrum', tokenSymbol: 'Compute' }]);
});
it('never evicts an older claim key when more than 50 Beams are saved', () => {
  for (let i = 0; i < 75; i++) saveBeamEntry(wallet, { ...entry, depositId: String(i), createdAt: i });
  expect(loadBeamHistory(wallet)).toHaveLength(75);
  expect(loadBeamHistory(wallet).find(saved => saved.depositId === '0')?.beamLink).toBe(entry.beamLink);
});
