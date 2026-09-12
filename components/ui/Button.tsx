'use client';

import {
  forwardRef,
  type ButtonHTMLAttributes,
  type PropsWithChildren,
  type ReactNode,
} from 'react';
import { motion, type MotionProps } from 'framer-motion';
import { Loader2 } from 'lucide-react';

export type ButtonVariant = 'primary' | 'ghost' | 'link';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps
  extends PropsWithChildren<
    Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof MotionProps>
  > {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  /** Override the label shown while loading. Defaults to children. */
  loadingLabel?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  'aria-label'?: string;
}

/* Map variants → CSS class from globals.css */
const variantClass: Record<ButtonVariant, string> = {
  primary: 'btn-glass-primary',
  ghost: 'btn-glass-ghost',
  link:
    'inline-flex items-center justify-center gap-1.5 rounded bg-transparent ' +
    'text-white/80 font-medium underline-offset-4 ' +
    'hover:underline hover:text-white transition-colors ' +
    'focus-visible:outline-none disabled:opacity-40 disabled:cursor-not-allowed',
};

const sizeClass: Record<ButtonSize, string> = {
  sm: '!px-4 !py-1.5 !text-sm',
  md: '!px-6 !py-2.5 !text-[0.9375rem]',
  lg: '!px-7 !py-3 !text-base',
};

const spinnerSize: Record<ButtonSize, number> = { sm: 14, md: 16, lg: 18 };

/** Three bouncing dots shown inline while loading */
function LoadingDots() {
  return (
    <span className="btn-dots flex items-center gap-[3px] ml-1" aria-hidden="true">
      <span />
      <span />
      <span />
    </span>
  );
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      isLoading = false,
      loadingLabel,
      leftIcon,
      rightIcon,
      disabled,
      className = '',
      children,
      ...rest
    },
    ref,
  ) => {
    const isDisabled = disabled || isLoading;

    const cls = [
      variantClass[variant],
      variant !== 'link' ? sizeClass[size] : '',
      // shimmer sweep + cursor:wait when loading (primary only — ghost has no fill to sweep)
      isLoading && variant === 'primary' ? 'btn-loading' : '',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    const label = isLoading && loadingLabel ? loadingLabel : children;

    return (
      <motion.button
        ref={ref}
        className={cls}
        disabled={isDisabled}
        aria-disabled={isDisabled || undefined}
        aria-busy={isLoading || undefined}
        whileHover={!isDisabled ? { scale: 1.04 } : undefined}
        whileTap={!isDisabled ? { scale: 0.96 } : undefined}
        transition={{ duration: 0.15, ease: [0.34, 1.56, 0.64, 1] }}
        {...rest}
      >
        {/* Icon slot: spinner when loading, otherwise leftIcon */}
        {isLoading ? (
          <span className="shrink-0" aria-hidden="true">
            <Loader2 className="animate-spin" size={spinnerSize[size]} />
          </span>
        ) : (
          leftIcon && <span className="shrink-0" aria-hidden="true">{leftIcon}</span>
        )}

        {/* Label + bouncing dots */}
        <span className="flex items-center">
          {label}
          {isLoading && <LoadingDots />}
        </span>

        {/* Right icon — hidden while loading so dots have breathing room */}
        {!isLoading && rightIcon && (
          <span className="shrink-0" aria-hidden="true">{rightIcon}</span>
        )}
      </motion.button>
    );
  },
);

Button.displayName = 'Button';
