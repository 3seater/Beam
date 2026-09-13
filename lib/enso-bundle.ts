import { keccak256, stringToHex, isAddress, isHex } from 'viem';
import { allocateBudget, type SpectrumPreset } from './spectrum';
import type { RHToken } from './robinhood-tokens';

export const ENSO_NATIVE = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
export interface EnsoAction { protocol: string; action: string; args: Record<string, unknown> }

export function buildSpectrumActions(preset: SpectrumPreset, tokens: RHToken[], amount: bigint, sender: `0x${string}`, signer: `0x${string}`, escrow: `0x${string}`): EnsoAction[] {
  const assets = preset.constituents.map(constituent => {
    const token = tokens.find(t => t.address.toLowerCase() === constituent.address.toLowerCase());
    if (!token || !isAddress(token.address)) throw new Error(`Bundle asset ${constituent.symbol} is unavailable.`);
    return token;
  });
  if (new Set(assets.map(t => t.address.toLowerCase())).size !== assets.length) throw new Error('Duplicate bundle assets.');
  const portions = allocateBudget(amount, preset.constituents.map(t => t.weight));
  const actions: EnsoAction[] = assets.map((token, i) => ({ protocol: 'enso', action: 'route', args: { tokenIn: ENSO_NATIVE, tokenOut: token.address, amountIn: portions[i].toString(), slippage: '100' } }));
  assets.forEach((token, i) => actions.push({ protocol: 'erc20', action: 'approve', args: { token: token.address, spender: escrow, amount: { useOutputOfCallAt: i } } }));
  actions.push({ protocol: 'enso', action: 'call', args: {
    address: escrow, method: 'depositBundle',
    abi: 'function depositBundle(address sender,address claimSigner,address[] tokens,uint256[] amounts,bytes32 presetId) external returns (uint256 depositId)',
    args: [sender, signer, assets.map(t => t.address), assets.map((_, i) => ({ useOutputOfCallAt: i })), keccak256(stringToHex(preset.id))],
  } });
  return actions;
}

export async function requestEnsoBundle(actions: EnsoAction[], sender: `0x${string}`) {
  const key = process.env.ENSO_API_KEY;
  if (!key) throw new Error('Bundle routing is not configured.');
  const params = new URLSearchParams({ chainId: '4663', fromAddress: sender, routingStrategy: 'router', refundReceiver: sender });
  const response = await fetch(`https://api.enso.build/api/v1/shortcuts/bundle?${params}`, {
    method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }, body: JSON.stringify(actions), signal: AbortSignal.timeout(45_000), cache: 'no-store',
  });
  if (!response.ok) throw new Error('Enso could not find an executable route for every asset. Try another bundle or amount.');
  const data = await response.json();
  if (!data.tx || !isAddress(data.tx.to) || !isHex(data.tx.data) || !/^\d+$/.test(data.tx.value) || (data.tx.from && data.tx.from.toLowerCase() !== sender.toLowerCase()) || data.preTransactions?.length) throw new Error('Bundle transaction could not be verified.');
  return { tx: data.tx as { to: `0x${string}`; data: `0x${string}`; value: string }, gas: data.gas as string | undefined, amountsOut: data.amountsOut as Record<string, string>, priceImpact: data.priceImpact as number | null };
}
