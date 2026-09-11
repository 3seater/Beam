/**
 * lib/beam-store.ts  — server-side beam link storage
 *
 * Stores BeamLinks persistently so they survive browser data clears.
 * Currently backed by a JSON file in .data/ (gitignored).
 *
 * To upgrade to Redis/Upstash in production:
 *   1. npm install @upstash/redis
 *   2. Replace readStore/writeStore with Redis get/set calls
 *   3. The API surface (saveBeamLink / getBeamLinksForWallet) stays identical
 */

import { promises as fs } from 'fs';
import path from 'path';

const DATA_DIR  = path.join(process.cwd(), '.data');
const DATA_FILE = path.join(DATA_DIR, 'beams.json');

export interface StoredBeamLink {
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
  } catch {
    return {};
  }
}

async function writeStore(store: Store): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(store, null, 2), 'utf8');
}

export async function saveBeamLink(entry: StoredBeamLink): Promise<void> {
  const store = await readStore();
  store[entry.depositId] = {
    ...entry,
    walletAddress: entry.walletAddress.toLowerCase(),
  };
  await writeStore(store);
}

export async function getBeamLinksForWallet(
  walletAddress: string,
): Promise<StoredBeamLink[]> {
  const store  = await readStore();
  const addr   = walletAddress.toLowerCase();
  return Object.values(store)
    .filter((e) => e.walletAddress === addr)
    .sort((a, b) => b.createdAt - a.createdAt);
}

export async function getBeamLink(depositId: string): Promise<StoredBeamLink | null> {
  const store = await readStore();
  return store[depositId] ?? null;
}
