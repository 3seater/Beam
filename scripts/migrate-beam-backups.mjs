// Run the app locally with Supabase configured, then import through the same
// deposit verification/encryption API used for new links. Never print claim keys.
import { readFile } from 'node:fs/promises';

const entries = Object.values(JSON.parse(await readFile(new URL('../.data/beams.json', import.meta.url), 'utf8')));
if (process.argv.includes('--dry-run')) {
  console.log(`${entries.length} local backups available to migrate. Source file will be preserved.`);
} else {
  const endpoint = 'http://localhost:3000/api/beams';
  const health = await fetch(endpoint + '/health');
  if (!health.ok) throw new Error('Local app backup storage is unavailable. Configure Supabase first.');
  if (!(await health.json()).durable) throw new Error('The running app is still using development file storage. Configure Supabase and restart it before migrating.');
  // The local app must use Supabase, not its development JSON store.
  const { loadEnvConfig } = await import('@next/env').then(module => module.default ?? module);
  loadEnvConfig(process.cwd());
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.BEAM_BACKUP_ENCRYPTION_KEY) throw new Error('Set all Supabase backup variables in .env.local and restart the app first.');
  let saved = 0;
  for (const entry of entries) {
    const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(entry), signal: AbortSignal.timeout(60_000) });
    if (!response.ok) throw new Error(`Migration stopped at deposit ${entry.depositId} (${response.status}). Source file is unchanged; retry after resolving storage or deposit verification.`);
    saved++;
  }
  console.log(`${saved} backups verified and saved. Source file preserved. Verify wallet restoration before retiring the old storage.`);
}
