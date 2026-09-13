create table if not exists public.beam_link_backups (
  scope text not null,
  deposit_id text not null check (deposit_id ~ '^(0|[1-9][0-9]*)$'),
  wallet_address text not null check (wallet_address ~ '^0x[0-9a-f]{40}$'),
  encrypted_entry text not null,
  created_at bigint not null,
  primary key (scope, deposit_id)
);
create index if not exists beam_link_backups_wallet_idx
  on public.beam_link_backups (wallet_address, scope, deposit_id);
alter table public.beam_link_backups enable row level security;
revoke all on public.beam_link_backups from public, anon, authenticated;
revoke all on public.beam_link_backups from service_role;
grant select, insert on public.beam_link_backups to service_role;
-- No browser policies. Only the server verifies wallets and decrypts links.
-- No update/delete grant: retries must not overwrite an existing claim key.
