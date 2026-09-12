'use client';

import { motion } from 'framer-motion';
import { MessageSquare, ShieldCheck, RotateCcw } from 'lucide-react';
import { ICON_SIZE } from '@/lib/icons';

const FEATURES = [
  { icon: ShieldCheck, label: 'Cryptographically secure', description: 'Each link holds an ephemeral key that never touches a server. Only the link holder can claim.' },
  { icon: RotateCcw, label: 'Fully cancellable', description: 'Cancel any unclaimed Beam at any time and recover 100% of your funds.' },
  { icon: MessageSquare, label: 'Any messaging app', description: 'A Beam is just a URL. Send it over iMessage, WhatsApp, Telegram, email — anywhere.' },
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
        </div>

        <ul
          className="grid grid-cols-1 sm:grid-cols-3 gap-5"
          aria-label="Beam features"
        >
          {FEATURES.map(({ icon: Icon, label, description }, i) => (
            <motion.li
              key={label}
              className="flex items-start gap-5 p-7 rounded-[24px] glass"
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
                <Icon size={ICON_SIZE.lg} className="text-white/70" />
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
