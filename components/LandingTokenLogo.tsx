'use client';

import Image from 'next/image';
import { useState } from 'react';
import { stockLogoUrl } from '@/lib/robinhood-tokens';

const ETH_LOGO = 'https://coin-images.coingecko.com/coins/images/279/small/ethereum.png?1696501628';
const WETH_LOGO = 'https://coin-images.coingecko.com/coins/images/2518/small/weth.png?1696503332';
const USDG_LOGO = 'https://coin-images.coingecko.com/coins/images/51281/small/GDN_USDG_Token_200x200.png?1730484111';
const AI_LOGO = 'https://cdn.dexscreener.com/cms/images/U6RIzs8Fm7Jar6GE?width=64&height=64&quality=95&format=auto';
const CASHCAT_LOGO = 'https://cdn.dexscreener.com/cms/images/Lq7a3pS9Wn8EuGp0?width=64&height=64&quality=95&format=auto';
const PONS_LOGO = 'https://cdn.dexscreener.com/cms/images/dkmXs8KYMyMXjuU1?width=64&height=64&quality=95&format=auto';
const MEME_LOGO = 'https://cdn.dexscreener.com/cms/images/pPWqEwHoGm1tbUMt?width=64&height=64&quality=95&format=auto';

const FIXED_LOGOS: Record<string, string> = {
  ETH: ETH_LOGO,
  WETH: WETH_LOGO,
  USDG: USDG_LOGO,
  AI: AI_LOGO,
  CASHCAT: CASHCAT_LOGO,
  PONS: PONS_LOGO,
  MEME: MEME_LOGO,
};

export function tokenLogoUrl(symbol: string): string {
  return FIXED_LOGOS[symbol.toUpperCase()] ?? stockLogoUrl(symbol);
}

export function LandingTokenLogo({ symbol, size = 24 }: { symbol: string; size?: number }) {
  const [failed, setFailed] = useState(false);
  const src = tokenLogoUrl(symbol);
  return (
    <span className="landing-token-logo" style={{ width: size, height: size }}>
      {failed
        ? <span>{symbol.slice(0, 3).toUpperCase()}</span>
        : <Image key={src} src={src} alt={symbol + ' logo'} width={size} height={size} unoptimized onError={() => setFailed(true)} />
      }
    </span>
  );
}
