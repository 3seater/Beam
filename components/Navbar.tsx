'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X } from 'lucide-react';

export interface NavbarProps {
  onSendClick?: () => void;
}

const NAV_LINKS = [
  { label: 'How it works', href: '#how-it-works', external: false },
  { label: 'FAQ', href: '#faq', external: false },
  { label: 'Docs', href: 'https://docs.beam.finance', external: true },
  { label: 'Twitter', href: 'https://twitter.com/beamfinance', external: true },
];

const LINK_STYLE: React.CSSProperties = {
  fontFamily: '-apple-system, BlinkMacSystemFont, "Inter", system-ui, sans-serif',
  fontSize: '15px',
  fontWeight: 400,
  letterSpacing: '0',
  whiteSpace: 'nowrap',
};

export function Navbar({ onSendClick }: NavbarProps) {
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 16);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const handleSend = useCallback(() => {
    setMobileOpen(false);
    if (onSendClick) { onSendClick(); } else { router.push('/send'); }
  }, [onSendClick, router]);

  const pillStyle: React.CSSProperties = {
    height: '56px',
    borderRadius: '999px',
    background: scrolled ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.18)',
    border: '1px solid rgba(255,255,255,0.28)',
    backdropFilter: 'blur(24px) saturate(1.6)',
    WebkitBackdropFilter: 'blur(24px) saturate(1.6)',
    boxShadow: scrolled
      ? '0 8px 32px rgba(10,74,110,0.28), inset 0 1px 0 rgba(255,255,255,0.38)'
      : '0 2px 16px rgba(10,74,110,0.15), inset 0 1px 0 rgba(255,255,255,0.32)',
    transition: 'box-shadow 300ms ease, background 300ms ease',
    padding: '0 8px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '2px',
  };

  return (
    <>
      <header
        className="fixed top-0 inset-x-0 z-50 flex justify-center pointer-events-none"
        style={{ paddingTop: '16px' }}
      >
        <motion.nav
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          aria-label="Main navigation"
          className="pointer-events-auto"
          style={pillStyle}
        >
          {/* Logo */}
          <a
            href="/"
            aria-label="Beam home"
            className="flex items-center justify-center rounded-full shrink-0
                       hover:bg-white/12 transition-colors duration-150
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
            style={{ width: '48px', height: '48px' }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/svg star.svg"
              alt="Beam"
              width={44}
              height={44}
              style={{ filter: 'brightness(0) invert(1)' }}
            />
          </a>

          {/* Separator */}
          <div
            className="hidden sm:block shrink-0 mx-2"
            style={{ width: '1px', height: '18px', background: 'rgba(255,255,255,0.20)' }}
            aria-hidden="true"
          />

          {/* Nav links */}
          <div className="hidden sm:flex items-center gap-0.5">
            {NAV_LINKS.map(({ label, href, external }) => (
              <a
                key={label}
                href={href}
                target={external ? '_blank' : undefined}
                rel={external ? 'noopener noreferrer' : undefined}
                className="rounded-full flex items-center
                           text-white/80 hover:text-white
                           hover:bg-white/12 transition-colors duration-150
                           focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                style={{ ...LINK_STYLE, padding: '0 14px', height: '40px' }}
              >
                {label}
              </a>
            ))}
          </div>

          {/* Separator */}
          <div
            className="hidden sm:block shrink-0 mx-2"
            style={{ width: '1px', height: '18px', background: 'rgba(255,255,255,0.20)' }}
            aria-hidden="true"
          />

          {/* CTA */}
          <button
            onClick={handleSend}
            className="hidden sm:flex items-center justify-center shrink-0
                       rounded-full transition-all duration-200
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40
                       cta-glow-border"
            style={{
              ...LINK_STYLE,
              color: 'rgba(255,255,255,0.95)',
              padding: '0 20px',
              height: '40px',
              background: 'rgba(255,255,255,0.14)',
              border: '1px solid rgba(255,255,255,0.25)',
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.22)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.14)'; }}
            aria-label="Send a Beam"
          >
            Send a Beam
          </button>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen((p) => !p)}
            className="sm:hidden ml-1 w-9 h-9 rounded-full flex items-center justify-center
                       border border-white/25 bg-white/10 text-white
                       hover:bg-white/20 transition-colors focus-visible:outline-none"
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          >
            {mobileOpen ? <X size={15} /> : <Menu size={15} />}
          </button>
        </motion.nav>
      </header>

      {/* Mobile dropdown */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            key="mobile-menu"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="fixed z-40 sm:hidden flex flex-col gap-0.5 p-2"
            style={{
              top: '80px', left: '16px', right: '16px',
              borderRadius: '18px',
              background: 'rgba(255,255,255,0.20)',
              border: '1px solid rgba(255,255,255,0.28)',
              backdropFilter: 'blur(24px) saturate(1.6)',
              WebkitBackdropFilter: 'blur(24px) saturate(1.6)',
              boxShadow: '0 8px 32px rgba(10,74,110,0.22)',
            }}
          >
            {NAV_LINKS.map(({ label, href, external }) => (
              <a
                key={label}
                href={href}
                target={external ? '_blank' : undefined}
                rel={external ? 'noopener noreferrer' : undefined}
                onClick={() => setMobileOpen(false)}
                className="px-4 py-3 rounded-2xl hover:bg-white/10 transition-colors"
                style={{ ...LINK_STYLE, fontSize: '14px' }}
              >
                {label}
              </a>
            ))}
            <div className="h-px bg-white/15 my-1" />
            <button
              onClick={handleSend}
              className="w-full py-3 rounded-2xl hover:bg-white/10 transition-colors"
              style={{
                ...LINK_STYLE,
                fontSize: '14px',
                color: 'rgba(255,255,255,0.90)',
                border: '1px solid rgba(255,255,255,0.28)',
                background: 'rgba(255,255,255,0.10)',
              }}
            >
              Send a Beam
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
