'use client';

import { useState, useCallback } from 'react';
import { Copy, Check, MessageCircle, X as XIcon, Send, Phone } from 'lucide-react';
import { ICON_SIZE } from '@/lib/icons';

export interface BeamLinkDisplayProps {
  beamLink: string;
  className?: string;
}

const SHARE_MESSAGE = 'You received a Beam — claim your tokens with just a social login. No wallet needed:';

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
    icon: <MessageCircle size={ICON_SIZE.sm} aria-hidden="true" />,
    href: (link) => `sms:&body=${encodeURIComponent(`${SHARE_MESSAGE}\n${link}`)}`,
  },
  {
    label: 'X',
    icon: <XIcon size={ICON_SIZE.sm} aria-hidden="true" />,
    href: (link) =>
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(`${SHARE_MESSAGE}\n${link}`)}`,
  },
  {
    label: 'WhatsApp',
    icon: <Phone size={ICON_SIZE.sm} aria-hidden="true" />,
    href: (link) =>
      `https://wa.me/?text=${encodeURIComponent(`${SHARE_MESSAGE}\n${link}`)}`,
  },
  {
    label: 'Telegram',
    icon: <Send size={ICON_SIZE.sm} aria-hidden="true" />,
    href: (link) =>
      `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(SHARE_MESSAGE)}`,
  },
];

export function BeamLinkDisplay({ beamLink, className = '' }: BeamLinkDisplayProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(beamLink);
    } catch {
      const el = Object.assign(document.createElement('textarea'), { value: beamLink });
      Object.assign(el.style, { position: 'fixed', opacity: '0' });
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [beamLink]);

  return (
    <div className={`flex flex-col gap-4 ${className}`}>

      {/* Link + copy button */}
      <div className="flex items-stretch gap-2">
        <div
          className="glass-sm flex min-w-0 flex-1 items-center px-3 py-2.5"
          aria-label="Beam link"
        >
          <span className="truncate font-mono text-xs text-white/70">{beamLink}</span>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          aria-label={copied ? 'Copied!' : 'Copy link'}
          className={[
            'glass-sm shrink-0 flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium',
            'transition-all duration-200 focus-visible:outline-none whitespace-nowrap',
            copied
              ? 'bg-emerald-400/20 border-emerald-300/40 text-emerald-200'
              : 'hover:bg-white/20 text-white/70 hover:text-white',
          ].join(' ')}
        >
          {copied
            ? <><Check size={ICON_SIZE.xs} aria-hidden="true" /> Copied</>
            : <><Copy size={ICON_SIZE.xs} aria-hidden="true" /> Copy</>
          }
        </button>
      </div>

      {/* Share buttons */}
      <div className="flex flex-col gap-2">
        <p className="text-xs text-white/50">Share via</p>
        <div className="flex items-center gap-2">
          {SHARE_CHANNELS.map(({ label, icon, href }) => (
            <a
              key={label}
              href={href(beamLink)}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Share via ${label}`}
              className="flex flex-col items-center gap-1.5 group"
            >
              <span
                className={[
                  'flex items-center justify-center w-10 h-10 rounded-xl',
                  'glass-sm text-white/70',
                  'group-hover:bg-white/20 group-hover:text-white transition-all duration-150',
                ].join(' ')}
              >
                {icon}
              </span>
              <span className="text-[11px] text-white/50 group-hover:text-white/70 transition-colors">
                {label}
              </span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
