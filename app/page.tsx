'use client';

import { HeroSection } from '@/components/HeroSection';
import { HowItWorksSection } from '@/components/HowItWorksSection';
import { WhyBeamSection } from '@/components/WhyBeamSection';
import { FAQSection } from '@/components/FAQSection';
import { BottomCTA } from '@/components/BottomCTA';
import { Footer } from '@/components/Footer';
import { useEffect, useRef } from 'react';
import './landing-motion.css';

export default function LandingPage() {
  const landingRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = landingRef.current;
    if (!root || !('IntersectionObserver' in window)) return;
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    let revealObserver: IntersectionObserver | undefined;
    let motionObserver: IntersectionObserver | undefined;
    const reveals = root.querySelectorAll<HTMLElement>('.section-heading, .step-card, .security-art, .why-copy, .faq-centered, .bottom-cta > .layout');
    const illustrations = root.querySelectorAll<HTMLElement>('.step-art, .security-art, .cta-pattern, .hero-ribbon');
    const configure = () => {
      revealObserver?.disconnect();
      motionObserver?.disconnect();
      reveals.forEach(element => element.removeAttribute('data-reveal'));
      illustrations.forEach(element => element.removeAttribute('data-motion-visible'));
      if (preference.matches) return;
      revealObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;
          entry.target.setAttribute('data-reveal', 'visible');
          revealObserver?.unobserve(entry.target);
        });
      }, { threshold: 0.08, rootMargin: '0px 0px -24px 0px' });
      reveals.forEach(element => {
        // Keep the initial viewport and the no-JavaScript page fully visible.
        if (element.getBoundingClientRect().top < window.innerHeight) return;
        element.setAttribute('data-reveal', 'pending');
        revealObserver?.observe(element);
      });
      motionObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => entry.target.setAttribute('data-motion-visible', String(entry.isIntersecting)));
      });
      illustrations.forEach(element => motionObserver?.observe(element));
    };
    configure();
    preference.addEventListener('change', configure);
    return () => {
      revealObserver?.disconnect();
      motionObserver?.disconnect();
      preference.removeEventListener('change', configure);
      reveals.forEach(element => element.removeAttribute('data-reveal'));
      illustrations.forEach(element => element.removeAttribute('data-motion-visible'));
    };
  }, []);
  return (
    <div className="landing-page" ref={landingRef}>
      <main>
        <HeroSection />
        <HowItWorksSection />
        <WhyBeamSection />
        <FAQSection />
        <BottomCTA />
      </main>
      <Footer />
    </div>
  );
}
