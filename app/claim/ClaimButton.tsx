'use client';

import { motion } from 'framer-motion';
import { Wallet, AlertCircle } from 'lucide-react';
import { GaslessBadge } from '@/components/ui/Badge';
import type { ClaimStep } from '@/hooks/useClaim';

interface ClaimButtonProps {
  claimStep: ClaimStep;
  error: string | null;
  alreadyClaimed: boolean;
  onClaim: () => void;
}

function resolveLabel(step: ClaimStep, alreadyClaimed: boolean): string {
  if (alreadyClaimed) return 'Already claimed';
  switch (step) {
    case 'authenticating': return 'Authenticating…';
    case 'wallet-provisioning': return 'Setting up wallet…';
    case 'signing': return 'Signing…';
    case 'submitting': return 'Submitting…';
    case 'confirming': return 'Confirming…';
    case 'error': return 'Retry claim';
    default: return 'Claim to Wallet';
  }
}

const LOADING_STEPS: ClaimStep[] = [
  'authenticating', 'wallet-provisioning', 'signing', 'submitting', 'confirming',
];

export function ClaimButton({ claimStep, error, alreadyClaimed, onClaim }: ClaimButtonProps) {
  if (claimStep === 'success') return null;

  const isLoading = LOADING_STEPS.includes(claimStep);
  const isDisabled = alreadyClaimed || isLoading;
  const label = resolveLabel(claimStep, alreadyClaimed);

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      {/* CTA button */}
      <motion.button
        onClick={isDisabled ? undefined : onClaim}
        disabled={isDisabled}
        transition={{ duration: 0.15, ease: [0.34, 1.56, 0.64, 1] }}
        aria-label={label}
        className={[
          'btn-glass-primary w-full max-w-sm !justify-center !py-4 !text-base flex items-center gap-2',
          isDisabled ? 'opacity-50 !cursor-not-allowed' : '',
        ].join(' ')}
      >
        {isLoading ? (
          <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" aria-hidden="true" />
        ) : (
          <Wallet size={18} aria-hidden="true" />
        )}
        {label}
      </motion.button>

      {/* Gasless note */}
      {!alreadyClaimed && (
        <div className="flex items-center gap-2 text-xs text-white/45">
          <GaslessBadge />
          <span>No gas required — the Relayer pays for you</span>
        </div>
      )}

      {/* Error */}
      {claimStep === 'error' && error && (
        <motion.div
          role="alert"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-sm flex items-start gap-2 px-4 py-3 text-sm text-red-200
                     border-red-400/25 w-full max-w-sm"
        >
          <AlertCircle size={15} className="mt-0.5 shrink-0 text-red-300" aria-hidden="true" />
          <span>{error}</span>
        </motion.div>
      )}
    </div>
  );
}
