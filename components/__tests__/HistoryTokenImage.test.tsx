import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
vi.mock('next/image', () => ({ default: ({ unoptimized: _unoptimized, ...props }: Record<string, unknown>) => <img {...props} /> }));
import { HistoryTokenImage } from '../HistoryTokenImage';

it('keeps a slow logo mounted past ten seconds and shows it when loading finishes', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.useFakeTimers();
  const host = document.createElement('div'); document.body.appendChild(host);
  const root = createRoot(host);
  try {
    await act(async () => { root.render(<HistoryTokenImage src="https://example.invalid/tsla.png" symbol="TSLA" loading={false} />); });
    expect(host.querySelector('img')?.getAttribute('loading')).toBe('eager');
    await act(async () => { vi.advanceTimersByTime(15_000); });
    const img = host.querySelector('img')!;
    expect(img).not.toBeNull();
    await act(async () => { img.dispatchEvent(new Event('load')); });
    expect(img.style.opacity).toBe('1');
    expect(host.querySelector('.history-token-fallback')).toBeNull();
  } finally { await act(async () => root.unmount()); host.remove(); vi.useRealTimers(); vi.unstubAllGlobals(); }
});
