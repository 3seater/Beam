'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { createPortal } from 'react-dom';
import { AnimatePresence } from 'framer-motion';
import { Menu, X, ArrowUpRight } from 'lucide-react';
import { useAccount } from 'wagmi';
import { usePrivy } from '@privy-io/react-auth';
import { WalletDropdown } from './WalletDropdown';
import { BeamMark } from './BeamMark';
export interface NavbarProps {
  onSendClick?: () => void;
}
const LINK_STYLE = {
  fontFamily: 'inherit'
};
function AccountChip() {
  const {
    address,
    isConnected,
    status
  } = useAccount();
  const {
    ready,
    connectWallet
  } = usePrivy();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const chipRef = useRef<HTMLButtonElement>(null);
  useEffect(() => setMounted(true), []);

  // During SSR / before hydration, render a stable placeholder so the
  // pill never flashes or disappears between page navigations.
  // `ready` = Privy has finished reading its session from storage — must be
  // true before we show "Connect", otherwise it flashes on every navigation.
  const hydrated = mounted && ready && status !== 'connecting' && status !== 'reconnecting';
  const chipStyle: React.CSSProperties = {
    position: 'relative',
    top: 'auto',
    right: 'auto',
    zIndex: 50,
    height: '40px',
    borderRadius: '999px',
    background: open ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.15)',
    border: '1px solid rgba(255,255,255,0.28)',
    backdropFilter: 'blur(24px) saturate(1.6)',
    WebkitBackdropFilter: 'blur(24px) saturate(1.6)',
    boxShadow: '0 2px 16px rgba(10,74,110,0.15), inset 0 1px 0 rgba(255,255,255,0.32)',
    display: 'inline-flex',
    alignItems: 'center',
    transition: 'background 200ms ease',
    cursor: 'pointer'
  };
  const labelStyle: React.CSSProperties = {
    fontSize: '13px',
    fontFamily: LINK_STYLE.fontFamily,
    whiteSpace: 'nowrap'
  };

  // Placeholder while hydrating — same size, no text flash
  if (!mounted) {
    return <div style={{
      ...chipStyle,
      width: '120px',
      opacity: 0.5
    }} className="beam-skeleton" aria-hidden="true" />;
  }

  // Not connected
  if (!hydrated || !isConnected || !address) {
    return <button type="button" onClick={() => connectWallet()} style={{
      ...chipStyle,
      padding: '0 18px'
    }} className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40
                   hover:bg-white/20" aria-label="Connect wallet">
      <span style={{
        ...labelStyle,
        color: '#24466b'
      }}>
        Connect wallet
      </span>
    </button>;
  }

  // Connected
  const short = `${address.slice(0, 6)}…${address.slice(-4)}`;
  return <>
    <button ref={chipRef} type="button" onClick={() => setOpen(p => !p)} style={{
      ...chipStyle,
      padding: '0 18px'
    }} className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40" aria-label="Open wallet menu" aria-expanded={open}>
      <span style={{
        ...labelStyle,
        color: '#24466b'
      }}>
        {short}
      </span>
    </button>

    {createPortal(<AnimatePresence>
      {open && <WalletDropdown address={address} triggerRef={chipRef} onClose={() => setOpen(false)} />}
    </AnimatePresence>, document.body)}
  </>;
}
export function Navbar({
  onSendClick
}: NavbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);
  useEffect(() => {
    const close = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false);
    };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, []);
  const send = () => {
    setMobileOpen(false);
    if (onSendClick) {
      onSendClick();
    } else {
      router.push('/send');
    }
  };
  return <header className="premium-header"><div className="header-wallet"><AccountChip /></div><nav className="premium-nav" aria-label="Main navigation"><Link href="/" className="beam-wordmark" aria-label="Beam home"><BeamMark />beam</Link><div className="nav-links"><Link href="/#how-it-works">How it works</Link><Link href="/#faq">FAQ</Link><Link href="/docs">Docs</Link><a href="https://x.com/use_beam" target="_blank" rel="noopener noreferrer">Twitter</a></div><div className="nav-actions"><button onClick={send} className="premium-button nav-send">Send a Beam <ArrowUpRight size={15} /></button><button className="mobile-toggle" aria-label={mobileOpen ? 'Close navigation' : 'Open navigation'} aria-expanded={mobileOpen} aria-controls="mobile-navigation" onClick={() => setMobileOpen(v => !v)}>{mobileOpen ? <X size={20} /> : <Menu size={20} />}</button></div></nav>{mobileOpen && <div className="mobile-navigation" id="mobile-navigation"><Link href="/#how-it-works" onClick={() => setMobileOpen(false)}>How it works</Link><Link href="/#why-beam" onClick={() => setMobileOpen(false)}>Why Beam</Link><Link href="/#faq" onClick={() => setMobileOpen(false)}>FAQ</Link><Link href="/history">Your Beams</Link><button className="premium-button" onClick={send}>Send a Beam <ArrowUpRight size={16} /></button></div>}</header>;
}
