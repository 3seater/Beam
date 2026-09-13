import { NextResponse } from 'next/server';
import { checkSupabaseBackups, supabaseBackupsConfigured } from '@/lib/beam-supabase';
export const dynamic = 'force-dynamic';
export async function GET() {
  try {
    await checkSupabaseBackups();
    return NextResponse.json({ ready: true, durable: supabaseBackupsConfigured() }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ error: 'Link backup storage is unavailable. Please try sending again later.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
