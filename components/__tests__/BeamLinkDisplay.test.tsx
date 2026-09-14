import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BeamLinkDisplay } from '../CreateBeamModal/BeamLinkDisplay';

// A dummy claim fragment, including bundle metadata and query delimiters.
const link = 'https://usebe.am/claim#key=0x1234&depositId=42&kind=spectrum';
let host: HTMLDivElement;
let root: Root;
const writeText = vi.fn();
const channel = (name: string) => [...host.querySelectorAll('a')].find(a => a.textContent === name)!;
async function render(userAgent = 'Mozilla/5.0 (Linux; Android 15)') {
  vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(userAgent);
  await act(async () => root.render(<BeamLinkDisplay beamLink={link} />));
}
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  host = document.createElement('div');
  root = createRoot(host);
  writeText.mockReset().mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
});
afterEach(async () => {
  await act(async () => root.unmount());
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  delete (navigator as unknown as { clipboard?: unknown }).clipboard;
});

describe('receipt share destinations', () => {
  it('preserves the full claim fragment in WhatsApp and Telegram parameters', async () => {
    await render();
    const whatsapp = new URL(channel('WhatsApp').href);
    expect(whatsapp.origin + whatsapp.pathname).toBe('https://wa.me/');
    expect(whatsapp.searchParams.get('text')).toContain('\n' + link);
    expect(whatsapp.hash).toBe('');
    const telegram = new URL(channel('Telegram').href);
    expect(telegram.origin + telegram.pathname).toBe('https://t.me/share/url');
    expect(telegram.searchParams.get('url')).toBe(link);
    expect(telegram.searchParams.get('text')).toContain('sign in');
    expect(telegram.hash).toBe('');
  });
  it.each([
    ['Mozilla/5.0 (Linux; Android 15)', '?'],
    ['Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)', '&'],
    ['Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', '&'],
  ])('uses the Messages delimiter for %s', async (agent, delimiter) => {
    await render(agent);
    const messages = channel('Messages');
    expect(messages.getAttribute('href')).toMatch(new RegExp('^sms:\\' + delimiter + 'body='));
    expect(decodeURIComponent(messages.href.split('body=')[1])).toContain('\n' + link);
    expect(messages.hasAttribute('target')).toBe(false);
  });
  it('opens X messages without putting the claim key into a public post URL and copies the link', async () => {
    await render();
    const x = channel('X DM');
    expect(x.href).toBe('https://x.com/messages');
    expect(x.target).toBe('_blank');
    // Cancel navigation in jsdom, while exercising the actual click handler.
    x.addEventListener('click', event => event.preventDefault());
    await act(async () => x.click());
    expect(writeText).toHaveBeenCalledWith(link);
    expect(host.textContent).toContain('Link copied');
    expect(host.textContent).toContain('paste it into a DM');
  });
  it('shows the full selectable link if copying for X fails', async () => {
    writeText.mockRejectedValue(new Error('Clipboard denied'));
    Object.defineProperty(document, 'execCommand', { configurable: true, value: vi.fn(() => false) });
    await render();
    const x = channel('X DM');
    x.addEventListener('click', event => event.preventDefault());
    await act(async () => x.click());
    expect(host.querySelector('[role="alert"] input')?.getAttribute('value')).toBe(link);
    expect(host.textContent).not.toContain('Link copied');
    delete (document as unknown as { execCommand?: unknown }).execCommand;
  });
});
