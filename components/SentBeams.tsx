'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { usePublicClient, useWriteContract } from 'wagmi';
import { decodeEventLog, formatUnits } from 'viem';
import { formatTokenValue } from '@/lib/format';
import { Copy, Check, ExternalLink, Loader2, X, RefreshCw } from 'lucide-react';
import { ICON_SIZE } from '@/lib/icons';
import { BEAM_ESCROW_ABI } from '@/lib/escrow-abi';
import { BEAM_ESCROW_ADDRESS } from '@/lib/constants';
import { loadBeamHistory, saveBeamEntry } from '@/lib/beam-history';
import { fetchRobinhoodTokens, stockLogoUrl } from '@/lib/robinhood-tokens';
import type { StoredBeamLink } from '@/lib/beam-store';
import Image from 'next/image';

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
  return formatTokenValue(Number(formatUnits(amount, decimals)));
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
  logoUrl: string | null;
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

  const formattedAmt = row.amount > 0n ? formatAmount(row.amount, row.tokenDecimals) : null;

  // Status badge
  const badge = (() => {
    if (status === 'loading') return (
      <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-white/10 border border-white/15 text-white/40">
        <Loader2 size={9} className="animate-spin" />
        Loading
      </span>
    );
    if (status === 'claimed') return (
      <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-white/20 border border-white/30 text-white font-medium">
        <Check size={9} strokeWidth={2.5} />
        Claimed
      </span>
    );
    if (status === 'cancelled') return (
      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/8 border border-white/15 text-white/35">
        Cancelled
      </span>
    );
    if (status === 'unclaimed') return (
      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/10 border border-white/20 text-white/60">
        Pending
      </span>
    );
    return null;
  })();

  return (
    <div className="flex items-center gap-3 py-3.5 px-0">

      {/* LEFT: token logo + amount + USD value + copy/open actions */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {/* Token logo */}
        {row.logoUrl ? (
          <Image
            src={row.logoUrl}
            alt={row.tokenSymbol}
            width={24}
            height={24}
            className="rounded-lg object-contain bg-white/10 shrink-0"
            style={{ width: 24, height: 24 }}
            unoptimized
          />
        ) : (
          <span className="w-6 h-6 rounded-lg bg-white/15 flex items-center justify-center text-[9px] font-semibold text-white/70 shrink-0">
            {row.tokenSymbol.slice(0, 2).toUpperCase()}
          </span>
        )}

        {/* Amount */}
        <span className={`text-sm font-semibold leading-none shrink-0 ${status === 'cancelled' ? 'text-white/30 line-through' : 'text-white'}`}>
          {formattedAmt ? `${formattedAmt} ${row.tokenSymbol}` : row.tokenSymbol}
        </span>

        {/* USD — visually distinct: smaller, dimmer, slightly different weight */}
        {row.usdAmount != null && status !== 'cancelled' && (
          <span className="text-[11px] font-normal text-white/35 shrink-0 tabular-nums">${row.usdAmount}</span>
        )}

        {/* Copy + open — only when unclaimed and link exists */}
        {status === 'unclaimed' && row.beamLink && (
          <div className="flex items-center gap-1 ml-1">
            <button
              type="button"
              onClick={copy}
              className="w-6 h-6 rounded-md flex items-center justify-center bg-white/8 hover:bg-white/15 transition-colors"
              aria-label={copied ? 'Copied!' : 'Copy Beam link'}
            >
              {copied
                ? <Check size={10} className="text-emerald-300" />
                : <Copy size={10} className="text-white/50" />}
            </button>
            <a
              href={row.beamLink}
              target="_blank"
              rel="noopener noreferrer"
              className="w-6 h-6 rounded-md flex items-center justify-center bg-white/8 hover:bg-white/15 transition-colors"
              aria-label="Open claim page"
            >
              <ExternalLink size={10} className="text-white/50" />
            </a>
          </div>
        )}
      </div>

      {/* RIGHT: badge | cancel icon | timestamp — fixed column order */}
      <div className="flex items-center gap-2 shrink-0">

        {/* Status badge — always present (loading/claimed/cancelled/pending) */}
        {badge}

        {/* Cancel — icon only, unclaimed rows only, sits after badge */}
        {status === 'unclaimed' && (
          <button
            type="button"
            onClick={handleCancel}
            disabled={cancelling}
            className="w-5 h-5 rounded flex items-center justify-center
                       text-white/25 hover:text-red-300 hover:bg-red-500/15
                       transition-all disabled:opacity-40"
            aria-label="Cancel and recover funds"
          >
            {cancelling
              ? <Loader2 size={10} className="animate-spin" />
              : <X size={10} strokeWidth={2} />}
          </button>
        )}

        {/* Timestamp — fixed width so all rows align */}
        <span className="text-[11px] text-white/30 tabular-nums w-14 text-right">
          {row.createdAt != null ? timeAgo(row.createdAt) : ''}
        </span>
      </div>

      {cancelErr && (
        <p className="text-[11px] text-red-300 absolute">{cancelErr}</p>
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

  const tokenMapRef = useRef<Map<string, { symbol: string; decimals: number; logoUrl: string }>>(new Map());

  // Load token map once
  useEffect(() => {
    fetchRobinhoodTokens().then((tokens) => {
      const map = new Map<string, { symbol: string; decimals: number; logoUrl: string }>();
      for (const t of tokens) map.set(t.address.toLowerCase(), { symbol: t.symbol, decimals: t.decimals, logoUrl: t.logoUrl });
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
        amount: 0n,
        beamLink: e.beamLink,
        usdAmount: e.usdAmount,
        createdAt: e.createdAt,
        claimSigner: '',
        logoUrl: null,
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
        ? { symbol: 'ETH', decimals: 18, logoUrl: 'https://coin-images.coingecko.com/coins/images/279/small/ethereum.png?1696501628' }
        : (tokenMapRef.current.get(dep.token.toLowerCase()) ?? { symbol: dep.token.slice(0, 6), decimals: 18, logoUrl: stockLogoUrl(dep.token.slice(0, 6)) });

      return {
        depositId: dep.depositId,
        tokenSymbol: stored?.tokenSymbol ?? tokenInfo.symbol,
        tokenDecimals: tokenInfo.decimals,
        amount: dep.amount,
        beamLink: stored?.beamLink ?? null,
        usdAmount: stored?.usdAmount ?? null,
        createdAt: stored?.createdAt ?? null,
        claimSigner: dep.claimSigner,
        logoUrl: tokenInfo.logoUrl,
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
      <div className="flex items-center justify-end mb-1">
        <button
          type="button"
          onClick={refresh}
          className="w-7 h-7 rounded-lg flex items-center justify-center bg-white/8 hover:bg-white/16 transition-colors"
          aria-label="Refresh beams"
        >
          {fetchState === 'loading'
            ? <Loader2 size={ICON_SIZE.xs} className="animate-spin text-white/50" />
            : <RefreshCw size={ICON_SIZE.xs} className="text-white/50" />
          }
        </button>
      </div>
      <div className="flex flex-col divide-y divide-white/[0.06]">
        {rows.map((row) => (
          <BeamRow key={row.depositId} row={row} onCancelled={handleCancelled} />
        ))}
      </div>
    </div>
  );
}
