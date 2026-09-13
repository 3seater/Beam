import { describe, it, expect } from 'vitest';
import { buildSpectrumActions } from './enso-bundle';
import { SPECTRUM_PRESETS, SPECTRUM_ASSETS, allocateBudget, spectrumLink } from './spectrum';
import { parseBeamLink } from './beam-link';

const sender = '0x1111111111111111111111111111111111111111';
const signer = '0x2222222222222222222222222222222222222222';
const escrow = '0x3333333333333333333333333333333333333333';
describe('Spectrum transaction plan', () => {
  it('conserves the complete spending budget, including division dust', () => {
    expect(allocateBudget(1000001n, [.5, .3, .2])).toEqual([500000n, 300000n, 200001n]);
    expect(() => allocateBudget(1n, [.5, .3, .2])).toThrow();
    expect(() => allocateBudget(100n, [.5, .6])).toThrow();
  });
  it('builds all nine Crate presets with their original allocations and actual route outputs', () => {
    expect(SPECTRUM_PRESETS.map(p => p.name)).toEqual(['Blue Chips', 'AI & Infra', 'Feline Index', 'Launchpad Pack', 'DeFi Core', 'Mag 4', 'Paired', 'Speculative', 'Elon-Coded']);
    for (const preset of SPECTRUM_PRESETS) {
      const actions = buildSpectrumActions(preset, SPECTRUM_ASSETS, 1000001n, sender, signer, escrow);
      const n = preset.symbols.length;
      expect(actions.slice(0, n).map(a => BigInt(a.args.amountIn as string))).toEqual(allocateBudget(1000001n, preset.constituents.map(t => t.weight)));
      const total = actions.slice(0, n).reduce((sum, a) => sum + BigInt(a.args.amountIn as string), 0n);
      expect(total).toBe(1000001n);
      expect(actions[n].args.amount).toEqual({ useOutputOfCallAt: 0 });
      const args = actions[2 * n].args.args as unknown[];
      expect(args[0]).toBe(sender); expect(args[1]).toBe(signer);
      expect(args[3]).toEqual(preset.symbols.map((_, i) => ({ useOutputOfCallAt: i })));
      expect(actions.slice(0, n).every(a => !a.args.receiver)).toBe(true);
    }
  });
  it('fails closed if any asset is missing', () => {
    expect(() => buildSpectrumActions(SPECTRUM_PRESETS[0], [], 100n, sender, signer, escrow)).toThrow('unavailable');
  });
  it('keeps the claim key in the URL fragment and preserves the single-Beam parser', () => {
    const key = `0x${'ab'.repeat(32)}` as `0x${string}`;
    const url = new URL(spectrumLink('https://beam.example', key, 42n));
    expect(url.search).toBe(''); expect(url.hash).toContain('kind=spectrum');
    expect(parseBeamLink(url.hash)).toEqual({ depositId: 42n, ephemeralPrivKey: key });
  });
});
