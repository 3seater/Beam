'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import Image from 'next/image';

export interface HeroSectionProps {
  onSendClick?: () => void;
}

const FEATURED_ASSETS = [
  { symbol: 'NVDA', name: 'NVIDIA', change: '+4.2%', positive: true, logoUrl: 'https://assets.parqet.com/logos/symbol/NVDA?format=png' },
  { symbol: 'AAPL', name: 'Apple', change: '+0.9%', positive: true, logoUrl: 'https://assets.parqet.com/logos/symbol/AAPL?format=png' },
  { symbol: 'TSLA', name: 'Tesla', change: '+1.8%', positive: true, logoUrl: 'https://assets.parqet.com/logos/symbol/TSLA?format=png' },
  { symbol: 'MSFT', name: 'Microsoft', change: '+1.1%', positive: true, logoUrl: 'https://assets.parqet.com/logos/symbol/MSFT?format=png' },
  { symbol: 'META', name: 'Meta Platforms', change: '+2.3%', positive: true, logoUrl: 'https://assets.parqet.com/logos/symbol/META?format=png' },
  { symbol: 'GOOGL', name: 'Alphabet', change: '-0.4%', positive: false, logoUrl: 'https://assets.parqet.com/logos/symbol/GOOGL?format=png' },
  { symbol: 'AMZN', name: 'Amazon', change: '+0.7%', positive: true, logoUrl: 'https://assets.parqet.com/logos/symbol/AMZN?format=png' },
  { symbol: 'SPCX', name: 'SpaceX', change: '+3.5%', positive: true, logoUrl: 'https://assets.parqet.com/logos/symbol/SPCX?format=png' },
  { symbol: 'ETH', name: 'Ethereum', change: '+2.7%', positive: true, logoUrl: 'https://coin-images.coingecko.com/coins/images/279/small/ethereum.png?1696501628' },
  { symbol: 'USDG', name: 'Global Dollar', change: '+0.0%', positive: true, logoUrl: 'https://coin-images.coingecko.com/coins/images/51281/small/GDN_USDG_Token_200x200.png?1730484111' },
  { symbol: 'MU', name: 'Micron Technology', change: '+1.4%', positive: true, logoUrl: 'https://assets.parqet.com/logos/symbol/MU?format=png' },
];

/** Logo with initials fallback */
function AssetLogo({ logoUrl, symbol, size = 36 }: { logoUrl: string; symbol: string; size?: number }) {
  const [err, setErr] = useState(false);
  if (err || !logoUrl) {
    return (
      <span
        className="rounded-xl flex items-center justify-center bg-white/15 border border-white/20 shrink-0 text-xs font-semibold text-white/80"
        style={{ width: size, height: size }}
      >
        {symbol.slice(0, 2).toUpperCase()}
      </span>
    );
  }
  return (
    <Image
      src={logoUrl} alt={symbol} width={size} height={size}
      className="rounded-xl object-contain bg-white/10 shrink-0"
      style={{ width: size, height: size }}
      onError={() => setErr(true)}
      unoptimized
    />
  );
}

/* ── Floating scrolling asset rows ──────────────────────────────────────── */
const ROW_H = 64;  // px per row (incl. gap)
const ROW_GAP = 8;   // gap between rows
const SCROLL_DURATION = `${FEATURED_ASSETS.length * 1.9}s`;

function AssetRows({ onAssetClick }: { onAssetClick: () => void }) {
  const doubled = [...FEATURED_ASSETS, ...FEATURED_ASSETS];
  const stripHeight = FEATURED_ASSETS.length * (ROW_H + ROW_GAP);

  return (
    <motion.div
      className="w-full select-none"
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.35 }}
      aria-label="Supported assets"
    >
      {/* Viewport — fades top & bottom so rows dissolve in/out */}
      <div
        className="relative overflow-hidden"
        style={{
          height: 5 * (ROW_H + ROW_GAP) - ROW_GAP,
          maskImage:
            'linear-gradient(to bottom, transparent 0%, black 14%, black 86%, transparent 100%)',
          WebkitMaskImage:
            'linear-gradient(to bottom, transparent 0%, black 14%, black 86%, transparent 100%)',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: ROW_GAP,
            animation: `hero-scroll ${SCROLL_DURATION} linear infinite`,
            willChange: 'transform',
          }}
        >
          {doubled.map((asset, i) => (
            <button
              key={`${asset.symbol}-${i}`}
              type="button"
              onClick={onAssetClick}
              className="flex w-full items-center justify-between px-4
                         glass hover:bg-white/20 transition-colors duration-150 shrink-0"
              style={{ height: ROW_H, borderRadius: 16 }}
              aria-label={`Send ${asset.name}`}
            >
              <div className="flex items-center gap-3">
                <AssetLogo logoUrl={asset.logoUrl} symbol={asset.symbol} size={36} />
                <div className="text-left">
                  <p className="text-sm font-medium text-white leading-tight">{asset.name}</p>
                  <p className="text-[11px] text-white/45 leading-tight mt-0.5">{asset.symbol}</p>
                </div>
              </div>
              <span
                className={[
                  'text-xs font-semibold rounded-full px-2.5 py-0.5 tabular-nums',
                  asset.positive
                    ? 'bg-emerald-500/30 text-emerald-200'
                    : 'bg-red-500/30 text-red-200',
                ].join(' ')}
              >
                {asset.change}
              </span>
            </button>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes hero-scroll {
          0%   { transform: translateY(0); }
          100% { transform: translateY(-${stripHeight}px); }
        }
      `}</style>
    </motion.div>
  );
}

/* ── Section ─────────────────────────────────────────────────────────────── */
export function HeroSection({ onSendClick }: HeroSectionProps) {
  const router = useRouter();
  const handleSend = useCallback(() => {
    if (onSendClick) { onSendClick(); } else { router.push('/send'); }
  }, [onSendClick, router]);

  return (
    <section
      id="hero"
      className="relative min-h-screen flex items-center overflow-hidden pt-24 pb-16"
      aria-label="Hero"
    >
      {/* Ambient glow left */}
      <div
        className="absolute top-0 left-0 w-[700px] h-[700px] pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at 30% 30%, rgba(255,255,255,0.14) 0%, transparent 65%)',
          filter: 'blur(60px)',
        }}
        aria-hidden="true"
      />
      {/* Ambient glow right */}
      <div
        className="absolute bottom-0 right-0 w-[500px] h-[500px] pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at 70% 70%, rgba(56,196,216,0.10) 0%, transparent 65%)',
          filter: 'blur(60px)',
        }}
        aria-hidden="true"
      />

      <div className="layout relative z-10 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.25fr] gap-8 lg:gap-10 items-center">

          {/* ── Left: headline + CTAs ───────────────────────────────── */}
          <div className="flex flex-col gap-7">

            <motion.h1
              className="text-[clamp(2.6rem,4.8vw,5.5rem)] font-semibold leading-[1.04] tracking-[-0.035em] text-white whitespace-nowrap"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
            >
              Send crypto<br />
              <span
                style={{
                  background: 'linear-gradient(135deg, #ffffff 0%, #a8dff7 55%, #4eb4f0 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                like a text.
              </span>
            </motion.h1>

            <motion.p
              className="text-xl sm:text-2xl text-white/60 leading-relaxed max-w-[38ch]"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay: 0.18 }}
            >
              Pick any stock or token, deposit it once, and share a link.
              The recipient claims it gaslessly — no wallet required.
            </motion.p>

            <motion.div
              className="flex flex-wrap items-center gap-3"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: 0.26 }}
            >
              <button
                onClick={handleSend}
                className="btn-glass-primary flex items-center gap-2 !px-9 !py-4 !text-lg"
                aria-label="Send a Beam"
              >
                Send a Beam
                <ArrowRight size={18} aria-hidden="true" />
              </button>
              <a
                href="#how-it-works"
                className="btn-glass-ghost !px-7 !py-4 !text-base"
                aria-label="How it works"
              >
                How it works
              </a>
            </motion.div>

            <motion.div
              className="flex flex-wrap gap-x-6 gap-y-2 pt-1"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.38 }}
            >
              {[
                { value: '10k+', label: 'Beams sent' },
                { value: '$500k+', label: 'Value transferred' },
                { value: '0 gas', label: 'For recipients' },
              ].map(({ value, label }) => (
                <div key={label} className="flex items-baseline gap-1.5">
                  <span className="text-base font-semibold text-white">{value}</span>
                  <span className="text-xs text-white/45">{label}</span>
                </div>
              ))}
            </motion.div>
          </div>

          {/* ── Right: floating asset rows ──────────────────────────── */}
          <div className="w-full max-w-lg mx-auto lg:mx-0 lg:ml-auto">
            <AssetRows onAssetClick={handleSend} />
          </div>
        </div>
      </div>
    </section>
  );
}
