import { NextRequest, NextResponse } from 'next/server';
import { ACCESS_COOKIE, ACCESS_SECONDS, createAccessToken, validPattern } from '@/lib/site-access';

export const dynamic = 'force-dynamic';
const attempts = new Map<string, { count: number; until: number }>();

export async function POST(request: NextRequest) {
  if (request.headers.get('origin') !== request.nextUrl.origin) return NextResponse.json({ error: 'Please reload and try again.' }, { status: 403 });
  const now = Date.now();
  for (const [ip, entry] of attempts) if (entry.until <= now) attempts.delete(ip);
  const ip = request.headers.get('x-nf-client-connection-ip') || request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
  const entry = attempts.get(ip) || { count: 0, until: now + 60_000 };
  attempts.set(ip, entry);
  if (++entry.count > 5) return NextResponse.json({ error: 'Take a moment. Try again in a minute.' }, { status: 429, headers: { 'Retry-After': '60' } });
  try {
    const body = await request.json();
    if (!await validPattern(body?.pattern)) return NextResponse.json({ error: 'That pattern didn’t match. Try again.' }, { status: 401 });
    const response = NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
    response.cookies.set(ACCESS_COOKIE, await createAccessToken(), { httpOnly: true, secure: request.nextUrl.protocol === 'https:', sameSite: 'strict', path: '/', maxAge: ACCESS_SECONDS });
    return response;
  } catch {
    return NextResponse.json({ error: 'Unable to unlock right now. Please try again.' }, { status: 503 });
  }
}
