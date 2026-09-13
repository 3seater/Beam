# Durable Beam link backups

The previous backup used `.data/beams.json` plus browser local storage. A local
filesystem is not shared across servers and may disappear on deployment. Wallet
verification cannot regenerate the random claim key from an onchain deposit.

## Supabase setup

1. Create a Supabase project and run
   `supabase/migrations/202609130001_beam_link_backups.sql` in its SQL editor.
   Keep the Data API enabled. The table has RLS enabled, no browser policies,
   and only server-role SELECT/INSERT access.
2. Set these **server-only** variables in `.env.local` and the hosting dashboard:
   `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (legacy service-role JWT), and
   `BEAM_BACKUP_ENCRYPTION_KEY`. Never prefix these with `NEXT_PUBLIC_`.
3. Generate the encryption key once:
   `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`.
   Store the 64-character hex value securely and keep a separate secure backup.
   All app instances must use the same key. Losing/changing it makes existing
   encrypted backups unreadable. Rotation requires re-encryption, not replacement.
4. Restart the local app. `GET /api/beams/health` must return HTTP 200 with `durable: true`.
   Check the actual hosting environment too after deployment.
5. With the app running at localhost:3000, run
   `node scripts/migrate-beam-backups.mjs --dry-run`, then
   `node scripts/migrate-beam-backups.mjs`. This verifies each legacy link against
   its deposit through the API and preserves the source file. The app must have
   the escrow addresses used by those deposits configured.
6. Verify restoration from a browser with no cached Beam history before retiring
   the old backup. Check Supabase backup retention for your plan and test recovery.

The Supabase record is namespaced by chain and escrow address. Its payload is
encrypted with AES-256-GCM and bound to the wallet/deposit identity. Duplicate
inserts cannot replace an existing claim key. Reads are paginated; browser history
no longer evicts links after 50 entries. Database failures never fall back to a
local file in production.

New sends check storage availability before submitting transactions. A health
check does not make blockchain submission and database insertion atomic: an
outage or browser closure after submission can still interrupt backup. Keep the
original link when a send reports backup failure. A complete security audit and
durable pre-submission recovery journal are separate work from this storage fix.

Anyone holding a full claim link can claim its funds. The app server can decrypt
backups, so this is a server-trusted recovery system. Database encryption limits
the impact of database-only access; it does not protect against a compromised app
server or leaked encryption key. Browser local storage remains a convenience cache.

If a claim key is missing from every backup and original link, it cannot be
recreated. An unclaimed deposit can still be cancelled by its original sending
wallet according to the escrow contract; confirm its onchain status first.

References: [Supabase Data API](https://supabase.com/docs/guides/api),
[RLS and server-role access](https://supabase.com/docs/guides/database/postgres/row-level-security).
