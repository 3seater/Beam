'use client';

import {
  useEffect,
  useRef,
  useCallback,
  type ReactNode,
  type KeyboardEvent,
} from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  className?: string;
}

/* ── Variants ──────────────────────────────────────────────────────────────── */
const backdropV = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
};

const panelV = {
  hidden: { opacity: 0, scale: 0.88, y: 28 },
  visible: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.92, y: 16 },
};

const springTransition = {
  type: 'spring' as const,
  stiffness: 340,
  damping: 28,
  mass: 0.9,
};

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), ' +
  'textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function getFocusable(el: HTMLElement) {
  return Array.from(el.querySelectorAll<HTMLElement>(FOCUSABLE));
}

/* ── Component ─────────────────────────────────────────────────────────────── */
export function Modal({ isOpen, onClose, title, children, className = '' }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useRef(`modal-title-${Math.random().toString(36).slice(2)}`).current;
  const triggerRef = useRef<Element | null>(null);

  /* Remember trigger so we can restore focus on close */
  useEffect(() => {
    if (isOpen) triggerRef.current = document.activeElement;
  }, [isOpen]);

  /* Auto-focus first focusable element */
  useEffect(() => {
    if (!isOpen) return;
    const raf = requestAnimationFrame(() => {
      const panel = panelRef.current;
      if (!panel) return;
      const els = getFocusable(panel);
      (els[0] ?? panel).focus();
    });
    return () => cancelAnimationFrame(raf);
  }, [isOpen]);

  /* Return focus on close */
  useEffect(() => {
    if (!isOpen && triggerRef.current instanceof HTMLElement) {
      triggerRef.current.focus();
    }
  }, [isOpen]);

  /* Escape key */
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  /* Lock scroll — compensate scrollbar width to prevent page shift */
  useEffect(() => {
    if (isOpen) {
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.overflow = 'hidden';
      document.body.style.paddingRight = `${scrollbarWidth}px`;
      // Also offset the fixed navbar so it doesn't jump
      const navbar = document.querySelector<HTMLElement>('header[class*="fixed"]');
      if (navbar) navbar.style.paddingRight = `${scrollbarWidth}px`;
    } else {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
      const navbar = document.querySelector<HTMLElement>('header[class*="fixed"]');
      if (navbar) navbar.style.paddingRight = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
      const navbar = document.querySelector<HTMLElement>('header[class*="fixed"]');
      if (navbar) navbar.style.paddingRight = '';
    };
  }, [isOpen]);

  /* Tab trap */
  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Tab') return;
    const panel = panelRef.current;
    if (!panel) return;
    const els = getFocusable(panel);
    if (!els.length) return;
    const first = els[0];
    const last = els[els.length - 1];
    if (e.shiftKey) {
      if (document.activeElement === first) { e.preventDefault(); last.focus(); }
    } else {
      if (document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }, []);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        /* ── Backdrop ────────────────────────────────────────────────────── */
        <motion.div
          key="modal-backdrop"
          variants={backdropV}
          initial="hidden"
          animate="visible"
          exit="exit"
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={onClose}
          aria-hidden="true"
        >
          {/* Blur layer — separate element so it doesn't create a stacking
              context that traps third-party portals (e.g. Privy wallet modal) */}
          <div
            className="absolute inset-0 -z-10"
            style={{
              backdropFilter: 'blur(20px) saturate(1.4)',
              WebkitBackdropFilter: 'blur(20px) saturate(1.4)',
              backgroundColor: 'rgba(10, 40, 70, 0.45)',
            }}
            aria-hidden="true"
          />
          {/* ── Panel ─────────────────────────────────────────────────────── */}
          <motion.div
            ref={panelRef}
            key="modal-panel"
            variants={panelV}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={springTransition}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            onKeyDown={handleKeyDown}
            tabIndex={-1}
            className={[
              /* Mobile: slide-up sheet; Desktop: centered card */
              'glass-strong relative w-full outline-none beam-modal',
              'rounded-t-[28px] sm:rounded-[28px]',
              'sm:max-w-lg',
              className,
            ].join(' ')}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drag handle (mobile only) */}
            <div className="sm:hidden flex justify-center pt-3 pb-1" aria-hidden="true">
              <div className="w-10 h-1 rounded-full bg-white/30" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-4 pb-3 border-b border-white/15">
              <h2
                id={titleId}
                className="text-base font-medium text-white tracking-tight"
              >
                {title}
              </h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="btn-glass-icon !w-8 !h-8"
              >
                <X size={16} aria-hidden="true" />
              </button>
            </div>

            {/* Content — scrollable only if viewport is very small */}
            <div className="px-6 py-5 overflow-y-auto max-h-[85vh]">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
