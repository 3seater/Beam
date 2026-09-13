'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Skeleton } from './ui/Skeleton';

export function HistoryTokenImage({ src, symbol, loading }: { src: string | null; symbol: string; loading: boolean }) {
  const [result, setResult] = useState<{ url: string; ok: boolean } | null>(null);
  const settled = result?.url === src;
  const waiting = src ? !settled : loading;
  return <span className="beam-history-logo">
    {waiting && <Skeleton className="history-logo-skeleton" />}
    {src && (!settled || result?.ok) ? <Image src={src} alt={symbol} width={24} height={24} unoptimized loading="eager"
      className="history-token-image" style={{ opacity: settled && result?.ok ? 1 : 0 }}
      onLoad={() => setResult({ url: src, ok: true })} onError={() => setResult({ url: src, ok: false })} />
      : !waiting && <span className="history-token-fallback" aria-label={symbol}>{symbol.slice(0, 2).toUpperCase()}</span>}
  </span>;
}
