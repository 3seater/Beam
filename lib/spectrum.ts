import { parseAbi, isAddress, zeroAddress } from 'viem';
import crateBundles from './crate-bundles.json';
import type { RHToken } from './robinhood-tokens';

export interface SpectrumConstituent extends RHToken { weight: number; poolAddress: string }
export interface SpectrumPreset { id: string; name: string; description: string; symbols: readonly string[]; constituents: readonly SpectrumConstituent[] }
// Exact Crate catalog; weights are input-budget allocations, not token quantities.
export const SPECTRUM_PRESETS: readonly SpectrumPreset[] = crateBundles.map(bundle => ({
  id: bundle.id, name: bundle.name, description: bundle.description,
  symbols: bundle.constituents.map(token => token.symbol),
  constituents: bundle.constituents.map(token => ({ ...token, address: token.address as `0x${string}`, isStock: bundle.id === 'mag-4' })),
}));
export const SPECTRUM_ASSETS = [...new Map(SPECTRUM_PRESETS.flatMap(p => p.constituents).map(t => [t.address.toLowerCase(), t])).values()];

export function allocateBudget(amount: bigint, weights: readonly number[]): bigint[] {
  const bps = weights.map(w => Math.round(w * 10_000));
  if (weights.length < 2 || weights.length > 8 || weights.some(w => !Number.isFinite(w) || w <= 0) || bps.reduce((a,b) => a+b, 0) !== 10_000) throw new Error('Invalid bundle allocations.');
  const portions = bps.map(w => amount * BigInt(w) / 10_000n);
  portions[portions.length - 1] += amount - portions.reduce((a,b) => a+b, 0n);
  if (portions.some(p => p <= 0n)) throw new Error('Amount is too small for this bundle.');
  return portions;
}
// Canonical Robinhood Chain deployment. Public addresses belong in the build;
// only the Enso API key and relayer credentials require hosting secrets.
// An explicit override (including zeroAddress to disable sends) still wins.
export const SPECTRUM_ESCROW_ADDRESS = (process.env.NEXT_PUBLIC_SPECTRUM_ESCROW_ADDRESS ?? '0x191618ac8bb752039ee4586cf7aed9a4ff18b234') as `0x${string}`;
export const spectrumConfigured = isAddress(SPECTRUM_ESCROW_ADDRESS) && SPECTRUM_ESCROW_ADDRESS !== zeroAddress;
export const SPECTRUM_ABI = parseAbi([
  'function depositBundle(address sender,address claimSigner,address[] tokens,uint256[] amounts,bytes32 presetId) returns (uint256 depositId)',
  'function getBundle(uint256 depositId) view returns (address sender,address claimSigner,bool claimed,uint256 createdAt,bytes32 presetId,address[] tokens,uint256[] amounts)',
  'function claim(uint256 depositId,address recipient,bytes signature)',
  'function cancel(uint256 depositId)',
  'event BundleDeposited(uint256 indexed depositId,address indexed sender,address claimSigner,bytes32 presetId)',
]);

export function spectrumLink(origin: string, key: `0x${string}`, id: bigint): string {
  return `${origin}/claim#key=${key.slice(2)}&id=${id}&kind=spectrum`;
}
