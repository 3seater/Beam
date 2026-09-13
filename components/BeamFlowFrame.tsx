'use client';
import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { ICON_SIZE } from '@/lib/icons';

/** Shared frame for single-asset and bundle send flows. */
export function BeamFlowFrame({ title, finished = false, busy = false, onBack, children, embedded = false }: {
  title: string; finished?: boolean; busy?: boolean; onBack: () => void; children: ReactNode; embedded?: boolean;
}) {
  const content = <div className={finished ? 'flow-finished' : 'glass-strong flow-wizard rounded-[32px] overflow-hidden'}>
    <div className={finished ? 'hidden' : 'flow-wizard-header flex items-center justify-between px-7 pt-6 pb-5 border-b border-white/10'}>
      {!busy ? <button type="button" onClick={onBack} className="btn-glass-icon !w-9 !h-9 shrink-0" aria-label="Back"><ArrowLeft size={ICON_SIZE.md} /></button> : <div className="w-9" />}
      <h1 className="text-base font-semibold text-white tracking-tight text-center flex-1 px-4">{title}</h1><div className="w-9 shrink-0" />
    </div>
    <div className={finished ? '' : 'px-7 py-7 min-h-[400px] flex flex-col'}>{children}</div>
  </div>;
  if (embedded) return <div className="spectrum-embedded">{children}</div>;
  return <main className="app-page beam-flow-page min-h-screen flex flex-col items-center justify-center px-4 py-28">
    <motion.div className="w-full max-w-lg" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .45, ease: [.22, 1, .36, 1] }}>{content}</motion.div>
  </main>;
}
