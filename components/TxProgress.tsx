'use client';

import { ArrowLeftRight, Check, Link2, Loader2, ShieldCheck, Wallet } from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';
import { tokenCardStyle } from '@/lib/token-card-theme';
import type { BeamStep } from '@/lib/types';

export function TxProgress({ step, isERC20, symbol = 'ETH', logoUrl, tokenVisual, bundleStatus }: { step: BeamStep; isERC20: boolean; symbol?: string; logoUrl?: string; tokenVisual?: React.ReactNode; bundleStatus?: 'quoting' | 'signing' | 'confirming' }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const imageUrl = logoUrl || (symbol === 'ETH' ? 'https://coin-images.coingecko.com/coins/images/279/small/ethereum.png?1696501628' : undefined);
  const stages = bundleStatus ? ['Quote', 'Confirm', 'Send'] : isERC20 ? ['Swap', 'Approve', 'Deposit'] : ['Deposit'];
  const stageIndex = bundleStatus ? ['quoting', 'signing', 'confirming'].indexOf(bundleStatus) : isERC20 ? step.startsWith('swap') ? 0 : step.startsWith('approval') ? 1 : 2 : 0;
  const waiting = bundleStatus ? bundleStatus === 'signing' : step.endsWith('pending');
  const label = bundleStatus ? bundleStatus === 'quoting' ? 'Preparing your bundle' : 'Create your Beam' : step.startsWith('swap') ? 'Swap ETH for ' + symbol : step.startsWith('approval') ? 'Approve ' + symbol : 'Create your Beam';
  const StageIcon = step.startsWith('swap') ? ArrowLeftRight : step.startsWith('approval') ? ShieldCheck : Link2;

  return <div className="tx-progress">
    <div className="tx-art" aria-hidden="true" style={tokenCardStyle(symbol)}>
      <div className="tx-orbit" /><div className="tx-mark tx-token-mark">
        {tokenVisual ?? (imageUrl && failedUrl !== imageUrl
          ? <Image src={imageUrl} alt="" width={100} height={100} unoptimized onError={() => setFailedUrl(imageUrl)} />
          : <span>{symbol.slice(0, 4)}</span>)}
      </div>
      <span className="tx-asset">{symbol}</span><span className="tx-action-icon"><StageIcon size={25} strokeWidth={1.5} /></span>
    </div>
    <div className="tx-heading" role="status" aria-live="polite"><h2>{label}</h2><p>{bundleStatus === 'quoting' ? 'Finding a route for every asset.' : waiting ? 'Confirm the request in your wallet.' : 'Waiting for network confirmation.'}</p></div>
    <ol className="tx-stages" aria-label="Transaction steps">
      {stages.map((stage, index) => <li key={stage} data-state={index < stageIndex ? 'complete' : index === stageIndex ? 'active' : 'upcoming'} aria-current={index === stageIndex ? 'step' : undefined}>
        <span className="tx-stage-node">{index < stageIndex ? <Check size={16} /> : index === stageIndex ? <Loader2 size={16} className="animate-spin" /> : index + 1}</span><span>{stage}</span>
      </li>)}
    </ol>
    <div className="tx-wallet-status">{waiting ? <Wallet size={17} /> : <Loader2 size={17} className="animate-spin" />}<span>{bundleStatus === 'quoting' ? 'All assets in one transaction' : waiting ? 'Wallet confirmation needed' : 'Transaction submitted'}</span></div>
  </div>;
}
