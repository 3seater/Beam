'use client';

import { motion } from 'framer-motion';
import { Copy, MessageCircle, CheckCircle2 } from 'lucide-react';
import { ChainBadge, GaslessBadge } from '@/components/ui/Badge';

export function BeamPreviewCard() {
  return (
    <motion.div
      className="glass-strong relative flex flex-col gap-4 p-6 w-full max-w-xs"
      animate={{ y: [0, -8, 0] }}
      transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      aria-label="Sample Beam claim card"
      role="img"
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[0.625rem] text-white/40 tracking-wider font-normal mb-1">You received</p>
          <p className="text-3xl font-medium text-white tracking-tight leading-none">0.05 ETH</p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <ChainBadge />
          <GaslessBadge />
        </div>
      </div>

      {/* Success state */}
      <div className="glass-sm flex items-center gap-2 px-3 py-2">
        <CheckCircle2 size={14} className="text-emerald-300 shrink-0" aria-hidden="true" />
        <span className="text-xs text-white/75">Successfully bought Anthropic</span>
      </div>

      {/* Address row */}
      <div className="flex items-center gap-2">
        <span
          className="w-6 h-6 rounded-full bg-white/15 border border-white/25
                     flex items-center justify-center text-[9px] font-bold text-white/70 shrink-0"
          aria-hidden="true"
        >
          0x
        </span>
        <span className="text-xs text-white/50 font-mono truncate">0x1a2b…ef3c</span>
      </div>

      <div className="h-px bg-white/12" aria-hidden="true" />

      {/* Actions */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex gap-2">
          <span className="glass-pill flex items-center gap-1 px-2.5 py-1 text-[0.6rem] font-normal text-white/65">
            <MessageCircle size={9} aria-hidden="true" />
            iMessage
          </span>
        </div>
        <span className="glass-pill flex items-center gap-1 px-2.5 py-1 text-[0.6rem] font-normal text-white/65">
          <Copy size={9} aria-hidden="true" />
          Copy link
        </span>
      </div>
    </motion.div>
  );
}
