import { BEAM_ESCROW_ADDRESS } from './constants';
import { SPECTRUM_ESCROW_ADDRESS } from './spectrum';
import { robinhoodChain } from './chains';
import { encryptBackup, decryptBackup } from './beam-backup-crypto';
import type { StoredBeamLink } from './beam-store';

type BackupRow = { scope: string; deposit_id: string; wallet_address: string; encrypted_entry: string; created_at: number };
const PAGE_SIZE = 500;
const scope = (kind?: 'spectrum') => `${robinhoodChain.id}:${(kind === 'spectrum' ? SPECTRUM_ESCROW_ADDRESS : BEAM_ESCROW_ADDRESS).toLowerCase()}`;
const identity = (row: Pick<BackupRow, 'scope' | 'deposit_id' | 'wallet_address'>) => `${row.scope}:${row.deposit_id}:${row.wallet_address}`;

export function supabaseBackupsConfigured(): boolean {
  const configured = !!(process.env.SUPABASE_URL || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.BEAM_BACKUP_ENCRYPTION_KEY);
  if (configured && !(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.BEAM_BACKUP_ENCRYPTION_KEY)) throw new Error('Supabase link backup configuration is incomplete');
  if (!configured && process.env.NODE_ENV === 'production') throw new Error('Durable Supabase link backups are not configured');
  return configured;
}

async function request(params: URLSearchParams, init: RequestInit = {}): Promise<BackupRow[]> {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const url = new URL('/rest/v1/beam_link_backups', process.env.SUPABASE_URL!);
  if (url.protocol !== 'https:') throw new Error('Supabase backups require HTTPS');
  url.search = params.toString();
  const response = await fetch(url, {
    ...init, cache: 'no-store', signal: AbortSignal.timeout(15_000),
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', ...init.headers },
  });
  // Never include a database response or request body in an error: it may contain secrets.
  if (!response.ok) throw new Error(`Supabase link backup unavailable (${response.status})`);
  return await response.json() as BackupRow[];
}

function decode(row: BackupRow): StoredBeamLink {
  const entry = decryptBackup<StoredBeamLink>(row.encrypted_entry, identity(row));
  if (entry.depositId !== row.deposit_id || entry.walletAddress !== row.wallet_address || scope(entry.kind) !== row.scope) throw new Error('Backup identity mismatch');
  return entry;
}

export async function saveSupabaseBeamLink(entry: StoredBeamLink): Promise<void> {
  const normalized = { ...entry, walletAddress: entry.walletAddress.toLowerCase() };
  const row = { scope: scope(entry.kind), deposit_id: entry.depositId, wallet_address: normalized.walletAddress, created_at: entry.createdAt };
  const inserted = await request(new URLSearchParams({ on_conflict: 'scope,deposit_id' }), {
    method: 'POST', headers: { Prefer: 'resolution=ignore-duplicates,return=representation' },
    body: JSON.stringify({ ...row, encrypted_entry: encryptBackup(normalized, identity(row)) }),
  });
  if (inserted.length) return;
  const existing = await request(new URLSearchParams({ scope: `eq.${row.scope}`, deposit_id: `eq.${row.deposit_id}`, select: '*' }));
  const saved = existing[0] && decode(existing[0]);
  if (!saved || saved.walletAddress !== normalized.walletAddress || new URL(saved.beamLink).hash !== new URL(entry.beamLink).hash) throw new Error('A different backup already exists for this deposit');
}

export async function getSupabaseBeamLinks(walletAddress: string): Promise<StoredBeamLink[]> {
  const result: StoredBeamLink[] = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const rows = await request(new URLSearchParams({ wallet_address: `eq.${walletAddress.toLowerCase()}`, scope: `in.(${scope()},${scope('spectrum')})`, select: '*', order: 'scope.asc,deposit_id.asc', limit: String(PAGE_SIZE), offset: String(offset) }));
    result.push(...rows.map(decode));
    if (rows.length < PAGE_SIZE) return result.sort((a, b) => b.createdAt - a.createdAt);
  }
}

export async function getSupabaseBeamLink(depositId: string): Promise<StoredBeamLink | null> {
  const rows = await request(new URLSearchParams({ scope: `eq.${scope()}`, deposit_id: `eq.${depositId}`, select: '*' }));
  return rows[0] ? decode(rows[0]) : null;
}

export async function checkSupabaseBackups(): Promise<void> {
  if (!supabaseBackupsConfigured()) return;
  encryptBackup({ health: true }, 'health');
  await request(new URLSearchParams({ select: 'deposit_id', limit: '1' }));
}
