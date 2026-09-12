'use client';

import { motion, type Variants } from 'framer-motion';

const STEPS = [
  {
    title: 'Pick a token',
    description: 'Choose ETH, a stock token, or any crypto. Enter a dollar amount and deposit.',
    step: '01',
  },
  {
    title: 'Share the link',
    description: 'You get a unique link. Send it anywhere — iMessage, WhatsApp, email.',
    step: '02',
  },
  {
    title: 'They claim it',
    description: 'They sign in with Apple or Google. A wallet is created automatically — funds land instantly, no gas.',
    step: '03',
  },
] as const;

const cardV: Variants = {
  hidden: { opacity: 0 },
  visible: (i: number) => ({
    opacity: 1,
    transition: { duration: 0.4, ease: 'easeOut', delay: i * 0.08 },
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
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.5 }}
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
            Three steps.
          </motion.p>
        </div>

        <ol className="grid grid-cols-1 sm:grid-cols-3 gap-6" aria-label="How Beam works">
          {STEPS.map(({ title, description, step }, i) => (
            <motion.li
              key={step}
              className="relative flex flex-col gap-5 p-8 rounded-[24px] overflow-hidden glass transition-colors duration-200"
              custom={i}
              variants={cardV}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-60px' }}
            >
              {/* Big ghost step number */}
              <span
                className="absolute -top-3 right-4 font-bold select-none pointer-events-none leading-none"
                style={{
                  fontSize: 'clamp(5rem, 10vw, 7rem)',
                  color: 'rgba(255,255,255,0.08)',
                  letterSpacing: '-0.04em',
                  fontVariantNumeric: 'tabular-nums',
                }}
                aria-hidden="true"
              >
                {step}
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
