'use client';

import { useRouter } from 'next/navigation';
import { ArrowUpRight } from 'lucide-react';
import { BeamMark } from './BeamMark';
export interface BottomCTAProps {
  onSendClick?: () => void;
}
export function BottomCTA({
  onSendClick
}: BottomCTAProps) {
  const router = useRouter();
  return <section className="bottom-cta" aria-labelledby="cta-heading"><div className="layout"><BeamMark className="cta-mark" sculptural /><h2 id="cta-heading">Send crypto. Just like that.</h2><button className="premium-button" onClick={() => onSendClick ? onSendClick() : router.push('/send')}>Send a Beam <ArrowUpRight size={18} /></button></div></section>;
}
