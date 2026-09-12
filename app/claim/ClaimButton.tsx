'use client';

import { motion } from 'framer-motion';
import { Wallet, AlertCircle } from 'lucide-react';
import { ICON_SIZE } from '@/lib/icons';
import { Button } from '@/components/ui/Button';
import type { ClaimStep } from '@/hooks/useClaim';

interface ClaimButtonProps {
  claimStep: ClaimStep;
  error: string | null;
  alreadyClaimed: boolean;
  onClaim: () => void;
}

const LOADING_STEPS: ClaimStep[] = [
  'authenticating', 'wallet-provisioning', 'signing', 'submitting', 'confirming',
];

/** Human-readable label for each loading phase — shown as the loadingLabel */
function loadingLabel(step: ClaimStep): string {
  switch (step) {
    case 'authenticating': return 'Authenticating';
    case 'wallet-provisioning': return 'Setting up wallet';
    case 'signing': return 'Signing';
    case 'submitting': return 'Submitting';
    case 'confirming': return 'Confirming';
    default: return 'Working';
  }
}

export function ClaimButton({ claimStep, error, alreadyClaimed, onClaim }: ClaimButtonProps) {
  if (claimStep === 'success') return null;

  const isLoading = LOADING_STEPS.includes(claimStep);
  const isError = claimStep === 'error';

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      {/* CTA button */}
      <Button
        variant="primary"
        size="lg"
        isLoading={isLoading}
        loadingLabel={isLoading ? loadingLabel(claimStep) : undefined}
        disabled={alreadyClaimed}
        onClick={isLoading || alreadyClaimed ? undefined : onClaim}
        leftIcon={<Wallet size={ICON_SIZE.md} aria-hidden="true" />}
        aria-label={alreadyClaimed ? 'Already claimed' : isError ? 'Retry claim' : 'Claim to wallet'}
        className="w-full !justify-center !py-4 !text-base"
      >
        {alreadyClaimed ? 'Already claimed' : isError ? 'Retry claim' : 'Claim to Wallet'}
      </Button>

      {/* Gasless note */}
      {!alreadyClaimed && (
        <p className="text-xs text-white/45">
          Recipients claim gaslessly — no gas, no wallet.
        </p>
      )}

      {/* Error */}
      {isError && error && (
        <motion.div
          role="alert"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-sm flex items-start gap-2 px-4 py-3 text-sm text-red-200
                     border-red-400/25 w-full"
        >
          <AlertCircle size={ICON_SIZE.sm} className="mt-0.5 shrink-0 text-red-300" aria-hidden="true" />
          <span>{error}</span>
        </motion.div>
      )}
    </div>
  );
}
