import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { beforeEach, afterEach, it, expect, vi } from 'vitest';
import { useAmountQuote } from './useAmountQuote';
import { fetchTokenPriceUsd } from '@/lib/robinhood-prices';
import { fetchUniswapQuote, type UniswapQuote } from '@/lib/uniswap-swap';

vi.mock('@/lib/robinhood-prices', () => ({ fetchTokenPriceUsd: vi.fn() }));
vi.mock('@/lib/uniswap-swap', () => ({ fetchUniswapQuote: vi.fn() }));
const address = '0x1111111111111111111111111111111111111111';
let root: Root;
let host: HTMLDivElement;
let result: ReturnType<typeof useAmountQuote>;
function Harness({ value }: { value: string }) {
  result = useAmountQuote(value, address);
  return <span>{result.quoteLoading ? 'loading' : result.quoteErr ? 'error' : result.quote?.amountOutFormatted}</span>;
}
const quote = (amount: string) => ({ amountOutFormatted: amount } as UniswapQuote);
beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.mocked(fetchTokenPriceUsd).mockResolvedValue(2500);
  vi.mocked(fetchUniswapQuote).mockReset();
  host = document.createElement('div');
  root = createRoot(host);
});
afterEach(async () => {
  await act(async () => root.unmount());
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
async function render(value: string) { await act(async () => root.render(<Harness value={value} />)); }
async function tick(ms: number) { await act(async () => { await vi.advanceTimersByTimeAsync(ms); }); }

it('hides a previous quote immediately during custom amount debounce', async () => {
  vi.mocked(fetchUniswapQuote).mockResolvedValue(quote('old'));
  await render('5'); await tick(0);
  expect(result.quote?.amountOutFormatted).toBe('old');
  await render('12');
  expect(result.quote).toBeNull();
  expect(result.quoteLoading).toBe(true);
  expect(fetchUniswapQuote).toHaveBeenCalledTimes(1);
});

it('ignores out-of-order results and aborts superseded requests', async () => {
  let resolveOld!: (value: UniswapQuote) => void;
  vi.mocked(fetchUniswapQuote).mockImplementationOnce(() => new Promise(resolve => { resolveOld = resolve; }));
  vi.mocked(fetchUniswapQuote).mockResolvedValueOnce(quote('new'));
  await render('5'); await tick(0);
  const signal = vi.mocked(fetchUniswapQuote).mock.calls[0][2];
  await render('10'); await tick(0);
  expect(signal?.aborted).toBe(true);
  await act(async () => resolveOld(quote('old')));
  expect(result.quote?.amountOutFormatted).toBe('new');
  await render('');
  expect(result.quote).toBeNull();
  expect(result.quoteLoading).toBe(false);
});

it('times out stalled quotes and can retry successfully', async () => {
  vi.mocked(fetchUniswapQuote).mockImplementationOnce(() => new Promise(() => {}));
  await render('5'); await tick(12_000);
  expect(result.quoteLoading).toBe(false);
  expect(result.quoteErr).toBe(true);
  vi.mocked(fetchUniswapQuote).mockResolvedValueOnce(quote('fresh'));
  await act(async () => result.retry()); await tick(0);
  expect(result.quote?.amountOutFormatted).toBe('fresh');
});
