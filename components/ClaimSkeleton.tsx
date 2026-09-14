'use client';
import { BeamGiftCard } from './BeamGiftCard';
import { Skeleton } from './ui/Skeleton';
import { ClaimButton } from '@/app/claim/ClaimButton';

/** Uses the same card, sender row, disclosure, and CTA geometry as the claim. */
export function ClaimSkeleton({ bundle = false, heading = true }: { bundle?: boolean; heading?: boolean }) {
  return <>
    {heading && <h1 className="receipt-heading">Claim your Beam.</h1>}
    <div className="claim-deposit" role="status" aria-label="Loading your Beam" aria-busy="true">
      <BeamGiftCard loading label="A little something for you" status="Ready to claim" />
      <div className="claim-sender"><span>From</span><Skeleton className="claim-sender-skeleton" /></div>
    </div>
    {bundle && <>
      <details className="receipt-wallet-details"><summary aria-disabled="true" onClick={event => event.preventDefault()}>View your assets</summary></details>
      <p className="text-sm opacity-65">Sign in and claim all assets together. No existing wallet needed.</p>
    </>}
    <ClaimButton claimStep="idle" error={null} alreadyClaimed={false} onClaim={() => {}} disabled />
  </>;
}
