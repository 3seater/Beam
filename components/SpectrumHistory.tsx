'use client';
import { useEffect, useState } from 'react';
import { usePublicClient, useWriteContract, useSignMessage } from 'wagmi';
import { SPECTRUM_ABI, SPECTRUM_PRESETS, SPECTRUM_ESCROW_ADDRESS, spectrumConfigured } from '@/lib/spectrum';
import { BundleTokenStack } from './SpectrumAssets';
import { loadBeamHistory, saveBeamEntry, type BeamHistoryEntry } from '@/lib/beam-history';
import { recoveryMessage } from '@/lib/beam-recovery';

export function SpectrumHistory({ walletAddress }: { walletAddress: string }) {
  const [entries, setEntries] = useState<BeamHistoryEntry[]>([]);
  const [closed, setClosed] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const client = usePublicClient({ chainId: 4663 });
  const { writeContractAsync } = useWriteContract();
  const { signMessageAsync } = useSignMessage();
  useEffect(() => {
    let active = true;
    const local = loadBeamHistory(walletAddress).filter(e => e.kind === 'spectrum');
    setEntries(local);
    fetch(`/api/beams?wallet=${walletAddress}&kind=spectrum`).then(r => r.json()).then(data => {
      if (!active || !Array.isArray(data.entries)) return;
      const map = new Map(local.map(e => [e.depositId, e]));
      for (const entry of data.entries) if (!map.has(entry.depositId)) map.set(entry.depositId, entry);
      setEntries([...map.values()].sort((a, b) => b.createdAt - a.createdAt));
    }).catch(() => {});
    return () => { active = false; };
  }, [walletAddress]);
  useEffect(() => {
    let active = true;
    if (client && spectrumConfigured) for (const e of entries) client.readContract({ address: SPECTRUM_ESCROW_ADDRESS, abi: SPECTRUM_ABI, functionName: 'getBundle', args: [BigInt(e.depositId)] }).then(b => { if (active) setClosed(prev => ({ ...prev, [e.depositId]: b[2] })); }).catch(() => {});
    return () => { active = false; };
  }, [entries, client]);
  async function restore() {
    setBusy('restore'); setError(null);
    try {
      const timestamp = Date.now();
      const signature = await signMessageAsync({ account: walletAddress as `0x${string}`, message: recoveryMessage(walletAddress, window.location.origin, timestamp) });
      const res = await fetch(`/api/beams?wallet=${walletAddress}&kind=spectrum`, { headers: { 'x-beam-signature': signature, 'x-beam-timestamp': String(timestamp) } });
      if (!res.ok) throw new Error('Could not restore Spectrum links.');
      const data = await res.json();
      for (const e of data.entries) saveBeamEntry(walletAddress, e);
      setEntries(loadBeamHistory(walletAddress).filter(e => e.kind === 'spectrum'));
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not restore links.'); } finally { setBusy(null); }
  }
  async function cancel(e: BeamHistoryEntry) {
    if (!client) return;
    setBusy(e.depositId); setError(null);
    try {
      const hash = await writeContractAsync({ account: walletAddress as `0x${string}`, chainId: 4663, address: SPECTRUM_ESCROW_ADDRESS, abi: SPECTRUM_ABI, functionName: 'cancel', args: [BigInt(e.depositId)] });
      const receipt = await client.waitForTransactionReceipt({ hash });
      if (receipt.status !== 'success') throw new Error('Cancellation reverted.');
      setClosed(prev => ({ ...prev, [e.depositId]: true }));
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not cancel Spectrum.'); } finally { setBusy(null); }
  }
  if (!entries.length) return null;
  return <section className="glass rounded-[24px] p-5 mt-5 flex flex-col gap-4" aria-label="Sent Spectrums">
    <div className="flex justify-between gap-3"><h2 className="font-semibold">Your Spectrums</h2><button disabled={busy !== null} className="text-xs opacity-65" onClick={() => void restore()}>Restore links</button></div>
    {entries.map(e => <div key={e.depositId} className="glass-sm rounded-xl p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3"><span className="flex items-center gap-3">{SPECTRUM_PRESETS.find(p => p.name === e.tokenSymbol) && <BundleTokenStack tokens={SPECTRUM_PRESETS.find(p => p.name === e.tokenSymbol)!.constituents} size={26} />}<strong>{e.tokenSymbol}</strong></span><span>${e.usdAmount.toLocaleString()}</span></div>
      <p className="text-xs opacity-55">{closed[e.depositId] === undefined ? 'Checking status…' : closed[e.depositId] ? 'Claimed or cancelled' : 'Unclaimed'} · {new Date(e.createdAt).toLocaleDateString()}</p>
      <div className="flex gap-4 text-xs">
        {e.beamLink && <button onClick={() => { void navigator.clipboard.writeText(e.beamLink).then(() => setCopied(e.depositId)).catch(() => setError('Could not copy the link.')); }}>{copied === e.depositId ? 'Copied' : 'Copy link'}</button>}
        {closed[e.depositId] === false && <button disabled={busy !== null} onClick={() => void cancel(e)}>{busy === e.depositId ? 'Cancelling…' : 'Cancel & recover all assets'}</button>}
      </div>
    </div>)}
    {error && <p role="alert" className="text-xs text-red-300">{error}</p>}
  </section>;
}
