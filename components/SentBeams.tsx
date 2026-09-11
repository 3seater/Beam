'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { usePublicClient, useWriteContract } from 'wagmi';
import { decodeEventLog, formatUnits } from 'viem';
import { Copy, Check, ExternalLink, Clock, Loader2, XCircle } from 'lucide-react';
import { BEAM_ESCROW_ABI } from '@/lib/escrow-abi';
import { BEAM_ESCROW_ADDRESS } from '@/lib/constants';
import { loadBeamHistory, saveBeamEntry } from '@/lib/beam-history';
import { fetchRobinhoodTokens } from '@/lib/robinhood-tokens';
import type { StoredBeamLink } from '@/lib/beam-store';

interface SentBeamsProps {
  walletAddress: string;
}

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

// ─── Onchain fetch ─────────────────────────────────────────────────────────

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

async function fetchDepositStatus(
  depositId: string,
  client: ReturnType<typeof usePublicClient>,
): Promise<'unclaimed' | 'claimed' | 'cancelled' | 'unknown'> {
  if (!client) return 'unknown';
  try {
    const result = await client.readContract({
      address: BEAM_ESCROW_ADDRESS,
      abi: BEAM_ESCROW_ABI,
      functionName: 'getDeposit',
      args: [BigInt(depositId)],
    }) as { claimed: boolean; amount: bigint };

    if (result.amount === 0n) return 'cancelled'; // cancelled deposits have amount=0 after refund
    return result.claimed ? 'claimed' : 'unclaimed';
  } catch {
    return 'unknown';
  }
}

// ─── Server fetch ──────────────────────────────────────────────────────────

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

function BeamRow({
  row,
  onCancelled,
}: {
  row: RowData;
  onCancelled: (depositId: string) => void;
}) {
  const client = usePublicClient();
  const { writeContractAsync } = useWriteContract();

  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState<'unclaimed' | 'claimed' | 'cancelled' | 'unknown' | 'loading'>('loading');
  const [cancelling, setCancelling] = useState(false);
  const [cancelErr, setCancelErr] = useState<string | null>(null);

  // Fetch claim status on mount
  useEffect(() => {
    fetchDepositStatus(row.depositId, client).then(setStatus);
  }, [row.depositId, client]);

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

  const handleCancel = useCallback(async () => {
    if (!client) return;
    setCancelling(true);
    setCancelErr(null);
    try {
      const hash = await writeContractAsync({
        address: BEAM_ESCROW_ADDRESS,
        abi: BEAM_ESCROW_ABI,
        functionName: 'cancel',
        args: [BigInt(row.depositId)],
      });
      await client.waitForTransactionReceipt({ hash });
      setStatus('cancelled');
      onCancelled(row.depositId);
    } catch (e) {
      setCancelErr(e instanceof Error ? e.message.slice(0, 80) : 'Cancel failed');
    } finally {
      setCancelling(false);
    }
  }, [client, writeContractAsync, row.depositId, onCancelled]);

  const formattedAmt = formatAmount(row.amount, row.tokenDecimals);

  // Status badge
  const badge = (() => {
    if (status === 'loading') return null;
    if (status === 'claimed') return <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/30 text-emerald-200">Claimed</span>;
    if (status === 'cancelled') return <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/15 text-white/50">Cancelled</span>;
    if (status === 'unclaimed') return <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/30 text-amber-200">Pending</span>;
    return null;
  })();

  return (
    <div className="flex flex-col gap-1.5 py-3 border-b border-white/8 last:border-0">
      <div className="flex items-center gap-3">
        {/* Amount + badge */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-sm font-semibold ${status === 'cancelled' ? 'text-white/35 line-through' : 'text-white'}`}>
              {formattedAmt} {row.tokenSymbol}
            </span>
            {row.usdAmount != null && status !== 'cancelled' && (
              <span className="text-xs text-white/45">${row.usdAmount}</span>
            )}
            {badge}
          </div>
          {row.createdAt != null && (
            <div className="flex items-center gap-1 mt-0.5">
              <Clock size={9} className="text-white/30 shrink-0" aria-hidden="true" />
              <span className="text-[11px] text-white/35">{timeAgo(row.createdAt)}</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Copy + open — only when unclaimed and link exists */}
          {row.beamLink && status === 'unclaimed' && (
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

          {/* Cancel — only when unclaimed */}
          {status === 'unclaimed' && (
            <button
              type="button"
              onClick={handleCancel}
              disabled={cancelling}
              className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg
                         bg-white/8 hover:bg-red-400/15 text-white/40 hover:text-red-300
                         transition-colors disabled:opacity-40"
              aria-label="Cancel and recover funds"
            >
              {cancelling
                ? <Loader2 size={10} className="animate-spin" />
                : <XCircle size={11} />}
              {cancelling ? 'Cancelling…' : 'Cancel'}
            </button>
          )}
        </div>
      </div>

      {/* Cancel error */}
      {cancelErr && (
        <p className="text-[11px] text-red-300 px-1">{cancelErr}</p>
      )}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────

export function SentBeams({ walletAddress }: SentBeamsProps) {
  const client = usePublicClient();

  const [rows, setRows] = useState<RowData[]>([]);
  // 'idle' = not started yet, 'loading' = onchain fetch in flight, 'done' = finished
  const [fetchState, setFetchState] = useState<'idle' | 'loading' | 'done'>('idle');

  const tokenMapRef = useRef<Map<string, { symbol: string; decimals: number }>>(new Map());

  // Load token map once
  useEffect(() => {
    fetchRobinhoodTokens().then((tokens) => {
      const map = new Map<string, { symbol: string; decimals: number }>();
      for (const t of tokens) map.set(t.address.toLowerCase(), { symbol: t.symbol, decimals: t.decimals });
      tokenMapRef.current = map;
    });
  }, []);

  // Seed rows immediately from localStorage so something shows before onchain fetch
  useEffect(() => {
    const local = loadBeamHistory(walletAddress);
    if (local.length > 0) {
      setRows(local.map((e) => ({
        depositId: e.depositId,
        tokenSymbol: e.tokenSymbol,
        tokenDecimals: 18,
        amount: 0n, // placeholder — overwritten by onchain fetch
        beamLink: e.beamLink,
        usdAmount: e.usdAmount,
        createdAt: e.createdAt,
        claimSigner: '',
      })));
    }
  }, [walletAddress]);

  const refresh = useCallback(async () => {
    // Don't fire until wagmi client is ready
    if (!client) return;

    setFetchState('loading');

    const [onchain, serverLinks, localEntries] = await Promise.all([
      fetchOnchainDeposits(walletAddress, client),
      fetchServerLinks(walletAddress),
      Promise.resolve(loadBeamHistory(walletAddress)),
    ]);

    const serverMap = new Map(serverLinks.map((e) => [e.depositId, e]));
    const localMap = new Map(localEntries.map((e) => [e.depositId, e]));

    // Back-fill localStorage from server
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

    const merged: RowData[] = onchain.map((dep) => {
      const stored = serverMap.get(dep.depositId) ?? localMap.get(dep.depositId);
      const isNative = dep.token.toLowerCase() === ZERO_ADDRESS;
      const tokenInfo = isNative
        ? { symbol: 'ETH', decimals: 18 }
        : (tokenMapRef.current.get(dep.token.toLowerCase()) ?? { symbol: dep.token.slice(0, 6), decimals: 18 });

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

    // Only update rows if we actually got onchain data; otherwise keep localStorage rows
    if (merged.length > 0) setRows(merged);
    setFetchState('done');
  }, [walletAddress, client]);

  // Fire refresh when client becomes available (handles wagmi async hydration)
  useEffect(() => {
    if (client) void refresh();
  }, [client, refresh]);

  const handleCancelled = useCallback((depositId: string) => {
    setRows((prev) => prev.map((r) =>
      r.depositId === depositId ? { ...r, amount: 0n } : r,
    ));
  }, []);

  // Never render anything if there's genuinely nothing to show
  if (rows.length === 0 && fetchState !== 'loading') return null;

  return (
    <div className="glass-sm rounded-2xl px-4 py-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[11px] font-medium text-white/40 uppercase tracking-wider">Your sent beams</p>
        <button
          type="button"
          onClick={refresh}
          className="flex items-center gap-1 text-[11px] text-white/30 hover:text-white/60 transition-colors"
        >
          {fetchState === 'loading' && <Loader2 size={10} className="animate-spin" />}
          {fetchState !== 'loading' && 'Refresh'}
        </button>
      </div>
      {rows.map((row) => (
        <BeamRow key={row.depositId} row={row} onCancelled={handleCancelled} />
      ))}
    </div>
  );
}
