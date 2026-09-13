export async function requireBeamBackup(): Promise<void> {
  try {
    const response = await fetch('/api/beams/health', { cache: 'no-store', signal: AbortSignal.timeout(20_000) });
    if (!response.ok) throw new Error();
  } catch {
    throw new Error('Link backup storage is unavailable. Please try sending again later.');
  }
}
