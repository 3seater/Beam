'use client';

import { motion, type Variants } from 'framer-motion';
import { ArrowDownToLine, Share2, Wallet } from 'lucide-react';

const STEPS = [
  {
    icon: ArrowDownToLine,
    title: 'Choose a stock or token',
    description: 'Pick from real Robinhood Chain stock tokens or any crypto — enter a dollar amount and deposit into the Beam escrow instantly.',
    step: '01',
  },
  {
    icon: Share2,
    title: 'Share a Link',
    description: 'Get a unique Beam link. Send it over iMessage, WhatsApp, X — or any channel you already use.',
    step: '02',
  },
  {
    icon: Wallet,
    title: 'They Claim',
    description: 'The recipient signs in with Apple or Google — a wallet is created automatically and funds land instantly. Zero gas.',
    step: '03',
  },
] as const;

const cardV: Variants = {
  hidden: { opacity: 0, y: 28 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const, delay: i * 0.10 },
  }),
};

export function HowItWorksSection() {
  return (
    <section
      id="how-it-works"
      className="relative py-32"
      aria-labelledby="hiw-heading"
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 70% 40% at 50% 50%, rgba(255,255,255,0.06) 0%, transparent 70%)' }}
        aria-hidden="true"
      />
      <div className="layout">
        <div className="text-center mb-20">
          <motion.h2
            id="hiw-heading"
            className="text-5xl sm:text-6xl font-medium text-white tracking-tight"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          >
            How it works
          </motion.h2>
          <motion.p
            className="mt-4 text-white/55 text-xl max-w-lg mx-auto"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.15 }}
          >
            Three steps, zero friction.
          </motion.p>
        </div>

        <ol className="grid grid-cols-1 sm:grid-cols-3 gap-6" aria-label="How Beam works">
          {STEPS.map(({ icon: Icon, title, description, step }, i) => (
            <motion.li
              key={step}
              className={[
                'relative flex flex-col gap-5 p-8 rounded-[24px]',
                'hover:-translate-y-1.5 transition-transform duration-200',
                i === 1
                  ? 'bg-white/8 border border-white/15'
                  : 'glass',
              ].join(' ')}
              custom={i}
              variants={cardV}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-60px' }}
            >
              <span
                className="absolute top-5 right-6 text-xs font-mono text-white/20 select-none"
                aria-hidden="true"
              >
                {step}
              </span>

              <span
                className="inline-flex items-center justify-center w-12 h-12 rounded-2xl
                           bg-white/15 border border-white/20 shrink-0"
                aria-hidden="true"
              >
                <Icon size={22} className="text-white/80" />
              </span>

              <h3 className="text-xl font-medium text-white tracking-tight">{title}</h3>
              <p className="text-base font-normal text-white/55 leading-relaxed">{description}</p>
            </motion.li>
          ))}
        </ol>
      </div>
    </section>
  );
}
