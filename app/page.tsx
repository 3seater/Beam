'use client';

import { Navbar } from '@/components/Navbar';
import { HeroSection } from '@/components/HeroSection';
import { HowItWorksSection } from '@/components/HowItWorksSection';
import { WhyBeamSection } from '@/components/WhyBeamSection';
import { FAQSection } from '@/components/FAQSection';
import { BottomCTA } from '@/components/BottomCTA';
import { Footer } from '@/components/Footer';

export default function LandingPage() {
  return (
    <>
      <Navbar />
      <main>
        <HeroSection />
        <HowItWorksSection />
        <WhyBeamSection />
        <FAQSection />
        <BottomCTA />
      </main>
      <Footer />
    </>
  );
}
