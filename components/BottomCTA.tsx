'use client';

import { useRouter } from 'next/navigation';
import { ArrowUpRight } from 'lucide-react';
export interface BottomCTAProps {
  onSendClick?: () => void;
}
export function BottomCTA({
  onSendClick
}: BottomCTAProps) {
  const router = useRouter();
  return <section className="bottom-cta" aria-labelledby="cta-heading">
    <div className="cta-pattern" aria-hidden="true">
      <svg viewBox="0 0 1400 600" preserveAspectRatio="xMidYMid slice" fill="none">
        <defs>
          <linearGradient id="cta-ribbon" x1="1000" y1="0" x2="500" y2="650" gradientUnits="userSpaceOnUse"><stop stopColor="#fff" stopOpacity=".65" /><stop offset=".55" stopColor="#9BE7FD" stopOpacity=".12" /><stop offset="1" stopColor="#38A0E1" stopOpacity=".3" /></linearGradient>
        </defs>
        <g className="cta-ribbons">
          <path d="M860-180C1380 80 1320 410 870 800H1080C1580 380 1530 70 1050-180Z" fill="url(#cta-ribbon)" />
          <path d="M600-180C1120 80 1100 410 630 800H820C1300 380 1310 70 790-180Z" fill="url(#cta-ribbon)" />
          <path d="M340-180C860 80 860 410 390 800H560C1040 380 1070 70 530-180Z" fill="url(#cta-ribbon)" />
          <path d="M860-180C1380 80 1320 410 870 800M600-180C1120 80 1100 410 630 800M340-180C860 80 860 410 390 800" stroke="white" strokeOpacity=".35" />
        </g>
      </svg>
    </div>
    <div className="layout"><h2 id="cta-heading">Stocks and crypto. Simply sent.</h2><button className="premium-button" onClick={() => onSendClick ? onSendClick() : router.push('/send')}>Send a Beam <ArrowUpRight size={18} /></button></div>
  </section>;
}
