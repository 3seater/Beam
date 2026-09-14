import { Loader2, Zap } from 'lucide-react';
import { Skeleton } from '../ui/Skeleton';
import type { UniswapQuote } from '@/lib/uniswap-swap';
import { formatUsd } from '@/lib/robinhood-prices';
import { formatUnits } from 'viem';

export function AmountQuotePanel({ loading, error, native, quote, usd, symbol, tokenPrice, nativeAmount, tokenDecimals = 18 }: {
  loading: boolean; error: boolean; native: boolean; quote: UniswapQuote | null;
  usd: number; symbol: string; tokenPrice: number | null; nativeAmount: string | null;
  tokenDecimals?: number;
}) {
  // Display text is rounded and may contain thousands separators. Value the
  // full quoted quantity instead, using the asset's decimal precision.
  const output = quote && tokenPrice ? Number(formatUnits(quote.amountOut, tokenDecimals)) * tokenPrice : null;
  const impact = output && usd > 0 ? (usd - output) / usd * 100 : null;
  const highImpact = impact !== null && impact > 10;
  return <div className="quote-panel glass-sm amount-quote-panel" role="status" aria-live="polite" aria-busy={loading} aria-label={loading ? 'Getting your quote' : 'Live quote'}>
    <div className="amount-quote-header">
      <span>{loading ? <Loader2 size={12} className="animate-spin" aria-hidden="true" /> : <Zap size={12} aria-hidden="true" />}
        {loading ? (native ? 'Getting ETH price…' : 'Getting your quote…') : error ? 'Quote unavailable' : native ? 'ETH amount' : 'Live swap quote'}
      </span>
      {!loading && !error && impact !== null && <span className={highImpact ? 'text-amber-700' : ''}>{impact.toFixed(1)}% impact</span>}
    </div>
    <div className="amount-quote-value">
      {loading ? <div className="amount-quote-placeholder"><Skeleton className="quote-line-long" /><Skeleton className="quote-line-medium" /></div>
        : error ? 'Couldn’t get a live price. Please retry.'
          : native ? `${nativeAmount} ETH ≈ ${formatUsd(usd)}`
            : <>You send {formatUsd(usd)} → get {quote?.amountOutFormatted} {symbol}{output ? <span className="font-normal"> ≈ {formatUsd(output)}</span> : null}</>}
    </div>
    <div className={`amount-quote-note ${highImpact && !loading ? 'text-amber-700' : ''}`}>
      {loading ? <Skeleton className="quote-line-short" /> : error ? 'Use Retry to request a fresh quote.' : native ? 'Direct deposit · no swap needed' : highImpact ? 'Low pool liquidity — you may receive significantly less than expected.' : 'Estimated output · final quote confirmed before sending'}
    </div>
  </div>;
}
