# Private preview lock

All pages and APIs require a signed, HTTP-only access cookie. Next.js static
assets and the unlock endpoint remain public so the lock screen can render.
The pattern is checked on the server. Unlocks expire after 12 hours. The gate
rewrites requests rather than redirecting them, preserving claim-link fragments.

The signing secret uses `BEAM_SITE_LOCK_SECRET` when configured, otherwise the
existing server-only `BEAM_BACKUP_ENCRYPTION_KEY`. Do not change the backup key
to reset access. Set a separate site-lock secret to invalidate existing sessions.
The production build and middleware must have access to the signing secret.

This is a casual private-preview gate, not individual account authentication.
Four-point patterns have limited entropy. The unlock endpoint limits attempts
per IP per server instance; distributed attempts need a shared rate-limit store
or hosting-level protection for stronger access control. Wallet authentication
and claim signatures remain required by the underlying transaction flows.

Unauthenticated health checks now return 401. Check application health from an
unlocked browser. Existing claim recipients also need the pattern while the gate
is enabled.
