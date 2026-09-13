'use client';

import { useState, useCallback, useEffect } from 'react';
import { Copy, Check } from 'lucide-react';
import { ShareAppIcon } from '@/components/ShareAppIcon';

export interface BeamLinkDisplayProps {
  beamLink: string;
  className?: string;
}

const SHARE_MESSAGE = 'You received a Beam. Open the link, sign in, and claim. No existing wallet needed:';

/* ── Share channel config ────────────────────────────────────────────────── */
interface ShareChannel {
  label: string;
  icon: React.ReactNode;
  /** Returns the URL to open, or null if handled via onClick */
  href: (link: string) => string;
}

const SHARE_CHANNELS: ShareChannel[] = [
  {
    label: 'iMessage',
    icon: <ShareAppIcon app="messages" />,
    href: (link) => `sms:&body=${encodeURIComponent(`${SHARE_MESSAGE}\n${link}`)}`,
  },
  {
    label: 'X',
    icon: <ShareAppIcon app="x" />,
    href: (link) =>
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(`${SHARE_MESSAGE}\n${link}`)}`,
  },
  {
    label: 'WhatsApp',
    icon: <ShareAppIcon app="whatsapp" />,
    href: (link) =>
      `https://wa.me/?text=${encodeURIComponent(`${SHARE_MESSAGE}\n${link}`)}`,
  },
  {
    label: 'Telegram',
    icon: <ShareAppIcon app="telegram" />,
    href: (link) =>
      `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(SHARE_MESSAGE)}`,
  },
];

export function BeamLinkDisplay({ beamLink, className = '' }: BeamLinkDisplayProps) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2200);
    return () => clearTimeout(timer);
  }, [copied]);

  const handleCopy = useCallback(async () => {
    setCopyError(false);
    try {
      try { await navigator.clipboard.writeText(beamLink); }
      catch {
        const el = Object.assign(document.createElement('textarea'), { value: beamLink });
        Object.assign(el.style, { position: 'fixed', opacity: '0' });
        document.body.appendChild(el);
        try { el.select(); if (!document.execCommand('copy')) throw new Error('Copy failed'); }
        finally { el.remove(); }
      }
      setCopied(true);
    } catch { setCopyError(true); }
  }, [beamLink]);

  return <div className={`receipt-sharing ${className}`}>
    <button type="button" onClick={handleCopy} className="premium-button receipt-copy" aria-label={copied ? 'Copied!' : 'Copy link'}>{copied ? <Check size={17} /> : <Copy size={16} />}{copied ? 'Link copied' : 'Copy Beam link'}</button>
    <span className="sr-only" role="status">{copied ? 'Beam link copied to clipboard.' : ''}</span>
    {copyError && <div role="alert" className="receipt-copy-error"><p>Couldn’t copy. Select your link below.</p><input aria-label="Your Beam link" readOnly value={beamLink} onFocus={e => e.currentTarget.select()} /></div>}
    <div className="receipt-channels">{SHARE_CHANNELS.map(({ label, icon, href }) => <a key={label} href={href(beamLink)} target="_blank" rel="noopener noreferrer" aria-label={`Share via ${label}`}><span>{icon}</span>{label}</a>)}</div>
    <p className="receipt-private">Anyone with this link can claim. Share it privately.</p>
  </div>;
}
