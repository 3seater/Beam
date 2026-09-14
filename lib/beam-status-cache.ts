export type CachedBeamStatus = 'unclaimed' | 'claimed' | 'cancelled' | 'closed';

function key(contract: string, depositId: string) {
  return `beam:status:4663:${contract.toLowerCase()}:${depositId}`;
}

export function readBeamStatus(contract: string, depositId: string): CachedBeamStatus | undefined {
  try {
    const cached = JSON.parse(localStorage.getItem(key(contract, depositId)) ?? 'null');
    if (!cached || Date.now() - cached.updatedAt > 7 * 86_400_000) return;
    if (['unclaimed', 'claimed', 'cancelled', 'closed'].includes(cached.status)) return cached.status;
  } catch { /* Storage is optional. */ }
}

export function cacheBeamStatus(contract: string, depositId: string, status: CachedBeamStatus) {
  try {
    localStorage.setItem(key(contract, depositId), JSON.stringify({ status, updatedAt: Date.now() }));
  } catch { /* Storage is optional. */ }
}
