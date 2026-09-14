export const ACCESS_COOKIE = 'beam-site-access';
export const ACCESS_SECONDS = 60 * 60 * 12;
const encoder = new TextEncoder();
const hex = (bytes: ArrayBuffer) => Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2, '0')).join('');

async function signingKey() {
  const secret = process.env.BEAM_SITE_LOCK_SECRET || process.env.BEAM_BACKUP_ENCRYPTION_KEY;
  if (!secret || secret.length < 32) throw new Error('Site access is not configured.');
  return crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

export async function validPattern(pattern: unknown): Promise<boolean> {
  if (!Array.isArray(pattern) || pattern.length !== 4 || pattern.some(n => !Number.isInteger(n) || n < 0 || n > 8) || new Set(pattern).size !== 4) return false;
  const digest = hex(await crypto.subtle.digest('SHA-256', encoder.encode(pattern.join(','))));
  return digest === '2a1f2afaaad067cc92e79eab4f4a3a1acbbf438bef21584405cc745abfdcd887';
}

export async function createAccessToken(now = Date.now()): Promise<string> {
  const expiry = String(Math.floor(now / 1000) + ACCESS_SECONDS);
  const signature = await crypto.subtle.sign('HMAC', await signingKey(), encoder.encode(`beam-site-access:v1:${expiry}`));
  return `${expiry}.${hex(signature)}`;
}

export async function hasSiteAccess(token?: string, now = Date.now()): Promise<boolean> {
  if (!token || !/^\d{10}\.[a-f0-9]{64}$/.test(token)) return false;
  const [expiry, signature] = token.split('.');
  const remaining = Number(expiry) - Math.floor(now / 1000);
  if (remaining <= 0 || remaining > ACCESS_SECONDS) return false;
  try {
    return await crypto.subtle.verify('HMAC', await signingKey(), Uint8Array.from(signature.match(/../g)!, b => parseInt(b, 16)), encoder.encode(`beam-site-access:v1:${expiry}`));
  } catch { return false; }
}
