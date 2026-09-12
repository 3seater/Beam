'use client';

import Image from 'next/image';
import { useState } from 'react';
import { stockLogoUrl } from '@/lib/robinhood-tokens';

export function LandingTokenLogo({ symbol, size = 24 }: { symbol: 'ETH' | 'NVDA' | 'MSFT'; size?: number }) {
  const [failed, setFailed] = useState(false);
  const src = symbol === 'ETH' ? 'https://coin-images.coingecko.com/coins/images/279/small/ethereum.png?1696501628' : stockLogoUrl(symbol);
  return <span className="landing-token-logo" style={{ width: size, height: size }}>
    {failed ? <span>{symbol}</span> : <Image key={src} src={src} alt={symbol + ' logo'} width={size} height={size} unoptimized onError={() => setFailed(true)} />}
  </span>;
}
