'use client';

import { useState } from 'react';
import Image from 'next/image';
import { BeamMark } from './BeamMark';
import { ArrowUpRight, Check } from 'lucide-react';

interface BeamGiftCardProps {
  amount?: string;
  symbol?: string;
  logoUrl?: string;
  label?: string;
  status?: string;
  detail?: React.ReactNode;
}

/** The same gift-like glass card used in the homepage illustration. */
export function BeamGiftCard({ amount, symbol, logoUrl, label = 'Your Beam', status = 'Ready to share', detail }: BeamGiftCardProps) {
  const imageUrl = logoUrl || (symbol === 'ETH' ? 'https://coin-images.coingecko.com/coins/images/279/small/ethereum.png?1696501628' : undefined);
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  return <div className="beam-gift-card">
    <div className="gift-card-top"><span><BeamMark /> {label}</span><ArrowUpRight size={17} strokeWidth={1.4} /></div>
    <div className="gift-card-value">{amount ?? <BeamMark sculptural />}</div>
    {symbol && <span className="gift-token-pill">
      {imageUrl && failedUrl !== imageUrl
        ? <Image src={imageUrl} alt={symbol + ' logo'} width={32} height={32} className="gift-token-logo" unoptimized onError={() => setFailedUrl(imageUrl)} />
        : <span className="gift-token-fallback" aria-hidden="true">{symbol.slice(0, 2)}</span>}
      {symbol}
    </span>}
    <div className="gift-card-bottom"><span>{detail ?? 'On Robinhood Chain'}</span><span className="gift-status"><Check size={12} />{status}</span></div>
  </div>;
}

export function BeamMoment({ title, description }: { title: string; description: string }) {
  return <div className="beam-moment"><div className="moment-orbit" aria-hidden="true" /><BeamMark className="moment-mark" sculptural /><h1>{title}</h1><p>{description}</p></div>;
}
