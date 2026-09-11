'use client';

import { useCallback, useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Send, Zap } from 'lucide-react';
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
function AssetLogo({ logoUrl, symbol, size = 40 }: { logoUrl: string; symbol: string; size?: number }) {
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
      src={logoUrl}
      alt={symbol}
      width={size}
      height={size}
      className="rounded-xl object-contain bg-white/10 shrink-0"
      style={{ width: size, height: size }}
      onError={() => setErr(true)}
      unoptimized
    />
  );
}

/* ── Animated asset card shown on the right ─────────────────────────────── */
const VISIBLE_COUNT = 4; // rows visible at once in the card
const INTERVAL_MS = 2200;

function AssetCard({ onAssetClick }: { onAssetClick: () => void }) {
  const [startIdx, setStartIdx] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Auto-scroll through assets
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setDirection(1);
      setStartIdx((prev) => (prev + 1) % FEATURED_ASSETS.length);
    }, INTERVAL_MS);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  // Circular slice of VISIBLE_COUNT items
  const visible = Array.from({ length: VISIBLE_COUNT }, (_, i) =>
    FEATURED_ASSETS[(startIdx + i) % FEATURED_ASSETS.length],
  );

  return (
    <motion.div
      className="glass-strong rounded-[28px] overflow-hidden w-full select-none"
      initial={{ opacity: 0, x: 40, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.35 }}
      aria-label="Supported assets preview"
    >
      {/* Card header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-white/15 border border-white/20 flex items-center justify-center">
            <Zap size={13} className="text-white/80" aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white leading-tight">Send a Beam</p>
            <p className="text-[11px] text-white/45 leading-tight">30+ stocks &amp; tokens</p>
          </div>
        </div>
        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-400/15 text-emerald-300 border border-emerald-400/20">
          Live
        </span>
      </div>

      {/* Scrolling asset rows */}
      <div className="relative overflow-hidden" style={{ height: `${VISIBLE_COUNT * 68}px` }}>
        <AnimatePresence initial={false} mode="popLayout">
          {visible.map((asset, i) => (
            <motion.button
              key={`${asset.symbol}-${startIdx}-${i}`}
              type="button"
              onClick={onAssetClick}
              className="flex w-full items-center justify-between px-5 py-3.5
                         hover:bg-white/8 transition-colors duration-150
                         border-b border-white/8 last:border-0"
              style={{ height: 68 }}
              initial={{ opacity: 0, y: direction > 0 ? 20 : -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: direction > 0 ? -20 : 20 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1], delay: i * 0.04 }}
              aria-label={`Send ${asset.name}`}
            >
              <div className="flex items-center gap-3">
                <AssetLogo logoUrl={asset.logoUrl} symbol={asset.symbol} size={38} />
                <div className="text-left">
                  <p className="text-sm font-medium text-white leading-tight">{asset.name}</p>
                  <p className="text-[11px] text-white/45 leading-tight mt-0.5">{asset.symbol}</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <span
                  className={[
                    'text-xs font-medium rounded-full px-2 py-0.5 tabular-nums',
                    asset.positive
                      ? 'bg-emerald-400/15 text-emerald-300'
                      : 'bg-red-400/15 text-red-300',
                  ].join(' ')}
                >
                  {asset.change}
                </span>
                <ArrowRight size={13} className="text-white/25" aria-hidden="true" />
              </div>
            </motion.button>
          ))}
        </AnimatePresence>
      </div>

      {/* Card footer CTA */}
      <div className="px-5 py-4 border-t border-white/10">
        <button
          type="button"
          onClick={onAssetClick}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl
                     bg-white/12 hover:bg-white/20 border border-white/20 hover:border-white/35
                     text-sm font-medium text-white transition-all duration-150"
        >
          <Send size={13} aria-hidden="true" />
          Send any asset as a link
        </button>
      </div>
    </motion.div>
  );
}

/* ── Pill badges shown near headline ────────────────────────────────────── */
function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full
                     bg-white/10 border border-white/20 text-xs text-white/70">
      {children}
    </span>
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
        {/* Two-column grid: text left, card right */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">

          {/* ── Left: headline + CTAs ─────────────────────────────────── */}
          <div className="flex flex-col gap-7">

            {/* Badge row */}
            <motion.div
              className="flex flex-wrap gap-2"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: 0.05 }}
            >
              <Pill>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
                Gasless for recipients
              </Pill>
              <Pill>30+ assets</Pill>
              <Pill>Robinhood Chain</Pill>
            </motion.div>

            {/* Headline */}
            <motion.h1
              className="text-[clamp(2.8rem,6vw,5.5rem)] font-semibold leading-[1.04] tracking-[-0.035em] text-white"
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

            {/* Sub-copy */}
            <motion.p
              className="text-lg sm:text-xl text-white/60 leading-relaxed max-w-[38ch]"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay: 0.18 }}
            >
              Pick any stock or token, deposit it once, and share a link.
              The recipient claims it gaslessly — no wallet required.
            </motion.p>

            {/* CTAs */}
            <motion.div
              className="flex flex-wrap items-center gap-3"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: 0.26 }}
            >
              <button
                onClick={handleSend}
                className="btn-glass-primary flex items-center gap-2 !px-8 !py-3.5 !text-base"
                aria-label="Send a Beam"
              >
                Send a Beam
                <ArrowRight size={16} aria-hidden="true" />
              </button>
              <a
                href="#how-it-works"
                className="btn-glass-ghost !px-6 !py-3.5 !text-sm"
                aria-label="How it works"
              >
                How it works
              </a>
            </motion.div>

            {/* Social proof / stats */}
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

          {/* ── Right: animated asset card ───────────────────────────── */}
          <div className="w-full max-w-sm mx-auto lg:mx-0 lg:ml-auto">
            <AssetCard onAssetClick={handleSend} />
          </div>
        </div>
      </div>
    </section>
  );
}
