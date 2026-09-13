import './hero-ribbon.css';

export function HeroRibbon({ asset }: { asset: string }) {
  return <div className="hero-ribbon" data-asset={asset} aria-hidden="true">
    <div className="hero-ribbon-tint hero-ribbon-tint-eth" />
    <div className="hero-ribbon-tint hero-ribbon-tint-nvda" />
    <div className="hero-ribbon-tint hero-ribbon-tint-msft" />
    <svg viewBox="0 0 1400 900" fill="none" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="hero-ribbon-glass" x1="260" y1="820" x2="1090" y2="100" gradientUnits="userSpaceOnUse">
          <stop stopColor="#38a0e1" stopOpacity=".12" /><stop offset=".25" stopColor="#79d6fc" stopOpacity=".65" />
          <stop offset=".46" stopColor="#f5fdff" stopOpacity=".85" /><stop offset=".55" stopColor="#9be7fd" stopOpacity=".45" />
          <stop offset=".8" stopColor="#38a0e1" stopOpacity=".62" /><stop offset="1" stopColor="#e6faff" stopOpacity=".7" />
        </linearGradient>
        <linearGradient id="hero-ribbon-fold" x1="620" y1="470" x2="1040" y2="850" gradientUnits="userSpaceOnUse">
          <stop stopColor="#247db5" stopOpacity=".28" /><stop offset=".42" stopColor="#79d6fc" stopOpacity=".58" /><stop offset="1" stopColor="#f5fdff" stopOpacity=".18" />
        </linearGradient>
        <linearGradient id="hero-ribbon-edge" x1="100" y1="900" x2="1250" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="white" stopOpacity="0" /><stop offset=".35" stopColor="white" stopOpacity=".95" /><stop offset=".7" stopColor="#e4faff" /><stop offset="1" stopColor="white" stopOpacity=".1" />
        </linearGradient>
      </defs>
      <g className="hero-ribbon-flow">
        <path d="M-130 905C220 635 338 866 670 695C1045 502 1022 390 809 296C603 205 603 64 1006-100L1256-54C840 115 784 161 953 247C1326 437 1236 620 854 782C490 936 315 720-10 1050Z" fill="url(#hero-ribbon-glass)" />
        <path d="M809 296C1022 390 1045 502 670 695C846 659 1039 596 1110 491C1174 396 1108 326 953 247C846 193 837 158 919 103C750 173 674 237 809 296Z" fill="url(#hero-ribbon-fold)" />
        <path d="M-130 905C220 635 338 866 670 695C1045 502 1022 390 809 296C603 205 603 64 1006-100M-10 1050C315 720 490 936 854 782C1236 620 1326 437 953 247C784 161 840 115 1256-54" stroke="url(#hero-ribbon-edge)" strokeWidth="2" />
        <path className="hero-ribbon-reflection" d="M-130 905C220 635 338 866 670 695C1045 502 1022 390 809 296C603 205 603 64 1006-100" stroke="white" strokeWidth="3" pathLength="1000" strokeLinecap="round" />
      </g>
    </svg>
  </div>;
}
