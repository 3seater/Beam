import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { BeamLinkDisplay } from '../CreateBeamModal/BeamLinkDisplay';

let root: Root;
let host: HTMLDivElement;
const clipboardDescriptor = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
const link = 'https://example.invalid/claim#key=sample-private-fragment&id=123';

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
});

afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  if (clipboardDescriptor) Object.defineProperty(navigator, 'clipboard', clipboardDescriptor);
  else Reflect.deleteProperty(navigator, 'clipboard');
  Reflect.deleteProperty(document, 'execCommand');
  vi.unstubAllGlobals();
});

it('copies the complete claim fragment even though the receipt hides the raw URL', async () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
  await act(async () => root.render(<BeamLinkDisplay beamLink={link} />));
  await act(async () => host.querySelector<HTMLButtonElement>('button[aria-label="Copy link"]')!.click());
  expect(writeText).toHaveBeenCalledWith(link);
  expect(host.querySelector('[role="status"]')?.textContent).toContain('copied');
});

it('offers the full selectable link instead of reporting success when copying fails', async () => {
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: vi.fn().mockRejectedValue(new Error('Denied')) } });
  Object.defineProperty(document, 'execCommand', { configurable: true, value: vi.fn().mockReturnValue(false) });
  await act(async () => root.render(<BeamLinkDisplay beamLink={link} />));
  await act(async () => host.querySelector<HTMLButtonElement>('button[aria-label="Copy link"]')!.click());
  expect(host.querySelector('[role="alert"]')).not.toBeNull();
  expect(host.querySelector<HTMLInputElement>('input[aria-label="Your Beam link"]')?.value).toBe(link);
  expect(host.querySelector('button[aria-label="Copied!"]')).toBeNull();
});
