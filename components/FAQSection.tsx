'use client';

import { Accordion, type AccordionItem } from './ui/Accordion';
const ITEMS: AccordionItem[] = [{
  question: 'Do they need a wallet?',
  answer: 'No. They sign in with Apple or Google, and a wallet is created for them automatically.'
}, {
  question: 'What can I send?',
  answer: 'ETH, supported ERC-20 tokens, and stock tokens on Robinhood Chain. Explore the asset picker to see what’s available.'
}, {
  question: 'How is my link protected?',
  answer: 'Anyone with the complete link can claim, so share it privately. Saved links can be restored after verifying your sending wallet.'
}, {
  question: 'Can I take a Beam back?',
  answer: 'Yes. Open Your Beams and cancel any unclaimed link to recover the tokens. Links stay available until claimed or cancelled.'
}, {
  question: 'Who pays the network fee?',
  answer: 'The sender pays for the deposit transaction. Beam’s relayer handles the recipient’s claim, so they don’t need tokens for gas.'
}, { question: 'Do Beam links expire?', answer: 'No. Tokens stay in escrow until the Beam is claimed or cancelled.' }];
export function FAQSection() {
  return <section id="faq" className="premium-section faq-section" aria-labelledby="faq-heading">
    <div className="layout faq-centered"><h2 id="faq-heading">FAQ</h2>
      <div className="faq-panel"><Accordion items={ITEMS} mode="single" className="premium-accordion" /></div>
    </div>
  </section>;
}
