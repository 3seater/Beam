'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, ExternalLink, Send, Key, Copy, Check, Loader2, ChevronRight } from 'lucide-react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { isAddress, parseUnits } from 'viem';

/* ── Confetti ────────────────────────────────────────────────────────────── */
interface Particle {
  x: number; y: number; vx: number; vy: number;
  angle: number; spin: number; color: string;
  w: number; h: number; life: number;
}
const COLORS = ['#ffffff', '#a8dff7', '#4eb4f0', '#34d399'];

function spawnParticles(n: number, ox: number, oy: number): Particle[] {
  return Array.from({ length: n }, () => {
    const a = Math.random() * Math.PI * 2;
    const s = 3 + Math.random() * 7;
    return {
      x: ox, y: oy, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 4,
      angle: Math.random() * 360, spin: (Math.random() - 0.5) * 9,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      w: 5 + Math.random() * 7, h: 2 + Math.random() * 4, life: 1,
    };
  });
}

function ConfettiCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    let particles = spawnParticles(120, canvas.width / 2, canvas.height * 0.35);
    let raf: number;
    function draw() {
      ctx!.clearRect(0, 0, canvas!.width, canvas!.height);
      particles = particles.filter((p) => p.life > 0);
      for (const p of particles) {
        p.vy += 0.18; p.x += p.vx; p.y += p.vy;
        p.angle += p.spin; p.life -= 0.013;
        ctx!.save();
        ctx!.globalAlpha = Math.max(0, p.life);
        ctx!.translate(p.x, p.y);
        ctx!.rotate((p.angle * Math.PI) / 180);
        ctx!.fillStyle = p.color;
        ctx!.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx!.restore();
      }
      if (particles.length > 0) raf = requestAnimationFrame(draw);
    }
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);
  return <canvas ref={ref} className="pointer-events-none fixed inset-0 z-50" aria-hidden="true" />;
}

/* ── Types ───────────────────────────────────────────────────────────────── */
interface ClaimSuccessProps {
  amount: string;
  symbol: string;
  decimals?: number;
  recipientAddress: `0x${string}`;
  tokenAddress?: `0x${string}` | null; // null = native ETH
  txHash?: `0x${string}` | null;
}

const EXPLORER_BASE = 'https://robinhoodchain.blockscout.com';

/* ── Send panel ──────────────────────────────────────────────────────────── */
function SendPanel({
  tokenAddress,
  rawAmount,
}: {
  tokenAddress: `0x${string}` | null;
  decimals: number;
  rawAmount: bigint;
}) {
  const { wallets } = useWallets();
  const embeddedWallet = wallets.find((w) => w.walletClientType === 'privy');

  const [dest, setDest] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const isValidDest = isAddress(dest.trim());

  const handleSend = useCallback(async () => {
    if (!embeddedWallet || !isValidDest) return;
    setSending(true);
    setErr(null);

    try {
      const provider = await embeddedWallet.getEthereumProvider();

      let txHash: string;

      if (!tokenAddress) {
        // Native ETH transfer
        txHash = await provider.request({
          method: 'eth_sendTransaction',
          params: [{
            from: embeddedWallet.address,
            to: dest.trim(),
            value: '0x' + rawAmount.toString(16),
          }],
        }) as string;
      } else {
        // ERC-20 transfer(address,uint256)
        const data = '0xa9059cbb'
          + dest.trim().slice(2).toLowerCase().padStart(64, '0')
          + rawAmount.toString(16).padStart(64, '0');
        txHash = await provider.request({
          method: 'eth_sendTransaction',
          params: [{
            from: embeddedWallet.address,
            to: tokenAddress,
            data,
          }],
        }) as string;
      }

      setSent(txHash);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Transaction failed');
    } finally {
      setSending(false);
    }
  }, [embeddedWallet, isValidDest, dest, tokenAddress, rawAmount]);

  if (sent) {
    return (
      <div className="flex flex-col gap-2 text-center">
        <span className="text-sm font-medium text-emerald-300">Sent</span>
        <a
          href={`${EXPLORER_BASE}/tx/${sent}`}
          target="_blank" rel="noopener noreferrer"
          className="text-xs text-white/50 hover:text-white transition-colors flex items-center justify-center gap-1"
        >
          View on Blockscout <ExternalLink size={11} />
        </a>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <input
        type="text"
        value={dest}
        onChange={(e) => setDest(e.target.value)}
        placeholder="Paste wallet or exchange address (0x...)"
        className="input-glass !text-sm !py-2.5 w-full"
        aria-label="Destination address"
      />
      {err && <p className="text-xs text-red-300">{err}</p>}
      <button
        type="button"
        onClick={handleSend}
        disabled={!isValidDest || sending}
        className="btn-glass-primary !py-2.5 !text-sm w-full !justify-center flex items-center gap-2
                   disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {sending
          ? <><Loader2 size={14} className="animate-spin" /> Sending…</>
          : <><Send size={14} /> Send now</>
        }
      </button>
      <p className="text-[11px] text-white/35 text-center">
        Works with any EVM-compatible address.
      </p>
    </div>
  );
}

/* ── Main success component ──────────────────────────────────────────────── */
export function ClaimSuccess({ amount, symbol, decimals = 18, recipientAddress, tokenAddress = null, txHash }: ClaimSuccessProps) {
  const { exportWallet } = usePrivy();

  const [activePanel, setActivePanel] = useState<'send' | 'export' | null>(null);
  const [copiedAddr, setCopiedAddr] = useState(false);

  // Reconstruct raw bigint amount from formatted string for sending
  const rawAmount = (() => {
    try { return parseUnits(amount, decimals); } catch { return 0n; }
  })();

  const copyAddress = useCallback(async () => {
    await navigator.clipboard.writeText(recipientAddress);
    setCopiedAddr(true);
    setTimeout(() => setCopiedAddr(false), 2000);
  }, [recipientAddress]);

  return (
    <>
      <ConfettiCanvas />

      <motion.div
        className="glass-strong flex flex-col gap-5 p-6 w-full max-w-sm mx-auto"
        initial={{ opacity: 0, scale: 0.92, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 340, damping: 28 }}
        role="status"
        aria-live="polite"
      >
        {/* Header */}
        <div className="flex flex-col items-center gap-3 text-center">
          <motion.div
            className="w-14 h-14 rounded-full glass flex items-center justify-center"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.15, type: 'spring', stiffness: 400, damping: 20 }}
          >
            <CheckCircle2 size={28} className="text-emerald-300" aria-hidden="true" />
          </motion.div>
          <div>
            <h2 className="text-lg font-medium text-white">You received a Beam</h2>
            <p className="text-sm text-white/50 mt-0.5">
              <span className="text-white font-medium">{amount} {symbol}</span> is now in your wallet
            </p>
          </div>
        </div>

        <div className="h-px bg-white/12" />

        {/* Wallet address */}
        <div className="flex flex-col gap-1.5">
          <p className="text-[11px] text-white/40 tracking-wider">Your wallet</p>
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm text-white/80 flex-1 truncate">{recipientAddress}</span>
            <button
              type="button"
              onClick={copyAddress}
              className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center bg-white/10 hover:bg-white/20 transition-colors"
              aria-label="Copy address"
            >
              {copiedAddr ? <Check size={12} className="text-emerald-300" /> : <Copy size={12} className="text-white/60" />}
            </button>
            <a
              href={`${EXPLORER_BASE}/address/${recipientAddress}`}
              target="_blank" rel="noopener noreferrer"
              className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center bg-white/10 hover:bg-white/20 transition-colors"
              aria-label="View on Blockscout"
            >
              <ExternalLink size={12} className="text-white/60" />
            </a>
          </div>
          {txHash && (
            <a
              href={`${EXPLORER_BASE}/tx/${txHash}`}
              target="_blank" rel="noopener noreferrer"
              className="text-[11px] text-white/35 hover:text-white/60 transition-colors flex items-center gap-1 mt-0.5"
            >
              View claim transaction <ExternalLink size={10} />
            </a>
          )}
        </div>

        <div className="h-px bg-white/12" />

        {/* Next steps */}
        <div className="flex flex-col gap-2">

          {/* Option 1: Send to another wallet */}
          <button
            type="button"
            onClick={() => setActivePanel(activePanel === 'send' ? null : 'send')}
            className="glass-sm flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/12 transition-colors text-left w-full"
          >
            <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
              <Send size={14} className="text-white/70" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-white">Send to a wallet</p>
              <p className="text-[11px] text-white/45">Coinbase, MetaMask, any address</p>
            </div>
            <ChevronRight size={14} className={`text-white/30 transition-transform ${activePanel === 'send' ? 'rotate-90' : ''}`} />
          </button>

          <AnimatePresence>
            {activePanel === 'send' && (
              <motion.div
                key="send-panel"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden px-1"
              >
                <div className="pt-1 pb-2">
                  <SendPanel tokenAddress={tokenAddress} decimals={decimals} rawAmount={rawAmount} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Option 2: Export to MetaMask */}
          <button
            type="button"
            onClick={() => setActivePanel(activePanel === 'export' ? null : 'export')}
            className="glass-sm flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/12 transition-colors text-left w-full"
          >
            <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
              <Key size={14} className="text-white/70" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-white">Use in another wallet</p>
              <p className="text-[11px] text-white/45">Export private key to MetaMask or any wallet</p>
            </div>
            <ChevronRight size={14} className={`text-white/30 transition-transform ${activePanel === 'export' ? 'rotate-90' : ''}`} />
          </button>

          <AnimatePresence>
            {activePanel === 'export' && (
              <motion.div
                key="export-panel"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="px-4 py-3 flex flex-col gap-3">
                  <ol className="flex flex-col gap-2 text-xs text-white/60">
                    <li className="flex gap-2"><span className="text-white/30 shrink-0">1.</span> Click the button below to reveal your private key</li>
                    <li className="flex gap-2"><span className="text-white/30 shrink-0">2.</span> Open MetaMask → click your account icon → Import account</li>
                    <li className="flex gap-2"><span className="text-white/30 shrink-0">3.</span> Paste your private key → your wallet is now in MetaMask</li>
                    <li className="flex gap-2"><span className="text-white/30 shrink-0">4.</span> Add Robinhood Chain (ID 4663, RPC: rpc.mainnet.chain.robinhood.com)</li>
                  </ol>
                  <button
                    type="button"
                    onClick={() => exportWallet()}
                    className="btn-glass-primary !py-2.5 !text-sm w-full !justify-center flex items-center gap-2"
                  >
                    <Key size={14} />
                    Show private key
                  </button>
                  <p className="text-[13px] text-amber-200/70 text-center">
                    Never share your private key with anyone.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </motion.div>
    </>
  );
}
