// @vitest-environment node
import { afterEach, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { ACCESS_COOKIE, ACCESS_SECONDS, createAccessToken, hasSiteAccess, validPattern } from './site-access';
import { middleware } from '../middleware';

afterEach(() => vi.unstubAllEnvs());
it('accepts only the ordered corner pattern', async () => {
  expect(await validPattern([0, 2, 8, 6])).toBe(true);
  for (const pattern of [[0, 6, 8, 2], [0, 2, 8, 0], [0, 2, 8], ['0', 2, 8, 6], null]) expect(await validPattern(pattern)).toBe(false);
});
it('rejects tampered, expired, and unsigned cookies', async () => {
  vi.stubEnv('BEAM_SITE_LOCK_SECRET', 'a'.repeat(64));
  const now = Date.now();
  const token = await createAccessToken(now);
  expect(await hasSiteAccess(token, now)).toBe(true);
  expect(await hasSiteAccess(token, now + ACCESS_SECONDS * 1000)).toBe(false);
  expect(await hasSiteAccess(token.slice(0, -1) + (token.endsWith('a') ? 'b' : 'a'), now)).toBe(false);
  expect(await hasSiteAccess('true')).toBe(false);
});
it('protects direct pages and APIs, and ignores a spoofed gate header', async () => {
  const page = await middleware(new NextRequest('https://usebe.am/claim?id=1', { headers: { 'x-beam-locked': '0' } }));
  expect(page.headers.get('x-middleware-rewrite')).toBe('https://usebe.am/locked');
  expect(page.headers.get('x-middleware-request-x-beam-locked')).toBe('1');
  expect((await middleware(new NextRequest('https://usebe.am/api/beams'))).status).toBe(401);
});
it('allows signed sessions and the unlock endpoint', async () => {
  vi.stubEnv('BEAM_SITE_LOCK_SECRET', 'a'.repeat(64));
  const token = await createAccessToken();
  const response = await middleware(new NextRequest('https://usebe.am/send', { headers: { cookie: `${ACCESS_COOKIE}=${token}` } }));
  expect(response.headers.get('x-middleware-next')).toBe('1');
  expect(response.headers.get('cache-control')).toBe('private, no-store');
  expect((await middleware(new NextRequest('https://usebe.am/api/site-access'))).headers.get('x-middleware-next')).toBe('1');
});
