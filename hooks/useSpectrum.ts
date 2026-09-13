'use client';
import { useState, useRef, useEffect } from 'react';
import { useSendTransaction, useSwitchChain } from 'wagmi';
import { getPublicClient } from 'wagmi/actions';
import { decodeEventLog, parseUnits, keccak256, stringToHex } from 'viem';
import { privateKeyToAddress } from 'viem/accounts';
import { generateEphemeralKey } from '@/lib/beam-link';
import { SPECTRUM_ABI, SPECTRUM_ESCROW_ADDRESS, SPECTRUM_PRESETS, spectrumLink, type SpectrumPreset } from '@/lib/spectrum';
import { fetchTokenPriceUsd } from '@/lib/robinhood-prices';
import { robinhoodChain } from '@/lib/chains';
import { wagmiConfig } from '@/lib/wagmi-config';
import { DEPOSIT_TIMEOUT_MS } from '@/lib/constants';
import { saveBeamEntry } from '@/lib/beam-history';
import { requireBeamBackup } from '@/lib/beam-backup-ready';

interface PendingSpectrum { hash: `0x${string}`; key: `0x${string}`; presetId: string; usdAmount: number; sender: `0x${string}`; escrow: `0x${string}` }
const pendingStorageKey = (sender: string) => `beam:spectrum:pending:${sender.toLowerCase()}`;

export function useSpectrum(walletAddress?: `0x${string}`) {
  const [status, setStatus] = useState<'idle' | 'quoting' | 'signing' | 'confirming' | 'done'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(null);
  const [received, setReceived] = useState<Record<string, string> | undefined>();
  const [pending, setPending] = useState<PendingSpectrum | null>(null);
  const pendingRef = useRef<PendingSpectrum | null>(null);
  const busy = useRef(false);
  const { sendTransactionAsync } = useSendTransaction();
  const { switchChainAsync } = useSwitchChain();
  useEffect(() => {
    if (busy.current) return;
    pendingRef.current = null; setPending(null); setStatus('idle'); setLink(null); setError(null); setReceived(undefined);
    if (!walletAddress) return;
    try {
      const raw = localStorage.getItem(pendingStorageKey(walletAddress));
      if (!raw) return;
      const p = JSON.parse(raw) as PendingSpectrum;
      if (!/^0x[0-9a-fA-F]{64}$/.test(p.hash) || !/^0x[0-9a-fA-F]{64}$/.test(p.key) || p.sender.toLowerCase() !== walletAddress.toLowerCase() || p.escrow.toLowerCase() !== SPECTRUM_ESCROW_ADDRESS.toLowerCase() || !SPECTRUM_PRESETS.some(preset => preset.id === p.presetId)) return;
      pendingRef.current = p; setPending(p);
    } catch { /* Storage unavailable. In-memory pending transactions still survive retries. */ }
  }, [walletAddress]);
  function clearPending(p: PendingSpectrum) {
    try { localStorage.removeItem(pendingStorageKey(p.sender)); } catch { /* best effort */ }
    pendingRef.current = null; setPending(null);
  }
  async function finish(p: PendingSpectrum) {
    const preset = SPECTRUM_PRESETS.find(preset => preset.id === p.presetId);
    if (!preset) throw new Error('Unknown pending bundle.');
    const client = getPublicClient(wagmiConfig, { chainId: robinhoodChain.id });
    if (!client) throw new Error('Wallet disconnected.');
    setStatus('confirming');
    const receipt = await client.waitForTransactionReceipt({ hash: p.hash, timeout: DEPOSIT_TIMEOUT_MS });
    if (receipt.status !== 'success') { clearPending(p); throw new Error('Transaction reverted. No Spectrum was created.'); }
    const signer = privateKeyToAddress(p.key);
    let id: bigint | undefined;
    for (const log of receipt.logs) {
      if (log.address.toLowerCase() !== p.escrow.toLowerCase()) continue;
      try {
        const event = decodeEventLog({ abi: SPECTRUM_ABI, eventName: 'BundleDeposited', topics: log.topics, data: log.data });
        if (event.args.sender.toLowerCase() === p.sender.toLowerCase() && event.args.claimSigner.toLowerCase() === signer.toLowerCase() && event.args.presetId === keccak256(stringToHex(preset.id))) id = event.args.depositId;
      } catch { /* unrelated event */ }
    }
    if (id === undefined) throw new Error(`Bundle ID was not found. Keep transaction ${p.hash} for support.`);
    const beamLink = spectrumLink(window.location.origin, p.key, id);
    try {
      const bundle = await client.readContract({ address: p.escrow, abi: SPECTRUM_ABI, functionName: 'getBundle', args: [id] });
      setReceived(Object.fromEntries(bundle[5].map((token, i) => [token.toLowerCase(), bundle[6][i].toString()])));
    } catch { setReceived(undefined); }
    const entry = { depositId: id.toString(), beamLink, tokenSymbol: preset.name, usdAmount: p.usdAmount, createdAt: Date.now(), kind: 'spectrum' as const };
    saveBeamEntry(p.sender, entry);
    setLink(beamLink); setStatus('done'); clearPending(p);
    try {
      const backup = await fetch('/api/beams', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...entry, walletAddress: p.sender }) });
      if (!backup.ok) throw new Error();
    } catch { setError('Spectrum sent. Server backup failed; copy and keep your link.'); }
  }
  async function resume() {
    if (busy.current || !pendingRef.current) return;
    busy.current = true; setError(null);
    try { await finish(pendingRef.current); }
    catch (err) { setError(pendingRef.current ? 'Confirmation is still unavailable. Your transaction is saved; retry confirmation before sending again.' : err instanceof Error ? err.message : 'Confirmation unavailable.'); setStatus('idle'); }
    finally { busy.current = false; }
  }
  async function send(preset: SpectrumPreset, usdAmount: number, sender: `0x${string}`) {
    if (busy.current) return;
    if (pendingRef.current) { await resume(); return; }
    busy.current = true; setError(null); setLink(null);
    try {
      if (!Number.isFinite(usdAmount) || usdAmount < 5 || usdAmount > 100_000) throw new Error('Enter an amount from $5 to $100,000.');
      await requireBeamBackup();
      setStatus('quoting');
      await switchChainAsync({ chainId: robinhoodChain.id });
      const price = await fetchTokenPriceUsd('ETH');
      if (!price) throw new Error('Live ETH price unavailable.');
      const amount = parseUnits((usdAmount / price).toFixed(18), 18);
      const { ephemeralPrivKey, claimSignerAddress } = generateEphemeralKey();
      const response = await fetch('/api/spectrum/quote', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ presetId: preset.id, amountIn: amount.toString(), sender, signer: claimSignerAddress }) });
      const quote = await response.json();
      if (!response.ok) throw new Error(quote.error ?? 'Bundle quote unavailable.');
      const client = getPublicClient(wagmiConfig, { chainId: robinhoodChain.id });
      if (!client) throw new Error('Wallet disconnected.');
      const tx = { account: sender, to: quote.tx.to as `0x${string}`, data: quote.tx.data as `0x${string}`, value: BigInt(quote.tx.value) };
      if (tx.value !== amount) throw new Error('Unexpected bundle spending budget.');
      await client.call(tx);
      if (Date.now() > quote.expiresAt) throw new Error('Quote expired. Please try again.');
      setStatus('signing');
      const hash = await sendTransactionAsync({ ...tx, chainId: robinhoodChain.id });
      const p: PendingSpectrum = { hash, key: ephemeralPrivKey, presetId: preset.id, usdAmount, sender, escrow: SPECTRUM_ESCROW_ADDRESS };
      pendingRef.current = p; setPending(p);
      try { localStorage.setItem(pendingStorageKey(sender), JSON.stringify(p)); } catch { /* In-memory recovery remains available. */ }
      await finish(p);
    } catch (err) {
      setError(pendingRef.current ? 'Transaction submitted. Retry confirmation before sending again; your claim key is saved.' : err instanceof Error ? err.message : 'Spectrum could not be sent.'); setStatus('idle');
    } finally { busy.current = false; }
  }
  return { status, error, link, pending, received, send, resume, reset() { if (!busy.current && !pendingRef.current) { setStatus('idle'); setError(null); setLink(null); setReceived(undefined); } } };
}
