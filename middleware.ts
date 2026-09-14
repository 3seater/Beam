import { NextRequest, NextResponse } from 'next/server';
import { ACCESS_COOKIE, hasSiteAccess } from './lib/site-access';

export async function middleware(request: NextRequest) {
  const headers = new Headers(request.headers);
  headers.delete('x-beam-locked');
  const pathname = request.nextUrl.pathname;
  if (pathname === '/api/site-access') return NextResponse.next({ request: { headers } });
  if (await hasSiteAccess(request.cookies.get(ACCESS_COOKIE)?.value)) {
    const response = NextResponse.next({ request: { headers } });
    response.headers.set('Cache-Control', 'private, no-store');
    return response;
  }
  if (pathname.startsWith('/api/')) return NextResponse.json({ error: 'Unlock Beam to continue.' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
  headers.set('x-beam-locked', '1');
  const url = request.nextUrl.clone();
  url.pathname = '/locked';
  url.search = '';
  const response = NextResponse.rewrite(url, { request: { headers } });
  response.headers.set('Cache-Control', 'private, no-store');
  response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|favicon.png).*)'],
};
