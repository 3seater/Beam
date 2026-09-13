import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

function encryptionKey(): Buffer {
  const key = process.env.BEAM_BACKUP_ENCRYPTION_KEY;
  if (!key || !/^[0-9a-fA-F]{64}$/.test(key)) throw new Error('BEAM_BACKUP_ENCRYPTION_KEY must be a 32-byte hex key');
  return Buffer.from(key, 'hex');
}

export function encryptBackup(value: unknown, identity: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv);
  cipher.setAAD(Buffer.from(identity));
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
  return ['v1', iv.toString('base64'), cipher.getAuthTag().toString('base64'), encrypted.toString('base64')].join('.');
}

export function decryptBackup<T>(value: string, identity: string): T {
  const [version, iv, tag, ciphertext] = value.split('.');
  if (version !== 'v1' || !iv || !tag || !ciphertext) throw new Error('Invalid encrypted backup');
  const decipher = createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(iv, 'base64'));
  decipher.setAAD(Buffer.from(identity));
  decipher.setAuthTag(Buffer.from(tag, 'base64'));
  return JSON.parse(Buffer.concat([decipher.update(Buffer.from(ciphertext, 'base64')), decipher.final()]).toString('utf8')) as T;
}
