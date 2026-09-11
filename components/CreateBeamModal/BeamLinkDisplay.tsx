'use client';

import { useState, useCallback } from 'react';
import { Copy, Check } from 'lucide-react';
import {
  TwitterShareButton, TwitterIcon,
  WhatsappShareButton, WhatsappIcon,
  TelegramShareButton, TelegramIcon,
} from 'react-share';

export interface BeamLinkDisplayProps {
  beamLink: string;
  className?: string;
}

const SHARE_MESSAGE = 'You received a Beam — claim your tokens with just a social login. No wallet needed:';
const ICON_SIZE = 40;
const BORDER_RADIUS = 10;

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

  // iMessage uses the SMS URL scheme — not in react-share, handled manually
  const iMessageUrl = `sms:&body=${encodeURIComponent(`${SHARE_MESSAGE}\n${beamLink}`)}`;

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
            ? <><Check size={13} aria-hidden="true" /> Copied</>
            : <><Copy size={13} aria-hidden="true" /> Copy</>
          }
        </button>
      </div>

      {/* Share buttons */}
      <div className="flex flex-col gap-2">
        <p className="text-xs text-white/40">Share via</p>
        <div className="flex items-center gap-3">

          {/* iMessage — SMS scheme, manual */}
          <a
            href={iMessageUrl}
            aria-label="Share via iMessage"
            className="opacity-90 hover:opacity-100 transition-opacity"
          >
            <span className="flex flex-col items-center gap-1">
              <span
                className="flex items-center justify-center rounded-[10px] text-white text-lg font-bold"
                style={{ width: ICON_SIZE, height: ICON_SIZE, background: '#34C759' }}
                aria-hidden="true"
              >
                &#9993;
              </span>
              <span className="text-[10px] text-white/50">iMessage</span>
            </span>
          </a>

          {/* X / Twitter */}
          <span className="flex flex-col items-center gap-1">
            <TwitterShareButton
              url={beamLink}
              title={SHARE_MESSAGE}
              aria-label="Share via X"
            >
              <TwitterIcon size={ICON_SIZE} borderRadius={BORDER_RADIUS} />
            </TwitterShareButton>
            <span className="text-[10px] text-white/50">X</span>
          </span>

          {/* WhatsApp */}
          <span className="flex flex-col items-center gap-1">
            <WhatsappShareButton
              url={beamLink}
              title={SHARE_MESSAGE}
              aria-label="Share via WhatsApp"
            >
              <WhatsappIcon size={ICON_SIZE} borderRadius={BORDER_RADIUS} />
            </WhatsappShareButton>
            <span className="text-[10px] text-white/50">WhatsApp</span>
          </span>

          {/* Telegram */}
          <span className="flex flex-col items-center gap-1">
            <TelegramShareButton
              url={beamLink}
              title={SHARE_MESSAGE}
              aria-label="Share via Telegram"
            >
              <TelegramIcon size={ICON_SIZE} borderRadius={BORDER_RADIUS} />
            </TelegramShareButton>
            <span className="text-[10px] text-white/50">Telegram</span>
          </span>

        </div>
      </div>
    </div>
  );
}
