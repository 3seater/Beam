'use client';

import { useEffect, useState } from 'react';
import { BeamOutline } from './BeamMark';

export function Preloader() {
  const [phase, setPhase] = useState<'loading' | 'leaving' | 'done'>('loading');

  useEffect(() => {
    // Root layout persists across navigation, so this runs on fresh loads only.
    // No storage or wallet/network dependency can leave the overlay stuck.
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const fade = window.setTimeout(() => setPhase('leaving'), reducedMotion ? 0 : 1050);
    const finish = window.setTimeout(() => setPhase('done'), reducedMotion ? 0 : 1350);
    return () => {
      window.clearTimeout(fade);
      window.clearTimeout(finish);
    };
  }, []);

  if (phase === 'done') return null;

  return (
    <div className="beam-preloader" data-phase={phase} aria-hidden="true">
      <BeamOutline className="beam-preloader-mark" />
    </div>
  );
}
