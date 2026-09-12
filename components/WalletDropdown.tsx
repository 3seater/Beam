'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { usePublicClient, useDisconnect } from 'wagmi';
import { usePrivy } from '@privy-io/react-auth';
import { formatUnits } from 'viem';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { Copy, Check, LogOut, Clock, Loader2, ChevronRight } from 'lucide-react';
import { ICON_SIZE } from '@/lib/icons';
import { formatTokenValue } from '@/lib/format';
import { BEAM_ESCROW_ABI } from '@/lib/escrow-abi';
import { BEAM_ESCROW_ADDRESS } from '@/lib/constants';
import { loadBeamHistory } from '@/lib/beam-history';
import { fetchRobinhoodTokens } from '@/lib/robinhood-tokens';

const ETH_LOGO_URL = 'https://coin-images.coingecko.com/coins/images/279/small/ethereum.png?1696501628';

// ─── Types ────────────────────────────────────────────────────────────────

interface RowData {
  depositId: string;
  tokenSymbol: string;
  tokenDecimals: number;
  tokenLogoUrl: string | null;
  amount: bigint;
  usdAmount: number | null;
  createdAt: number | null;
  status: 'unclaimed' | 'claimed' | 'cancelled' | 'unknown' | 'loading';
}

const PREVIEW_COUNT = 3;

// ─── Helpers ─────────────────────────────────────────────────────────────

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

function formatAmt(amount: bigint, decimals: number): string {
  return formatTokenValue(Number(formatUnits(amount, decimals)));
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
    if (result.amount === 0n) return 'cancelled';
    return result.claimed ? 'claimed' : 'unclaimed';
  } catch {
    return 'unknown';
  }
}

// ─── Status badge ─────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: RowData['status'] }) {
  if (status === 'loading') return <Loader2 size={ICON_SIZE.xs} className="animate-spin text-white/40" />;
  if (status === 'claimed') return (
    <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-white/20 border border-white/30 text-white font-medium">
      <Check size={9} strokeWidth={2.5} />
      Claimed
    </span>
  );
  if (status === 'cancelled') return <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/10 border border-white/20 text-white/45">Cancelled</span>;
  if (status === 'unclaimed') return <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/10 border border-white/20 text-white/70">Pending</span>;
  return null;
}

// ─── Dropdown panel ───────────────────────────────────────────────────────

interface WalletDropdownProps {
  address: string;
  onClose: () => void;
  triggerRef?: React.RefObject<HTMLButtonElement>;
}

export function WalletDropdown({ address, onClose, triggerRef }: WalletDropdownProps) {
  const client = usePublicClient();
  const { logout } = usePrivy();
  const { disconnectAsync } = useDisconnect();


  const [copied, setCopied] = useState(false);
  const [rows, setRows] = useState<RowData[]>([]);
  const [loading, setLoading] = useState(true);
  const panelRef = useRef<HTMLDivElement>(null);
  const tokenMapRef = useRef<Map<string, { symbol: string; decimals: number; logoUrl: string }>>(new Map());

  const short = `${address.slice(0, 6)}…${address.slice(-4)}`;

  // Close on outside click — but ignore clicks on the trigger button (it handles its own toggle)
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (triggerRef?.current?.contains(e.target as Node)) return;
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose();
    }
    const t = setTimeout(() => document.addEventListener('mousedown', handleClick), 50);
    return () => { clearTimeout(t); document.removeEventListener('mousedown', handleClick); };
  }, [onClose, triggerRef]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);


  useEffect(() => {
    if (!client) return;
    setLoading(true);
    let cancelled = false;
    setRows([]);
    const local = loadBeamHistory(address);
    let preview = local.slice(0, PREVIEW_COUNT);

    // Resolve logos — token map may already be populated from the other effect,
    // or we fetch inline here if it isn't yet.
    const resolveLogo = (symbol: string, map: Map<string, { symbol: string; decimals: number; logoUrl: string }>): string | null => {
      if (symbol === 'ETH') return ETH_LOGO_URL;
      for (const v of map.values()) {
        if (v.symbol === symbol) return v.logoUrl;
      }
      return null;
    };

    const buildRows = (map: Map<string, { symbol: string; decimals: number; logoUrl: string }>): RowData[] =>
      preview.map((e) => ({
        depositId: e.depositId,
        tokenSymbol: e.tokenSymbol,
        tokenDecimals: 18,
        tokenLogoUrl: resolveLogo(e.tokenSymbol, map),
        amount: 0n,
        usdAmount: e.usdAmount,
        createdAt: e.createdAt,
        status: 'loading' as const,
      }));

    // If token map already has entries use it immediately, otherwise fetch first
    const seedRows = fetch('/api/beams?wallet=' + address).then(async response => {
      if (response.ok) {
        const data = await response.json();
        const merged = new Map(local.map(entry => [entry.depositId, entry]));
        for (const entry of data.entries ?? []) if (!merged.has(entry.depositId)) merged.set(entry.depositId, entry);
        preview = [...merged.values()].sort((a, b) => b.createdAt - a.createdAt).slice(0, PREVIEW_COUNT);
      }
    }).catch(() => {}).then(() => tokenMapRef.current.size > 0
      ? Promise.resolve(buildRows(tokenMapRef.current))
      : fetchRobinhoodTokens().then((tokens) => {
        const map = new Map<string, { symbol: string; decimals: number; logoUrl: string }>();
        for (const t of tokens) map.set(t.address.toLowerCase(), { symbol: t.symbol, decimals: t.decimals, logoUrl: t.logoUrl });
        tokenMapRef.current = map;
        return buildRows(map);
      }));

    seedRows.then((seeded) => {
      if (cancelled) return [];
      setRows(seeded);
      setLoading(false);
      return Promise.all(
        preview.map((e) =>
          fetchDepositStatus(e.depositId, client).then((status) => ({ depositId: e.depositId, status }))
        )
      );
    }).then((results) => {
      if (cancelled) return;
      setRows((prev) =>
        prev.map((r) => {
          const found = results.find((res) => res.depositId === r.depositId);
          return found ? { ...r, status: found.status } : r;
        })
      );
    });
    return () => { cancelled = true; };
  }, [address, client]);

  const copyAddress = useCallback(async () => {
    try { await navigator.clipboard.writeText(address); }
    catch {
      const el = Object.assign(document.createElement('textarea'), { value: address });
      Object.assign(el.style, { position: 'fixed', opacity: '0' });
      document.body.appendChild(el); el.select(); document.execCommand('copy'); document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [address]);

  const handleDisconnect = useCallback(async () => {
    await disconnectAsync();
    await logout();
    onClose();
  }, [disconnectAsync, logout, onClose]);

  return (
    <motion.div
      ref={panelRef}
      initial={{ opacity: 0, scale: 0.96, y: -6 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96, y: -6 }}
      transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
      className="fixed z-50 w-72"
      style={{
        top: '100px',
        right: '24px',
        background: 'rgba(36,70,104,0.94)',
        border: '1px solid rgba(255,255,255,0.28)',
        backdropFilter: 'blur(32px) saturate(1.8)',
        WebkitBackdropFilter: 'blur(32px) saturate(1.8)',
        boxShadow: '0 16px 48px rgba(10,74,110,0.30), inset 0 1px 0 rgba(255,255,255,0.40)',
        borderRadius: '20px',
        overflow: 'hidden',
      }}
      role="dialog"
      aria-label="Wallet menu"
    >
      {/* ── Address + disconnect ──────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 pt-4 pb-4">
        {/* Address with copy */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-white">{short}</span>
          <button
            type="button"
            onClick={copyAddress}
            className="w-6 h-6 rounded-lg flex items-center justify-center bg-white/10 hover:bg-white/20 transition-colors"
            aria-label="Copy address"
          >
            {copied
              ? <Check size={ICON_SIZE.xs} className="text-emerald-300" />
              : <Copy size={ICON_SIZE.xs} className="text-white/55" />}
          </button>
        </div>

        {/* Disconnect — icon only, clean */}
        <button
          type="button"
          onClick={handleDisconnect}
          className="w-7 h-7 rounded-lg flex items-center justify-center
                     bg-white/8 hover:bg-white/16 text-white/50 hover:text-white/80
                     transition-colors"
          aria-label="Disconnect wallet"
        >
          <LogOut size={ICON_SIZE.sm} />
        </button>
      </div>

      {/* ── Recent beams ─────────────────────────────────────────────── */}
      {(loading || rows.length > 0) && (
        <div className="px-4 pb-3">
          <p className="text-xs text-white/50 mb-2">Recent beams</p>

          {loading && (
            <div className="flex items-center gap-2 py-2 text-sm text-white/40">
              <Loader2 size={ICON_SIZE.sm} className="animate-spin" />
              Loading…
            </div>
          )}

          {!loading && rows.length > 0 && (
            <div className="flex flex-col gap-0.5">
              {rows.map((row) => (
                <div key={row.depositId} className="flex items-center justify-between gap-3 py-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {/* Token logo */}
                    {row.tokenLogoUrl ? (
                      <Image
                        src={row.tokenLogoUrl}
                        alt={row.tokenSymbol}
                        width={20}
                        height={20}
                        className="rounded-md object-contain bg-white/10 shrink-0"
                        style={{ width: 20, height: 20 }}
                        unoptimized
                      />
                    ) : (
                      <span className="w-5 h-5 rounded-md bg-white/15 flex items-center justify-center text-[8px] font-semibold text-white/70 shrink-0">
                        {row.tokenSymbol.slice(0, 2).toUpperCase()}
                      </span>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm ${row.status === 'cancelled' ? 'text-white/35 line-through' : 'text-white font-medium'}`}>
                          {row.usdAmount != null
                            ? `$${row.usdAmount} of ${row.tokenSymbol}`
                            : row.amount > 0n
                              ? `${formatAmt(row.amount, row.tokenDecimals)} ${row.tokenSymbol}`
                              : row.tokenSymbol}
                        </span>
                      </div>
                      {row.createdAt != null && (
                        <div className="flex items-center gap-1 mt-0.5">
                          <Clock size={ICON_SIZE.xs} className="text-white/35 shrink-0" />
                          <span className="text-xs text-white/35">{timeAgo(row.createdAt)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <StatusBadge status={row.status} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {!loading && rows.length === 0 && (
        <div className="px-4 pb-3">
          <p className="text-sm text-white/40">No beams sent yet.</p>
        </div>
      )}

      {/* ── View all ─────────────────────────────────────────────────── */}
      <div className="px-4 pb-1">
        <div className="h-px bg-white/10 rounded-full mb-1" aria-hidden="true" />
      </div>
      <a
        href="/history"
        onClick={onClose}
        className="flex items-center justify-between px-4 py-3 rounded-b-[20px]
                   text-white/65 hover:text-white hover:bg-white/12
                   transition-all duration-150 group"
      >
        <span className="text-sm font-medium">View all beams</span>
        <ChevronRight size={ICON_SIZE.sm} className="text-white/40 group-hover:text-white/70 group-hover:translate-x-0.5 transition-all duration-150" />
      </a>
    </motion.div>
  );
}
