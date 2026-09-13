'use client';

import { Fingerprint } from 'lucide-react';

function normalizePaths(svg: SVGSVGElement | null) {
  // Keep Lucide's exact geometry while giving each ridge the same draw duration.
  svg?.querySelectorAll('path').forEach(path => path.setAttribute('pathLength', '100'));
}

export function AnimatedFingerprint() {
  return <span className="animated-fingerprint" aria-hidden="true">
    <Fingerprint className="fingerprint-guide" size={100} strokeWidth={.65} />
    <Fingerprint ref={normalizePaths} className="fingerprint-trace" size={100} strokeWidth={.65} />
  </span>;
}
