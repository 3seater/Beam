'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Loader2, RefreshCw, Zap } from 'lucide-react';
import { ICON_SIZE } from '@/lib/icons';
import { parseUnits } from 'viem';
import { fetchUniswapQuote, type UniswapQuote } from '@/lib/uniswap-swap';
import { fetchTokenPriceUsd, formatUsd } from '@/lib/robinhood-prices';
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
}

const QUICK_AMOUNTS = [5, 10, 25, 50, 100] as const;

export function DollarAmountInput({
  dollarValue,
  onChange,
  onTokenAmount,
  onError,
  selectedAsset,
  disabled = false,
}: DollarAmountInputProps) {
  const isNative = selectedAsset.type === 'native';
  const symbol = isNative ? 'ETH' : selectedAsset.symbol;
  const isCustom = !QUICK_AMOUNTS.some((a) => String(a) === dollarValue);

  const [ethPriceUsd, setEthPriceUsd] = useState<number | null>(null);
  const [tokenPriceUsd, setTokenPriceUsd] = useState<number | null>(null);
  const [quote, setQuote] = useState<UniswapQuote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteErr, setQuoteErr] = useState(false);
  const [showCustom, setShowCustom] = useState(false);

  const fetchId = useRef(0);
  // Track the last asset we fired a quote for, so we can fire immediately
  // when the token changes (rather than re-debouncing the existing amount)
  const lastQuotedAsset = useRef<string>('');

  // Fetch ETH price once on mount; fetch token price when asset changes
  useEffect(() => {
    fetchTokenPriceUsd('ETH').then((p) => { if (p) setEthPriceUsd(p); });
  }, []);

  useEffect(() => {
    if (!isNative && selectedAsset.type === 'erc20') {
      fetchTokenPriceUsd(selectedAsset.symbol).then((p) => {
        setTokenPriceUsd(p);
      });
    } else {
      setTokenPriceUsd(null);
    }
  }, [isNative, selectedAsset]);

  // Fetch Uniswap quote when dollar amount or asset changes
  const fetchQuote = useCallback(async (usdAmt: number) => {
    if (isNative || !ethPriceUsd || usdAmt <= 0) return;
    if (selectedAsset.type !== 'erc20') return;

    const ethAmountWei = parseUnits((usdAmt / ethPriceUsd).toFixed(18), 18);

    setQuoteLoading(true);
    setQuoteErr(false);
    const id = ++fetchId.current;

    const result = await fetchUniswapQuote(selectedAsset.address, ethAmountWei);

    if (id !== fetchId.current) return; // stale
    setQuoteLoading(false);
    if (!result) {
      setQuoteErr(true);
      setQuote(null);
    } else {
      setQuote(result);
    }
  }, [isNative, selectedAsset, ethPriceUsd]);

  // Reset quote when asset changes
  useEffect(() => {
    setQuote(null);
    setQuoteErr(false);
  }, [selectedAsset]);

  // Debounced quote fetch on dollar value change.
  // If the token just changed (asset key differs from last quoted), fire
  // immediately — the user already committed to an amount.
  useEffect(() => {
    const usd = parseFloat(dollarValue);
    if (!dollarValue || isNaN(usd) || usd <= 0) {
      setQuote(null);
      setQuoteErr(false);
      return;
    }

    const assetKey = isNative ? 'eth' : (selectedAsset.type === 'erc20' ? selectedAsset.address : '');
    const tokenJustChanged = assetKey !== lastQuotedAsset.current;
    const delay = tokenJustChanged ? 0 : 300;

    const t = setTimeout(() => {
      lastQuotedAsset.current = assetKey;
      void fetchQuote(usd);
    }, delay);
    return () => clearTimeout(t);
  }, [dollarValue, fetchQuote, isNative, selectedAsset]);

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
      if (!ethPriceUsd) { onTokenAmount(null); onError(null); return; }
      onTokenAmount((usd / ethPriceUsd).toFixed(18));
      onError(null);
      return;
    }

    if (quoteLoading) { onTokenAmount(null); onError(null); return; }

    if (quoteErr || !quote) {
      // Quote failed — still allow confirm, useDeposit re-fetches at send time
      onTokenAmount('pending');
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
          {quoteLoading && <Loader2 size={ICON_SIZE.xs} className="animate-spin text-white/50" aria-hidden="true" />}
          {!quoteLoading && quoteErr && !isNative && (
            <button
              type="button"
              onClick={() => void fetchQuote(usdNum)}
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
                'flex-1 min-w-[52px] py-2 rounded-full text-sm font-semibold transition-all duration-150',
                active
                  ? 'bg-white/30 border border-white/60 text-white'
                  : 'bg-white/10 border border-white/20 text-white/70 hover:bg-white/18 hover:border-white/35 hover:text-white',
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
            'flex-1 min-w-[64px] py-2 rounded-full text-sm font-semibold transition-all duration-150',
            showCustom || (dollarValue !== '' && isCustom)
              ? 'bg-white/30 border border-white/60 text-white'
              : 'bg-white/10 border border-white/20 text-white/70 hover:bg-white/18 hover:border-white/35 hover:text-white',
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

      {/* Live Uniswap quote panel */}
      <AnimatePresence>
        {!isNative && quote && usdNum > 0 && (() => {
          // Compute estimated output value and price impact
          const outTokens = parseFloat(quote.amountOutFormatted);
          const outUsd = tokenPriceUsd && outTokens ? outTokens * tokenPriceUsd : null;
          const impact = outUsd ? ((usdNum - outUsd) / usdNum) * 100 : null;
          const highImpact = impact !== null && impact > 10;

          return (
            <motion.div
              key="uniswap-quote"
              initial={{ opacity: 0, height: 0, marginTop: 0 }}
              animate={{ opacity: 1, height: 'auto', marginTop: 8 }}
              exit={{ opacity: 0, height: 0, marginTop: 0 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              style={{ overflow: 'hidden' }}
              className={`glass-sm px-3 py-3 rounded-xl ${highImpact ? 'border border-amber-400/30' : ''}`}
              role="region"
              aria-label="Live quote"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <Zap size={ICON_SIZE.xs} className="text-white/50" aria-hidden="true" />
                  <p className="text-xs text-white/50">
                    Live quote · {quote.isV4 ? 'Uniswap V4' : 'Uniswap V3'}
                  </p>
                </div>
                {impact !== null && (
                  <span className={`text-[11px] font-medium ${highImpact ? 'text-amber-300' : 'text-white/40'}`}>
                    {highImpact ? '⚠ ' : ''}{impact.toFixed(1)}% impact
                  </span>
                )}
              </div>
              <p className="text-sm font-semibold text-white mb-1">
                You send {formatUsd(usdNum)} → get {quote.amountOutFormatted} {symbol}
                {outUsd && <span className="text-white/50 font-normal"> ≈ {formatUsd(outUsd)}</span>}
              </p>
              {highImpact && (
                <p className="text-[11px] text-amber-300/80 mt-1">
                  Low pool liquidity — you may receive significantly less than expected.
                </p>
              )}
              {!highImpact && (
                <p className="text-[11px] text-white/40">
                  {quote.isV4 ? `ETH → ${symbol} (V4 direct)` : `ETH → WETH → ${symbol}`}
                </p>
              )}
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* ETH native panel */}
      <AnimatePresence>
        {isNative && displayTokenAmt && usdNum > 0 && (
          <motion.div
            key="eth-panel"
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: 'auto', marginTop: 8 }}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            style={{ overflow: 'hidden' }}
            className="glass-sm px-3 py-2.5 rounded-xl"
          >
            <p className="text-sm font-semibold text-white">
              {displayTokenAmt} ETH
              <span className="text-white/50 font-normal"> ≈ {formatUsd(usdNum)}</span>
            </p>
            <p className="text-[11px] text-white/40 mt-0.5">Direct deposit · no swap needed</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
