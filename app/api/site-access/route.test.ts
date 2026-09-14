// @vitest-environment node
import { afterEach, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';
import { hasSiteAccess, ACCESS_COOKIE } from '@/lib/site-access';

afterEach(() => vi.unstubAllEnvs());
function request(pattern: unknown, ip: string, origin = 'https://usebe.am') {
  return new NextRequest('https://usebe.am/api/site-access', { method: 'POST', headers: { origin, 'x-nf-client-connection-ip': ip }, body: JSON.stringify({ pattern }) });
}
it('issues a secure HTTP-only session only for the correct pattern', async () => {
  vi.stubEnv('BEAM_SITE_LOCK_SECRET', 'a'.repeat(64));
  expect((await POST(request([0, 1, 2, 3], 'wrong'))).status).toBe(401);
  const response = await POST(request([0, 2, 8, 6], 'right'));
  expect(response.status).toBe(200);
  expect(await hasSiteAccess(response.cookies.get(ACCESS_COOKIE)?.value)).toBe(true);
  expect(response.headers.get('set-cookie')).toContain('HttpOnly');
  expect(response.headers.get('set-cookie')).toContain('Secure');
});
it('rejects cross-origin attempts and limits repeated guesses', async () => {
  expect((await POST(request([0, 2, 8, 6], 'origin', 'https://another.example'))).status).toBe(403);
  for (let i = 0; i < 5; i++) expect((await POST(request([], 'limited'))).status).toBe(401);
  expect((await POST(request([0, 2, 8, 6], 'limited'))).status).toBe(429);
});
