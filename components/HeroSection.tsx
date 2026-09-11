'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Search, ArrowRight } from 'lucide-react';
import Image from 'next/image';

export interface HeroSectionProps {
  onSendClick?: () => void;
}

/** Matches the POPULAR_SYMBOLS order in lib/robinhood-tokens.ts + ETH */
const FEATURED_ASSETS = [
  { symbol: 'ETH', name: 'Ethereum', change: '+2.7%', positive: true, logoUrl: 'https://coin-images.coingecko.com/coins/images/279/small/ethereum.png?1696501628' },
  { symbol: 'NVDA', name: 'NVIDIA', change: '+4.2%', positive: true, logoUrl: 'https://assets.parqet.com/logos/symbol/NVDA?format=png' },
  { symbol: 'AAPL', name: 'Apple', change: '+0.9%', positive: true, logoUrl: 'https://assets.parqet.com/logos/symbol/AAPL?format=png' },
  { symbol: 'TSLA', name: 'Tesla', change: '+1.8%', positive: true, logoUrl: 'https://assets.parqet.com/logos/symbol/TSLA?format=png' },
  { symbol: 'MSFT', name: 'Microsoft', change: '+1.1%', positive: true, logoUrl: 'https://assets.parqet.com/logos/symbol/MSFT?format=png' },
  { symbol: 'META', name: 'Meta Platforms', change: '+2.3%', positive: true, logoUrl: 'https://assets.parqet.com/logos/symbol/META?format=png' },
  { symbol: 'GOOGL', name: 'Alphabet', change: '-0.4%', positive: false, logoUrl: 'https://assets.parqet.com/logos/symbol/GOOGL?format=png' },
  { symbol: 'AMZN', name: 'Amazon', change: '+0.7%', positive: true, logoUrl: 'https://assets.parqet.com/logos/symbol/AMZN?format=png' },
  { symbol: 'SPCX', name: 'SpaceX', change: '+3.5%', positive: true, logoUrl: 'https://assets.parqet.com/logos/symbol/SPCX?format=png' },
  { symbol: 'MU', name: 'Micron Technology', change: '+1.4%', positive: true, logoUrl: 'https://assets.parqet.com/logos/symbol/MU?format=png' },
  { symbol: 'USDG', name: 'Global Dollar', change: '+0.0%', positive: true, logoUrl: 'https://coin-images.coingecko.com/coins/images/51281/small/GDN_USDG_Token_200x200.png?1730484111' },
];

/** Logo with text-initials fallback — mirrors TokenLogo in TokenPicker.tsx */
function AssetLogo({ logoUrl, symbol }: { logoUrl: string; symbol: string }) {
  const [err, setErr] = useState(false);
  const initials = symbol.slice(0, 2).toUpperCase();

  if (err || !logoUrl) {
    return (
      <span
        className="w-10 h-10 rounded-xl flex items-center justify-center
                   bg-white/15 border border-white/20 shrink-0
                   text-xs font-medium text-white/70"
        aria-hidden="true"
      >
        {initials}
      </span>
    );
  }

  return (
    <Image
      src={logoUrl}
      alt={symbol}
      width={40}
      height={40}
      className="w-10 h-10 rounded-xl object-contain bg-white/10 shrink-0"
      onError={() => setErr(true)}
      unoptimized
      aria-hidden="true"
    />
  );
}

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0 },
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06, delayChildren: 0.25 } },
};

const itemFade = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
};

export function HeroSection({ onSendClick }: HeroSectionProps) {
  const router = useRouter();
  const handleSend = useCallback(() => {
    if (onSendClick) { onSendClick(); } else { router.push('/send'); }
  }, [onSendClick, router]);

  return (
    <section
      id="hero"
      className="relative min-h-screen flex flex-col items-center justify-center
                 pt-36 pb-24 overflow-hidden"
      aria-label="Hero"
    >
      {/* Ambient glow */}
      <div
        className="absolute top-10 left-1/2 -translate-x-1/2 w-[1000px] h-[500px]
                   rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(255,255,255,0.20) 0%, transparent 65%)',
          filter: 'blur(56px)',
        }}
        aria-hidden="true"
      />

      {/* Wider container — matches reference ~700px wide card */}
      <div className="layout relative z-10 flex flex-col items-center gap-10">

        {/* Headline */}
        <motion.h1
          className="text-hero text-center text-balance"
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
        >
          Send crypto<br />
          <span className="text-sky-gradient">like a text.</span>
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          className="text-center text-white/65 text-xl sm:text-2xl max-w-[34ch] text-balance leading-relaxed"
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
        >
          Choose a stock or token, deposit it, and share a link.
          Recipients claim gaslessly — no wallet needed.
        </motion.p>

        {/* CTAs */}
        <motion.div
          className="flex items-center gap-4"
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}
        >
          <button
            onClick={handleSend}
            className="btn-glass-primary flex items-center gap-2 !px-8 !py-3.5 !text-lg"
            aria-label="Send a Beam"
          >
            Send a Beam
            <ArrowRight size={18} aria-hidden="true" />
          </button>
          <a
            href="#how-it-works"
            className="btn-glass-ghost !px-7 !py-3.5 !text-base"
            aria-label="How it works"
          >
            How it works
          </a>
        </motion.div>

        {/* Asset search card */}
        <motion.div
          className="glass w-full"
          style={{ padding: '8px' }}
          initial={{ opacity: 0, y: 36, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1], delay: 0.4 }}
        >
          {/* Search bar */}
          <div className="relative flex items-center mx-1 mt-1 mb-3">
            <Search
              size={18}
              className="absolute left-4 text-white/45 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="text"
              placeholder="Search stocks, crypto, or paste a contract address…"
              className="input-glass !rounded-2xl !pl-11 !py-3.5 !text-base w-full"
              aria-label="Search assets"
              readOnly
              onClick={handleSend}
            />
          </div>

          {/* Asset list */}
          <motion.ul
            className="flex flex-col divide-y divide-white/10"
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
          >
            {FEATURED_ASSETS.map((asset) => (
              <motion.li key={asset.symbol} variants={itemFade}>
                <button
                  onClick={handleSend}
                  className="flex w-full items-center justify-between px-4 py-4
                             hover:bg-white/10 rounded-2xl transition-all duration-150
                             text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                  aria-label={`Send ${asset.name}`}
                >
                  <div className="flex items-center gap-4">
                    <AssetLogo logoUrl={asset.logoUrl} symbol={asset.symbol} />
                    <div>
                      <p className="text-base font-normal text-white">{asset.name}</p>
                      <p className="text-sm text-white/45">{asset.symbol}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={[
                        'text-sm font-normal rounded-full px-2.5 py-1',
                        asset.positive
                          ? 'bg-emerald-400/15 text-emerald-300'
                          : 'bg-red-400/15 text-red-300',
                      ].join(' ')}
                    >
                      {asset.change}
                    </span>
                    <ArrowRight size={15} className="text-white/30" aria-hidden="true" />
                  </div>
                </button>
              </motion.li>
            ))}
          </motion.ul>

          <p className="text-center text-sm text-white/35 py-3">
            Click any asset to send it instantly
          </p>
        </motion.div>
      </div>
    </section>
  );
}
