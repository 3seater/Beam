'use client';

import { ArrowLeftRight, Check, Link2, Loader2, ShieldCheck, Wallet } from 'lucide-react';
import { BeamMark } from './BeamMark';
import type { BeamStep } from '@/lib/types';

export function TxProgress({ step, isERC20, symbol = 'ETH' }: { step: BeamStep; isERC20: boolean; symbol?: string }) {
  const stages = isERC20 ? ['Swap', 'Approve', 'Deposit'] : ['Deposit'];
  const stageIndex = isERC20 ? step.startsWith('swap') ? 0 : step.startsWith('approval') ? 1 : 2 : 0;
  const waiting = step.endsWith('pending');
  const label = step.startsWith('swap') ? 'Swap ETH for ' + symbol : step.startsWith('approval') ? 'Approve ' + symbol : 'Create your Beam';
  const StageIcon = step.startsWith('swap') ? ArrowLeftRight : step.startsWith('approval') ? ShieldCheck : Link2;

  return <div className="tx-progress">
    <div className="tx-art" aria-hidden="true">
      <div className="tx-orbit" /><BeamMark sculptural className="tx-mark" />
      <span className="tx-asset">{symbol}</span><span className="tx-action-icon"><StageIcon size={25} strokeWidth={1.5} /></span>
    </div>
    <div className="tx-heading" role="status" aria-live="polite"><h2>{label}</h2><p>{waiting ? 'Confirm the request in your wallet.' : 'Waiting for network confirmation.'}</p></div>
    <ol className="tx-stages" aria-label="Transaction steps">
      {stages.map((stage, index) => <li key={stage} data-state={index < stageIndex ? 'complete' : index === stageIndex ? 'active' : 'upcoming'} aria-current={index === stageIndex ? 'step' : undefined}>
        <span className="tx-stage-node">{index < stageIndex ? <Check size={16} /> : index === stageIndex ? <Loader2 size={16} className="animate-spin" /> : index + 1}</span><span>{stage}</span>
      </li>)}
    </ol>
    <div className="tx-wallet-status">{waiting ? <Wallet size={17} /> : <Loader2 size={17} className="animate-spin" />}<span>{waiting ? 'Wallet confirmation needed' : 'Transaction submitted'}</span></div>
  </div>;
}
