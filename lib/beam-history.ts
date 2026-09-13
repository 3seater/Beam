/**
 * lib/beam-history.ts
 *
 * Persists sent BeamLinks to localStorage keyed by sender wallet address.
 * Entries survive page refreshes and accidental navigation.
 * The private key is already embedded in the link URL itself — we store
 * the full link so the sender can re-share it at any time.
 */

export interface BeamHistoryEntry {
  kind?: 'spectrum';
  beamLink:     string;          // full /claim#key=...&id=... URL
  depositId:    string;          // base-10 decimal string
  tokenSymbol:  string;          // e.g. "NVDA", "ETH"
  usdAmount:    number;          // dollar amount the sender paid
  createdAt:    number;          // Unix ms
}

const STORAGE_KEY_PREFIX = 'beam:history:';

function storageKey(walletAddress: string): string {
  return `${STORAGE_KEY_PREFIX}${walletAddress.toLowerCase()}`;
}

/** Returns all beam history entries for a wallet, newest first. */
export function loadBeamHistory(walletAddress: string): BeamHistoryEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(storageKey(walletAddress));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as BeamHistoryEntry[];
    return parsed.sort((a, b) => b.createdAt - a.createdAt);
  } catch {
    return [];
  }
}

/** Saves a new beam entry, keeping at most 50 per wallet. */
export function saveBeamEntry(
  walletAddress: string,
  entry: BeamHistoryEntry,
): void {
  if (typeof window === 'undefined') return;
  try {
    const existing = loadBeamHistory(walletAddress);
    // Avoid duplicates by depositId
    const filtered = existing.filter((e) => e.depositId !== entry.depositId || e.kind !== entry.kind);
    const updated  = [entry, ...filtered].slice(0, 50);
    localStorage.setItem(storageKey(walletAddress), JSON.stringify(updated));
  } catch {
    // localStorage might be full or disabled — fail silently
  }
}

/** Removes a specific entry (e.g. after it's been claimed/cancelled). */
export function removeBeamEntry(walletAddress: string, depositId: string, kind?: 'spectrum'): void {
  if (typeof window === 'undefined') return;
  try {
    const existing = loadBeamHistory(walletAddress);
    const updated  = existing.filter((e) => e.depositId !== depositId || e.kind !== kind);
    localStorage.setItem(storageKey(walletAddress), JSON.stringify(updated));
  } catch {}
}
