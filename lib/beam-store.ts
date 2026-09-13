/**
 * lib/beam-store.ts  — server-side beam link storage
 *
 * Production uses encrypted Supabase backups. The JSON file is for development
 * only and is never a fallback after a database failure.
 */

import { promises as fs } from 'fs';
import path from 'path';
import { supabaseBackupsConfigured, saveSupabaseBeamLink, getSupabaseBeamLinks, getSupabaseBeamLink } from './beam-supabase';

const DATA_DIR  = path.join(process.cwd(), '.data');
const DATA_FILE = path.join(DATA_DIR, 'beams.json');

export interface StoredBeamLink {
  kind?: 'spectrum';
  depositId:   string;   // base-10 string
  walletAddress: string; // sender, lowercase
  beamLink:    string;   // full URL with #key=...&id=...
  tokenSymbol: string;
  usdAmount:   number;
  createdAt:   number;   // Unix ms
}

type Store = Record<string, StoredBeamLink>; // key = depositId

async function readStore(): Promise<Store> {
  try {
    const raw = await fs.readFile(DATA_FILE, 'utf8');
    return JSON.parse(raw) as Store;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    return {};
  }
}

async function writeStore(store: Store): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const temporary = DATA_FILE + '.tmp';
  await fs.writeFile(temporary, JSON.stringify(store, null, 2), 'utf8');
  await fs.rename(temporary, DATA_FILE);
}

let writes: Promise<void> = Promise.resolve();
export function saveBeamLink(entry: StoredBeamLink): Promise<void> {
  if (supabaseBackupsConfigured()) return saveSupabaseBeamLink(entry);
  const write = writes.then(() => writeEntry(entry));
  writes = write.catch(() => {});
  return write;
}

async function writeEntry(entry: StoredBeamLink): Promise<void> {
  const store = await readStore();
  const storeKey = entry.kind === 'spectrum' ? `spectrum:${entry.depositId}` : entry.depositId;
  const existing = store[storeKey];
  if (existing && (existing.walletAddress.toLowerCase() !== entry.walletAddress.toLowerCase() || new URL(existing.beamLink).hash !== new URL(entry.beamLink).hash)) throw new Error('A different backup already exists for this deposit');
  store[storeKey] = {
    ...entry,
    walletAddress: entry.walletAddress.toLowerCase(),
  };
  await writeStore(store);
}

export async function getBeamLinksForWallet(
  walletAddress: string,
): Promise<StoredBeamLink[]> {
  if (supabaseBackupsConfigured()) return getSupabaseBeamLinks(walletAddress);
  const store  = await readStore();
  const addr   = walletAddress.toLowerCase();
  return Object.values(store)
    .filter((e) => e.walletAddress === addr)
    .sort((a, b) => b.createdAt - a.createdAt);
}

export async function getBeamLink(depositId: string): Promise<StoredBeamLink | null> {
  if (supabaseBackupsConfigured()) return getSupabaseBeamLink(depositId);
  const store = await readStore();
  return store[depositId] ?? null;
}
