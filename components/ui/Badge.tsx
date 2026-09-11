'use client';

import { type ReactNode } from 'react';
import { Zap, Link2 } from 'lucide-react';

export type BadgeVariant = 'chain' | 'gasless' | 'status' | 'success' | 'warn';

export interface BadgeProps {
  variant?: BadgeVariant;
  label?: string;
  icon?: ReactNode;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  chain: 'bg-white/15 border-white/30 text-white/90',
  gasless: 'bg-white/15 border-white/30 text-white/90',
  status: 'bg-white/10 border-white/20 text-white/75',
  success: 'bg-emerald-400/15 border-emerald-300/30 text-emerald-100',
  warn: 'bg-amber-400/15  border-amber-300/30  text-amber-100',
};

const defaultLabels: Record<BadgeVariant, string> = {
  chain: 'Robinhood Chain',
  gasless: 'Gasless',
  status: '',
  success: '',
  warn: '',
};

function DefaultIcon({ variant }: { variant: BadgeVariant }) {
  if (variant === 'chain') return <Link2 size={10} aria-hidden="true" className="shrink-0" />;
  if (variant === 'gasless') return <Zap size={10} aria-hidden="true" className="shrink-0" />;
  return null;
}

export function Badge({ variant = 'status', label, icon, className = '' }: BadgeProps) {
  const resolvedLabel = label ?? defaultLabels[variant];
  return (
    <span
      className={[
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5',
        'text-[0.6875rem] font-normal leading-none select-none',
        'backdrop-blur-sm',
        variantStyles[variant],
        className,
      ].join(' ')}
    >
      {icon ?? <DefaultIcon variant={variant} />}
      {resolvedLabel}
    </span>
  );
}

export function ChainBadge({ className }: { className?: string }) {
  return <Badge variant="chain" className={className} />;
}

export function GaslessBadge({ className }: { className?: string }) {
  return <Badge variant="gasless" className={className} />;
}
