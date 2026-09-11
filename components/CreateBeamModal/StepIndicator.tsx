'use client';

import { Check } from 'lucide-react';
import type { BeamStep } from '@/lib/types';

type StepStatus = 'upcoming' | 'active' | 'completed';

interface StepDef {
  label: string;
  activeWhen: BeamStep[];
  completedWhen: BeamStep[];
}

const ERC20_STEPS: StepDef[] = [
  { label: 'Swap', activeWhen: ['swap-pending', 'swap-confirming'], completedWhen: ['approval-pending', 'approval-confirming', 'deposit-pending', 'deposit-confirming', 'link-generated'] },
  { label: 'Approve', activeWhen: ['approval-pending', 'approval-confirming'], completedWhen: ['deposit-pending', 'deposit-confirming', 'link-generated'] },
  { label: 'Deposit', activeWhen: ['deposit-pending', 'deposit-confirming'], completedWhen: ['link-generated'] },
  { label: 'Link Ready', activeWhen: ['link-generated'], completedWhen: [] },
];

const ETH_STEPS: StepDef[] = [
  { label: 'Deposit', activeWhen: ['deposit-pending', 'deposit-confirming'], completedWhen: ['link-generated'] },
  { label: 'Link Ready', activeWhen: ['link-generated'], completedWhen: [] },
];

function resolveStatus(def: StepDef, step: BeamStep): StepStatus {
  if (def.completedWhen.includes(step)) return 'completed';
  if (def.activeWhen.includes(step)) return 'active';
  return 'upcoming';
}

function StepNode({ status }: { status: StepStatus }) {
  if (status === 'completed') return (
    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/80" aria-hidden="true">
      <Check size={13} strokeWidth={3} className="text-sky-mid" />
    </span>
  );
  if (status === 'active') return (
    <span className="flex h-7 w-7 items-center justify-center rounded-full
                     ring-2 ring-white/60 ring-offset-1 ring-offset-transparent
                     bg-white/25" aria-hidden="true">
      <span className="h-2.5 w-2.5 rounded-full bg-white animate-pulse" />
    </span>
  );
  return (
    <span className="flex h-7 w-7 items-center justify-center rounded-full
                     border border-white/25 bg-white/10" aria-hidden="true">
      <span className="h-2 w-2 rounded-full bg-white/30" />
    </span>
  );
}

function Connector({ completed }: { completed: boolean }) {
  return (
    <div
      className={`mx-1 h-px flex-1 transition-colors duration-300 ${completed ? 'bg-white/60' : 'bg-white/20'}`}
      aria-hidden="true"
    />
  );
}

export function StepIndicator({ step, isERC20 }: { step: BeamStep; isERC20: boolean }) {
  const steps = isERC20 ? ERC20_STEPS : ETH_STEPS;

  return (
    <div className="flex w-full items-center" role="list" aria-label="Transaction steps">
      {steps.map((def, i) => {
        const status = resolveStatus(def, step);
        const isLast = i === steps.length - 1;
        const prevCompleted = i > 0 && resolveStatus(steps[i - 1], step) === 'completed';

        return (
          <div key={def.label} className="flex flex-1 items-center" role="listitem"
            aria-current={status === 'active' ? 'step' : undefined}>
            {i > 0 && <Connector completed={prevCompleted} />}
            <div className="flex flex-col items-center gap-1.5">
              <StepNode status={status} />
              <span className={[
                'text-center text-[11px] font-medium leading-tight whitespace-nowrap transition-colors duration-200',
                status === 'active' ? 'text-white' :
                  status === 'completed' ? 'text-white/70' : 'text-white/35',
              ].join(' ')}>
                {def.label}
              </span>
            </div>
            {!isLast && <Connector completed={status === 'completed'} />}
          </div>
        );
      })}
    </div>
  );
}
