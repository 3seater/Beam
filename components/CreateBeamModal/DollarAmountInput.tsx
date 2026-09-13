'use client';

import { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import { ICON_SIZE } from '@/lib/icons';
import { useAmountQuote } from '@/hooks/useAmountQuote';
import { fetchTokenPriceUsd } from '@/lib/robinhood-prices';
import { AmountQuotePanel } from './AmountQuotePanel';
import { DataSkeleton } from '../ui/DataSkeleton';
import { formatTokenValue } from '@/lib/format';
import type { SelectedAsset } from './TokenPicker';

export interface DollarAmountInputProps {
  dollarValue: string;
  onChange: (usdStr: string) => void;
  onTokenAmount: (tokenStr: string | null) => void;
  onError: (err: string | null) => void;
  selectedAsset: SelectedAsset;
  walletAddress?: string;
  disabled?: boolean;
  /** Bundles use the same dollar control; their allocation panel replaces the single-token quote. */
  bundle?: boolean;
}

const QUICK_AMOUNTS = [5, 10, 25, 50, 100] as const;

export function DollarAmountInput({
  dollarValue,
  onChange,
  onTokenAmount,
  onError,
  selectedAsset,
  disabled = false,
  bundle = false,
}: DollarAmountInputProps) {
  const isNative = selectedAsset.type === 'native';
  const symbol = isNative ? 'ETH' : selectedAsset.symbol;
  const isCustom = !QUICK_AMOUNTS.some((a) => String(a) === dollarValue);

  const { ethPriceUsd, quote, quoteLoading, quoteErr, retry } = useAmountQuote(
    dollarValue, selectedAsset.type === 'erc20' ? selectedAsset.address : undefined,
  );
  const [tokenPrice, setTokenPrice] = useState<{ key: string; price: number | null } | null>(null);
  const [showCustom, setShowCustom] = useState(false);
  const priceKey = selectedAsset.type === 'erc20' ? selectedAsset.address : 'ETH';
  const tokenPriceUsd = tokenPrice?.key === priceKey ? tokenPrice.price : null;

  useEffect(() => {
    let active = true;
    if (selectedAsset.type === 'erc20') {
      fetchTokenPriceUsd(selectedAsset.symbol, selectedAsset.address).then(price => {
        if (active) setTokenPrice({ key: priceKey, price });
      });
    }
    return () => { active = false; };
  }, [priceKey, selectedAsset]);
  // Pass token amount up to parent
  useEffect(() => {
    const usd = parseFloat(dollarValue);
    if (!dollarValue || isNaN(usd) || usd <= 0) {
      onTokenAmount(null);
      onError('Please enter an amount');
      return;
    }
    if (usd > 1_000_000) {
      onTokenAmount(null);
      onError('Maximum $1,000,000');
      return;
    }

    if (isNative) {
      if (!ethPriceUsd) { onTokenAmount(null); onError(quoteErr ? 'Price unavailable. Please retry.' : null); return; }
      onTokenAmount((usd / ethPriceUsd).toFixed(18));
      onError(null);
      return;
    }

    if (quoteLoading) { onTokenAmount(null); onError(null); return; }

    if (quoteErr || !quote) {
      // Never allow an old or unavailable quote to enable confirmation.
      onTokenAmount(null);
      onError(null);
      return;
    }

    // Pass the human-readable amount; useDeposit will use the raw wei from its own quote
    onTokenAmount(quote.amountOutFormatted);
    onError(null);
  }, [dollarValue, isNative, ethPriceUsd, quote, quoteLoading, quoteErr, onTokenAmount, onError]);

  function handleCustomChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/[^0-9.]/g, '');
    const parts = raw.split('.');
    onChange(parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : raw);
  }

  const usdNum = parseFloat(dollarValue) || 0;

  const displayTokenAmt = isNative
    ? (ethPriceUsd && usdNum > 0 ? formatTokenValue(usdNum / ethPriceUsd) : null)
    : (quote?.amountOutFormatted ?? null);

  return (
    <div className={disabled ? 'opacity-50 pointer-events-none' : ''}>

      {/* Big dollar display */}
      <div className="flex items-baseline gap-1 mb-4">
        <span className="text-3xl font-light text-white/40 leading-none select-none">$</span>
        <span className="text-5xl font-medium text-white tracking-tight leading-none">
          {dollarValue || '0'}
        </span>
        <div className="flex items-center gap-1.5 ml-auto text-right shrink-0">
          {quoteLoading && <DataSkeleton className="w-24 h-4" label="Loading token quote" />}
          {!quoteLoading && quoteErr && (
            <button
              type="button"
              onClick={retry}
              className="flex items-center gap-1 text-xs text-white/50 hover:text-white transition-colors"
              aria-label="Retry quote"
            >
              <RefreshCw size={ICON_SIZE.xs} />
              Retry
            </button>
          )}
          {displayTokenAmt && displayTokenAmt !== 'pending' && !quoteLoading && (
            <span className="text-xs text-white/50">
              ≈ {displayTokenAmt} {symbol}
            </span>
          )}
        </div>
      </div>

      {/* Quick amounts */}
      <div className="flex gap-2 flex-wrap mb-4">
        {QUICK_AMOUNTS.map((amt) => {
          const active = String(amt) === dollarValue && !showCustom;
          return (
            <button
              key={amt}
              type="button"
              onClick={() => { onChange(String(amt)); setShowCustom(false); }}
              className={[
                'amt-preset flex-1 min-w-[52px] py-2 rounded-full text-sm font-semibold transition-all duration-150',
                active ? 'active' : '',
              ].join(' ')}
            >
              ${amt}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => { setShowCustom(true); onChange(''); }}
          className={[
            'amt-preset flex-1 min-w-[64px] py-2 rounded-full text-sm font-semibold transition-all duration-150',
            showCustom || (dollarValue !== '' && isCustom) ? 'active' : '',
          ].join(' ')}
        >
          Custom
        </button>
      </div>

      {/* Custom input */}
      {(showCustom || (dollarValue !== '' && isCustom)) && (
        <div className="relative mb-3">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/50 font-semibold text-lg pointer-events-none">
            $
          </span>
          <input
            type="text"
            inputMode="decimal"
            autoFocus
            value={dollarValue}
            onChange={handleCustomChange}
            placeholder="0.00"
            className="input-glass !pl-8 !py-3 !text-xl !font-semibold w-full"
            aria-label="Custom dollar amount"
          />
        </div>
      )}

      {!bundle && usdNum > 0 && usdNum <= 1_000_000 && (
        <AmountQuotePanel loading={quoteLoading} error={quoteErr} native={isNative}
          quote={quote} usd={usdNum} symbol={symbol} tokenPrice={tokenPriceUsd} nativeAmount={displayTokenAmt} />
      )}
    </div>
  );
}
