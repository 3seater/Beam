'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowRight, Zap } from 'lucide-react';

export interface BottomCTAProps {
  onSendClick?: () => void;
}

export function BottomCTA({ onSendClick }: BottomCTAProps) {
  const router = useRouter();
  const handleSend = () => { if (onSendClick) { onSendClick(); } else { router.push('/send'); } };
  return (
    <section
      className="relative py-32"
      aria-labelledby="cta-heading"
    >
      <div className="layout">
        <motion.div
          className="glass-strong w-full flex flex-col items-center
                   gap-8 text-center py-24 px-12 overflow-hidden"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5 }}
        >
          {/* Ambient glow inside card */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'radial-gradient(ellipse 60% 50% at 50% 0%, rgba(255,255,255,0.12) 0%, transparent 70%)',
            }}
            aria-hidden="true"
          />

          <motion.div
            className="text-white/60"
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            aria-hidden="true"
          >
            <Zap size={28} />
          </motion.div>

          <h2
            id="cta-heading"
            className="text-5xl sm:text-6xl font-medium text-white tracking-tight text-balance"
          >
            Send crypto to anyone —{' '}
            <span className="text-sky-gradient">instantly.</span>
          </h2>

          <p className="text-white/55 text-xl max-w-xl text-balance">
            No wallet needed. They sign in with Apple or Google and the funds are theirs.
          </p>

          <button
            onClick={handleSend}
            className="btn-glass-primary flex items-center gap-2 !px-10 !py-4 !text-lg"
            aria-label="Send a Beam"
          >
            Send a Beam
            <ArrowRight size={16} aria-hidden="true" />
          </button>
        </motion.div>
      </div>
    </section>
  );
}
