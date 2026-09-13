// @vitest-environment node
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { encryptBackup, decryptBackup } from './beam-backup-crypto';
import { getSupabaseBeamLinks, saveSupabaseBeamLink, supabaseBackupsConfigured } from './beam-supabase';
import { BEAM_ESCROW_ADDRESS } from './constants';
const entry = { depositId: '1', walletAddress: '0x1111111111111111111111111111111111111111', beamLink: 'https://example.invalid/claim#key=secret&id=1', tokenSymbol: 'ETH', usdAmount: 5, createdAt: 1 };
beforeEach(() => {
  vi.stubEnv('SUPABASE_URL', 'https://example.supabase.co');
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'server-secret');
  vi.stubEnv('BEAM_BACKUP_ENCRYPTION_KEY', 'ab'.repeat(32));
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
it('encrypts claim keys and authenticates both ciphertext and deposit identity', () => {
  const encrypted = encryptBackup(entry, 'deposit-1');
  expect(encrypted).not.toContain('secret');
  expect(decryptBackup(encrypted, 'deposit-1')).toEqual(entry);
  expect(() => decryptBackup(encrypted, 'deposit-2')).toThrow();
  vi.stubEnv('BEAM_BACKUP_ENCRYPTION_KEY', 'cd'.repeat(32));
  expect(() => decryptBackup(encrypted, 'deposit-1')).toThrow();
});
it('inserts only encrypted payloads without overwriting duplicate deposits', async () => {
  const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => [{}] });
  vi.stubGlobal('fetch', fetchMock);
  await saveSupabaseBeamLink(entry);
  const [, options] = fetchMock.mock.calls[0];
  expect(options.body).not.toContain('key=secret');
  expect(options.headers.Prefer).toContain('ignore-duplicates');
  const row = JSON.parse(options.body);
  expect(decryptBackup(row.encrypted_entry, `${row.scope}:${row.deposit_id}:${row.wallet_address}`)).toEqual(entry);
});
it('rejects a duplicate whose existing claim key differs', async () => {
  const scope = `4663:${BEAM_ESCROW_ADDRESS.toLowerCase()}`;
  const row = { scope, deposit_id: '1', wallet_address: entry.walletAddress, created_at: 1, encrypted_entry: encryptBackup({ ...entry, beamLink: 'https://example.invalid/claim#key=other&id=1' }, `${scope}:1:${entry.walletAddress}`) };
  vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({ ok: true, json: async () => [] }).mockResolvedValueOnce({ ok: true, json: async () => [row] }));
  await expect(saveSupabaseBeamLink(entry)).rejects.toThrow('different backup');
});
it('decrypts wallet backups and propagates database outages', async () => {
  const scope = `4663:${BEAM_ESCROW_ADDRESS.toLowerCase()}`;
  const row = { scope, deposit_id: '1', wallet_address: entry.walletAddress, created_at: 1, encrypted_entry: encryptBackup(entry, `${scope}:1:${entry.walletAddress}`) };
  const mock = vi.fn().mockResolvedValueOnce({ ok: true, json: async () => [row] }).mockResolvedValueOnce({ ok: false, status: 503 });
  vi.stubGlobal('fetch', mock);
  expect(await getSupabaseBeamLinks(entry.walletAddress)).toEqual([entry]);
  expect(String(mock.mock.calls[0][0])).toContain('wallet_address=eq.');
  await expect(getSupabaseBeamLinks(entry.walletAddress)).rejects.toThrow('unavailable');
});
it('refuses filesystem backups in production or with partial configuration', () => {
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '');
  expect(() => supabaseBackupsConfigured()).toThrow('incomplete');
  vi.stubEnv('SUPABASE_URL', ''); vi.stubEnv('BEAM_BACKUP_ENCRYPTION_KEY', ''); vi.stubEnv('NODE_ENV', 'production');
  expect(() => supabaseBackupsConfigured()).toThrow('not configured');
});
