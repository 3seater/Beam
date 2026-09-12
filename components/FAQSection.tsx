'use client';

import { motion } from 'framer-motion';
import { Accordion, type AccordionItem } from '@/components/ui/Accordion';

const FAQ_ITEMS: AccordionItem[] = [
  {
    question: 'Is my Beam link secure?',
    answer: 'Each link contains a one-time ephemeral private key in the URL hash fragment. Hash fragments never reach servers, so the key stays private. On-chain, the escrow verifies that only the holder of that key can claim — and the key is destroyed the moment funds are claimed or cancelled.',
  },
  {
    question: 'Do recipients need a crypto wallet?',
    answer: 'No. Recipients sign in with Apple or Google. Privy automatically provisions a secure embedded smart wallet — no seed phrases, no browser extensions, no setup required.',
  },
  {
    question: 'Which tokens can I send?',
    answer: 'Native ETH, any ERC-20, and Robinhood Chain stock tokens representing real company shares (NVDA, AAPL, TSLA, and more). The asset picker shows the most popular options, or you can paste any contract address.',
  },
  {
    question: 'Can I cancel and recover my funds?',
    answer: 'Yes — at any time before the link is claimed. Cancel from the app and the full amount returns to your wallet. Once claimed, the deposit is permanently closed.',
  },
  {
    question: 'Who pays gas when a recipient claims?',
    answer: 'Recipients claim gaslessly — no gas, no wallet. Beam\'s relayer submits the claim transaction on their behalf. The only gas cost is the sender\'s initial deposit.',
  },
  {
    question: 'Do Beam links expire?',
    answer: 'No expiry. Funds stay in escrow until claimed or cancelled.',
  },
];

export function FAQSection() {
  return (
    <section
      id="faq"
      className="relative py-32"
      aria-labelledby="faq-heading"
    >
      <div className="layout">
        <div className="text-center mb-16">
          <motion.h2
            id="faq-heading"
            className="text-5xl sm:text-6xl font-medium text-white tracking-tight"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.5 }}
          >
            FAQ
          </motion.h2>
        </div>

        <motion.div
          className="glass p-3"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <Accordion items={FAQ_ITEMS} mode="single" className="px-3" />
        </motion.div>
      </div>
    </section >
  );
}
