'use client';

import { motion } from 'framer-motion';
import { KeyRound, Zap, MessageSquare, TrendingUp, ShieldCheck, RotateCcw } from 'lucide-react';

const FEATURES = [
  { icon: KeyRound, label: 'No wallet required', description: 'Recipients claim with Apple or Google login. A smart wallet is provisioned automatically — no seed phrases, no setup.' },
  { icon: Zap, label: 'Gasless for recipients', description: 'The Beam relayer covers all on-chain gas costs. Recipients never need to hold ETH to receive funds.' },
  { icon: MessageSquare, label: 'Any messaging app', description: 'A Beam is just a URL. Share it over iMessage, WhatsApp, Telegram, X, email — anywhere.' },
  { icon: TrendingUp, label: 'Stocks & crypto', description: 'Send native ETH, any ERC-20, or Robinhood Chain stock tokens representing real company shares.' },
  { icon: ShieldCheck, label: 'Cryptographically secure', description: 'Each link holds an ephemeral key that never touches a server. Only the link holder can claim, ever.' },
  { icon: RotateCcw, label: 'Fully cancellable', description: 'Changed your mind? Cancel any unclaimed Beam at any time and recover 100% of your funds.' },
] as const;

export function WhyBeamSection() {
  return (
    <section className="relative py-32" aria-labelledby="why-heading">
      <div className="layout">
        <div className="text-center mb-20">
          <motion.h2
            id="why-heading"
            className="text-5xl sm:text-6xl font-medium text-white tracking-tight"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.5 }}
          >
            Why Beam
          </motion.h2>
          <motion.p
            className="mt-4 text-white/55 text-xl max-w-lg mx-auto"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.15 }}
          >
            Built for people, not infrastructure engineers.
          </motion.p>
        </div>

        <ul
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
          aria-label="Beam features"
        >
          {FEATURES.map(({ icon: Icon, label, description }, i) => (
            <motion.li
              key={label}
              className={[
                'flex items-start gap-5 p-7 rounded-[24px]',
                i % 3 === 1 ? 'glass' : 'bg-white/6 border border-white/12',
              ].join(' ')}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.4, delay: i * 0.06 }}
            >
              <span
                className="inline-flex items-center justify-center w-11 h-11 rounded-2xl
                           bg-white/12 border border-white/18 shrink-0 mt-0.5"
                aria-hidden="true"
              >
                <Icon size={20} className="text-white/75" />
              </span>
              <div>
                <h3 className="text-lg font-medium text-white mb-2">{label}</h3>
                <p className="text-base font-normal text-white/50 leading-relaxed">{description}</p>
              </div>
            </motion.li>
          ))}
        </ul>
      </div>
    </section>
  );
}
