'use client';

import { useEffect, useState } from 'react';
import { parseUnits } from 'viem';
import { fetchUniswapQuote, type UniswapQuote } from '@/lib/uniswap-swap';
import { fetchTokenPriceUsd } from '@/lib/robinhood-prices';

type QuoteState = { key: string; status: 'loading' | 'ready' | 'error'; quote?: UniswapQuote };

export function useAmountQuote(value: string, address?: `0x${string}`) {
  const [ethPriceUsd, setEthPrice] = useState<number | null>(null);
  const [priceError, setPriceError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<QuoteState | null>(null);
  const usd = Number(value);
  const valid = value !== '' && Number.isFinite(usd) && usd > 0 && usd <= 1_000_000;
  const key = `${address ?? 'ETH'}:${value}:${ethPriceUsd}:${attempt}`;

  useEffect(() => {
    let active = true;
    setPriceError(false);
    fetchTokenPriceUsd('ETH').then(price => {
      if (!active) return;
      setEthPrice(price);
      setPriceError(!price);
    }).catch(() => { if (active) setPriceError(true); });
    return () => { active = false; };
  }, [attempt]);

  useEffect(() => {
    if (!valid || !address || !ethPriceUsd) return;
    let active = true;
    const controller = new AbortController();
    setState({ key, status: 'loading' });
    // Presets are committed choices. Only debounce free-form typing.
    const delay = [5, 10, 25, 50, 100].includes(usd) ? 0 : 250;
    const timeout = setTimeout(() => {
      active = false;
      controller.abort();
      setState({ key, status: 'error' });
    }, 12_000);
    const debounce = setTimeout(async () => {
      try {
        const amountIn = parseUnits((usd / ethPriceUsd).toFixed(18), 18);
        const quote = await fetchUniswapQuote(address, amountIn, controller.signal);
        if (active) setState(quote ? { key, status: 'ready', quote } : { key, status: 'error' });
      } catch {
        if (active) setState({ key, status: 'error' });
      } finally {
        clearTimeout(timeout);
      }
    }, delay);
    return () => {
      active = false;
      controller.abort();
      clearTimeout(debounce);
      clearTimeout(timeout);
    };
  }, [valid, address, ethPriceUsd, key, usd]);

  // Key the visible result to the current inputs during render, not after an
  // effect/debounce. A previous request can never flash under a new amount.
  const current = state?.key === key ? state : null;
  const quoteErr = valid && (priceError || (!!address && current?.status === 'error'));
  const quoteLoading = valid && !quoteErr && (!ethPriceUsd || (!!address && current?.status !== 'ready'));
  return {
    ethPriceUsd,
    quote: current?.status === 'ready' ? current.quote! : null,
    quoteLoading,
    quoteErr,
    retry: () => { setPriceError(false); setAttempt(n => n + 1); },
  };
}
