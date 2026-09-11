'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePublicClient } from 'wagmi';
import { decodeEventLog, formatUnits } from 'viem';
import { Copy, Check, ExternalLink, Clock, Loader2 } from 'lucide-react';
import { BEAM_ESCROW_ABI } from '@/lib/escrow-abi';
import { BEAM_ESCROW_ADDRESS } from '@/lib/constants';
import { loadBeamHistory, saveBeamEntry } from '@/lib/beam-history';
import { fetchRobinhoodTokens } from '@/lib/robinhood-tokens';
import type { StoredBeamLink } from '@/lib/beam-store';

interface SentBeamsProps {
  walletAddress: string;
}

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

// ─── Onchain deposit index ─────────────────────────────────────────────────

interface OnchainDeposit {
  depositId: string;
  token: string;
  amount: bigint;
  claimSigner: string;
  blockNumber: bigint;
}

async function fetchOnchainDeposits(
  walletAddress: string,
  client: ReturnType<typeof usePublicClient>,
): Promise<OnchainDeposit[]> {
  if (!client) return [];
  try {
    const logs = await client.getLogs({
      address: BEAM_ESCROW_ADDRESS,
      event: {
        name: 'Deposited',
        type: 'event',
        inputs: [
          { name: 'depositId', type: 'uint256', indexed: true },
          { name: 'sender', type: 'address', indexed: true },
          { name: 'token', type: 'address', indexed: false },
          { name: 'amount', type: 'uint256', indexed: false },
          { name: 'claimSignerAddress', type: 'address', indexed: false },
        ],
      },
      args: { sender: walletAddress as `0x${string}` },
      fromBlock: 0n,
      toBlock: 'latest',
    });

    return logs.map((log) => {
      const decoded = decodeEventLog({
        abi: BEAM_ESCROW_ABI,
        eventName: 'Deposited',
        topics: log.topics as [`0x${string}`, ...`0x${string}`[]],
        data: log.data,
      });
      const args = decoded.args as {
        depositId: bigint; sender: string; token: string;
        amount: bigint; claimSignerAddress: string;
      };
      return {
        depositId: args.depositId.toString(),
        token: args.token,
        amount: args.amount,
        claimSigner: args.claimSignerAddress,
        blockNumber: log.blockNumber ?? 0n,
      };
    }).sort((a, b) => Number(b.blockNumber - a.blockNumber));
  } catch (e) {
    console.warn('[SentBeams] onchain fetch failed:', e);
    return [];
  }
}

// ─── Server-side link fetch ────────────────────────────────────────────────

async function fetchServerLinks(walletAddress: string): Promise<StoredBeamLink[]> {
  try {
    const res = await fetch(`/api/beams?wallet=${walletAddress}`);
    if (!res.ok) return [];
    const data = await res.json() as { entries: StoredBeamLink[] };
    return data.entries ?? [];
  } catch {
    return [];
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function timeAgo(ms: number): string {
  const diff = Date.now() - ms;
  const mins = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

function formatAmount(amount: bigint, decimals: number): string {
  return Number(formatUnits(amount, decimals)).toPrecision(4).replace(/\.?0+$/, '');
}

// ─── Row ──────────────────────────────────────────────────────────────────

interface RowData {
  depositId: string;
  tokenSymbol: string;
  tokenDecimals: number;
  amount: bigint;
  beamLink: string | null;
  usdAmount: number | null;
  createdAt: number | null;
  claimSigner: string;
}

function BeamRow({ row }: { row: RowData }) {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(async () => {
    if (!row.beamLink) return;
    try { await navigator.clipboard.writeText(row.beamLink); }
    catch {
      const el = Object.assign(document.createElement('textarea'), { value: row.beamLink });
      Object.assign(el.style, { position: 'fixed', opacity: '0' });
      document.body.appendChild(el); el.select(); document.execCommand('copy'); document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [row.beamLink]);

  const formattedAmt = formatAmount(row.amount, row.tokenDecimals);

  return (
    <div className="flex items-center gap-3 py-3 border-b border-white/8 last:border-0">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-white">{formattedAmt} {row.tokenSymbol}</span>
          {row.usdAmount != null && (
            <span className="text-xs text-white/45">${row.usdAmount}</span>
          )}
        </div>
        {row.createdAt != null && (
          <div className="flex items-center gap-1 mt-0.5">
            <Clock size={9} className="text-white/30 shrink-0" aria-hidden="true" />
            <span className="text-[11px] text-white/35">{timeAgo(row.createdAt)}</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-1 shrink-0">
        {row.beamLink && (
          <>
            <button
              type="button"
              onClick={copy}
              className="w-7 h-7 rounded-lg flex items-center justify-center bg-white/8 hover:bg-white/16 transition-colors"
              aria-label={copied ? 'Copied!' : 'Copy BeamLink'}
            >
              {copied
                ? <Check size={12} className="text-emerald-300" />
                : <Copy size={12} className="text-white/50" />}
            </button>
            <a
              href={row.beamLink}
              target="_blank"
              rel="noopener noreferrer"
              className="w-7 h-7 rounded-lg flex items-center justify-center bg-white/8 hover:bg-white/16 transition-colors"
              aria-label="Open claim page"
            >
              <ExternalLink size={12} className="text-white/50" />
            </a>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────

export function SentBeams({ walletAddress }: SentBeamsProps) {
  const client = usePublicClient();

  const [rows, setRows] = useState<RowData[]>([]);
  const [loading, setLoading] = useState(true);
  const [tokenMap, setTokenMap] = useState<Map<string, { symbol: string; decimals: number }>>(new Map());

  // Load token metadata once
  useEffect(() => {
    fetchRobinhoodTokens().then((tokens) => {
      const map = new Map<string, { symbol: string; decimals: number }>();
      for (const t of tokens) map.set(t.address.toLowerCase(), { symbol: t.symbol, decimals: t.decimals });
      setTokenMap(map);
    });
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);

    // Fetch from all three sources in parallel
    const [onchain, serverLinks, localEntries] = await Promise.all([
      fetchOnchainDeposits(walletAddress, client),
      fetchServerLinks(walletAddress),
      Promise.resolve(loadBeamHistory(walletAddress)),
    ]);

    // Server links take priority over local, local is fallback
    const serverMap = new Map(serverLinks.map((e) => [e.depositId, e]));
    const localMap = new Map(localEntries.map((e) => [e.depositId, e]));

    // Back-fill localStorage from server (if server has entries local doesn't)
    for (const entry of serverLinks) {
      if (!localMap.has(entry.depositId)) {
        saveBeamEntry(walletAddress, {
          beamLink: entry.beamLink,
          depositId: entry.depositId,
          tokenSymbol: entry.tokenSymbol,
          usdAmount: entry.usdAmount,
          createdAt: entry.createdAt,
        });
      }
    }

    // Build merged rows from onchain deposits
    const merged: RowData[] = onchain.map((dep) => {
      const stored = serverMap.get(dep.depositId) ?? localMap.get(dep.depositId);
      const isNative = dep.token.toLowerCase() === ZERO_ADDRESS;
      const tokenInfo = isNative
        ? { symbol: 'ETH', decimals: 18 }
        : (tokenMap.get(dep.token.toLowerCase()) ?? { symbol: dep.token.slice(0, 6), decimals: 18 });

      return {
        depositId: dep.depositId,
        tokenSymbol: stored?.tokenSymbol ?? tokenInfo.symbol,
        tokenDecimals: tokenInfo.decimals,
        amount: dep.amount,
        beamLink: stored?.beamLink ?? null,
        usdAmount: stored?.usdAmount ?? null,
        createdAt: stored?.createdAt ?? null,
        claimSigner: dep.claimSigner,
      };
    });

    setRows(merged);
    setLoading(false);
  }, [walletAddress, client, tokenMap]);

  useEffect(() => { void refresh(); }, [refresh]);

  if (loading) {
    return (
      <div className="glass-sm rounded-2xl px-4 py-4 flex items-center gap-2 text-white/40 text-xs">
        <Loader2 size={12} className="animate-spin shrink-0" />
        Loading your sent beams…
      </div>
    );
  }

  if (rows.length === 0) return null;

  return (
    <div className="glass-sm rounded-2xl px-4 py-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[11px] font-medium text-white/40 uppercase tracking-wider">Your sent beams</p>
        <button
          type="button"
          onClick={refresh}
          className="text-[11px] text-white/30 hover:text-white/60 transition-colors"
        >
          Refresh
        </button>
      </div>
      {rows.map((row) => <BeamRow key={row.depositId} row={row} />)}
    </div>
  );
}
