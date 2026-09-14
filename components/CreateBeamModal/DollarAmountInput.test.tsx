import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { DollarAmountInput } from './DollarAmountInput';
import { fetchTokenPriceUsd } from '@/lib/robinhood-prices';
import type { SelectedAsset } from './TokenPicker';
import { AmountQuotePanel } from './AmountQuotePanel';
import type { UniswapQuote } from '@/lib/uniswap-swap';

vi.mock('@/hooks/useAmountQuote', () => ({
  useAmountQuote: (value: string) => ({
    quote: { amountOutFormatted: value === '25' ? '702.41' : '1,408',
      amountOut: value === '25' ? 702410000000000000000n : 1408000000000000000000n },
    quoteLoading: false, quoteErr: false, ethPriceUsd: 2500, retry: vi.fn(),
  }),
}));
vi.mock('@/lib/robinhood-prices', async importOriginal => ({
  ...await importOriginal<typeof import('@/lib/robinhood-prices')>(),
  fetchTokenPriceUsd: vi.fn(),
}));

let root: Root;
let host: HTMLDivElement;
const noop = () => {};
const onTokenAmount = vi.fn();
const asset = (): SelectedAsset => ({ type: 'erc20', symbol: 'ZZZ',
  address: '0x1111111111111111111111111111111111111111',
  name: 'ZZZ', logoUrl: '', decimals: 18 });
async function render(value: string, selectedAsset = asset()) {
  await act(async () => root.render(<DollarAmountInput dollarValue={value}
    selectedAsset={selectedAsset} onChange={noop} onError={noop} onTokenAmount={onTokenAmount} />));
}
beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.mocked(fetchTokenPriceUsd).mockReset();
  onTokenAmount.mockClear();
  host = document.createElement('div');
  root = createRoot(host);
});
afterEach(async () => {
  await act(async () => root.unmount());
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

it('keeps the USD valuation when changing amounts with a recreated asset object', async () => {
  vi.mocked(fetchTokenPriceUsd).mockResolvedValueOnce(24.92 / 702.41).mockResolvedValue(null);
  await render('25');
  expect(host.textContent).toContain('≈ $24.92');
  await render('50');
  expect(host.textContent).toContain('≈ $49.95');
  expect(host.textContent).toContain('0.1% impact');
  expect(onTokenAmount).toHaveBeenLastCalledWith('1408');
  expect(fetchTokenPriceUsd).toHaveBeenCalledTimes(1);
});

it.each([18, 6])('values the exact raw output for a grouped display with %i decimals', async decimals => {
  const quote = { amountOutFormatted: '1,423',
    amountOut: 142258n * 10n ** BigInt(decimals - 2) } as UniswapQuote;
  await act(async () => root.render(<AmountQuotePanel loading={false} error={false}
    native={false} quote={quote} usd={50} symbol="ZZZ" tokenPrice={0.035}
    tokenDecimals={decimals} nativeAmount={null} />));
  expect(host.textContent).toContain('1,423 ZZZ');
  expect(host.textContent).toContain('≈ $49.79');
  expect(host.textContent).toContain('0.4% impact');
});

it('automatically retries a failed price lookup and cancels retries on unmount', async () => {
  vi.mocked(fetchTokenPriceUsd).mockResolvedValueOnce(null).mockResolvedValue(0.0355);
  await render('50');
  await act(async () => { await vi.advanceTimersByTimeAsync(2000); });
  expect(host.textContent).toContain('≈ $49.98');
  const other = { ...asset(), address: '0x2222222222222222222222222222222222222222' } as SelectedAsset;
  vi.mocked(fetchTokenPriceUsd).mockResolvedValue(null);
  await render('50', other);
  expect(host.textContent).not.toContain('≈ $49.98');
  await act(async () => root.unmount());
  const calls = vi.mocked(fetchTokenPriceUsd).mock.calls.length;
  await act(async () => { await vi.advanceTimersByTimeAsync(4000); });
  expect(fetchTokenPriceUsd).toHaveBeenCalledTimes(calls);
});
