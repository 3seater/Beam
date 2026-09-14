'use client';
import { useEffect, useState } from 'react';
import { usePublicClient } from 'wagmi';
import { formatUnits, keccak256, stringToHex, zeroAddress } from 'viem';
import { privateKeyToAddress } from 'viem/accounts';
import { parseBeamLink } from '@/lib/beam-link';
import { SPECTRUM_ABI, SPECTRUM_ESCROW_ADDRESS, SPECTRUM_PRESETS, SPECTRUM_ASSETS, spectrumConfigured } from '@/lib/spectrum';
import { STARTER_ASSETS } from '@/lib/robinhood-tokens';
import { useClaim } from '@/hooks/useClaim';
import { ClaimButton } from '@/app/claim/ClaimButton';
import { ClaimSuccess } from '@/app/claim/ClaimSuccess';
import { BeamGiftCard } from './BeamGiftCard';
import { BundleTokenStack, BundleTokenImage } from './SpectrumAssets';
import { truncateAddress } from '@/lib/format';
import { ClaimSkeleton } from './ClaimSkeleton';

export function SpectrumClaim() {
  const client = usePublicClient({ chainId: 4663 });
  const [bundle, setBundle] = useState<readonly [`0x${string}`, `0x${string}`, boolean, bigint, `0x${string}`, readonly `0x${string}`[], readonly bigint[]] | null>(null);
  const [key, setKey] = useState<`0x${string}` | null>(null);
  const [id, setId] = useState<bigint | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const flow = useClaim();
  useEffect(() => {
    let active = true;
    async function load() {
      setError(null);
      try {
        if (!spectrumConfigured) throw new Error('Spectrum claims are not configured yet.');
        const parsed = parseBeamLink(window.location.hash);
        setKey(parsed.ephemeralPrivKey); setId(parsed.depositId);
        if (!client) return;
        const b = await client.readContract({ address: SPECTRUM_ESCROW_ADDRESS, abi: SPECTRUM_ABI, functionName: 'getBundle', args: [parsed.depositId] });
        if (b[0] === zeroAddress) throw new Error('This Spectrum was not found.');
        if (privateKeyToAddress(parsed.ephemeralPrivKey).toLowerCase() !== b[1].toLowerCase()) throw new Error('The claim key does not match this Spectrum.');
        if (active) { setBundle(b); setError(null); }
      } catch (err) { if (active) setError(err instanceof Error ? err.message : 'Could not load Spectrum.'); }
    }
    void load(); return () => { active = false; };
  }, [client, retry]);
  const preset = bundle && SPECTRUM_PRESETS.find(p => keccak256(stringToHex(p.id)) === bundle[4]);
  const assets = bundle?.[5].map((address, i) => {
    const token = [...SPECTRUM_ASSETS, ...STARTER_ASSETS].find(t => t.address.toLowerCase() === address.toLowerCase());
    return { address, symbol: token?.symbol ?? `${address.slice(0,6)}…`, logoUrl: token?.logoUrl ?? '/favicon.png', decimals: token?.decimals ?? 18, amount: bundle[6][i] };
  }) ?? [];
  return <main className="app-page beam-flow-page claim-page min-h-screen flex flex-col items-center px-4 py-28">
    {flow.claimStep === 'success' && flow.recipientAddress ? <ClaimSuccess amount={`${assets.length} assets`} symbol={preset?.name ?? 'Spectrum'} recipientAddress={flow.recipientAddress} txHash={flow.txHash} tokenVisual={<BundleTokenStack tokens={assets} />} bundleAssets={assets} /> : <section className="claim-receive-shell w-full flex flex-col gap-5">
      <h1 className="receipt-heading">Claim your Beam.</h1>
      {error ? <><p role="alert">{error}</p><button className="btn-glass-primary" onClick={() => setRetry(n => n + 1)}>Try again</button></> : !bundle ? <ClaimSkeleton bundle heading={false} /> : <>
        <div className="claim-deposit"><BeamGiftCard amount={`${assets.length} assets`} symbol={preset?.name ?? 'Spectrum'} tokenVisual={<BundleTokenStack tokens={assets} />} label="A little something for you" status={bundle[2] ? 'Closed' : 'Ready to claim'} />
          <div className="claim-sender"><span>From</span><span title={bundle[0]}>{truncateAddress(bundle[0])}</span></div>
        </div>
        <details className="receipt-wallet-details"><summary>View your assets</summary><div className="receipt-wallet-content bundle-allocation">{assets.map(asset => <div className="bundle-allocation-row" key={asset.address}><BundleTokenImage token={asset} /><span className="bundle-allocation-token"><strong>{asset.symbol}</strong></span><span className="bundle-allocation-value">{Number(formatUnits(asset.amount, asset.decimals)).toLocaleString(undefined, { maximumSignificantDigits: 6 })}</span></div>)}</div></details>
        {bundle[2] ? <p>This Spectrum has already been claimed or cancelled.</p> : <>
          <p className="text-sm opacity-65">Sign in and claim all assets together. No existing wallet needed.</p>
          <ClaimButton claimStep={flow.claimStep} error={flow.error} alreadyClaimed={bundle[2]} onClaim={() => { if (key && id !== null) void flow.claim(key, id, 'spectrum'); }} />
        </>}
      </>}
    </section>}
  </main>;
}
