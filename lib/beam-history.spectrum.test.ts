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
