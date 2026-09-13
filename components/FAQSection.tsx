'use client';

import { Accordion, type AccordionItem } from './ui/Accordion';
const ITEMS: AccordionItem[] = [{
  question: 'Do they need a wallet?',
  answer: 'No. They open the link, sign in, and claim. A wallet is created for them automatically.'
}, {
  question: 'What can I send?',
  answer: 'ETH, supported ERC-20 tokens, and stock tokens on Robinhood Chain. Send one asset or choose a Spectrum bundle to send several together through one link.'
}, {
  question: 'What is Spectrum?',
  answer: 'Spectrum lets you send a preset bundle of assets through one link. Choose a bundle and amount, pay in ETH, and the recipient claims all assets together. Preset weights split your sending budget; bundles are not automatically rebalanced.'
}, {
  question: 'How is my link protected?',
  answer: 'Anyone with the complete link can claim, so share it privately. Saved links can be restored after verifying your sending wallet.'
}, {
  question: 'Can I take a Beam back?',
  answer: 'Yes. Open Your Beams and cancel any unclaimed link to recover the tokens. Cancelling a Spectrum returns every asset in the bundle, rather than converting them back to ETH. Links stay available until claimed or cancelled.'
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
