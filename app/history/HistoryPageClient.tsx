'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { usePrivy } from '@privy-io/react-auth';
import { motion } from 'framer-motion';
import { Wallet, Clock } from 'lucide-react';
import { ICON_SIZE } from '@/lib/icons';
import { SentBeams } from '@/components/SentBeams';
import { BeamsSkeleton } from '@/components/BeamsSkeleton';
import { SpectrumHistory } from '@/components/SpectrumHistory';

export function HistoryPageClient() {
  const { address: walletAddress, isConnected, status: accountStatus } = useAccount();
  const { ready, connectWallet } = usePrivy();

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  // `ready` = Privy has finished reading its session from storage.
  // Without it, the "not connected" UI can flash before Privy knows you're authenticated.
  const hydrated = mounted && ready && accountStatus !== 'connecting' && accountStatus !== 'reconnecting';

  return (
    <main className="app-page min-h-screen flex flex-col items-center px-4 py-28">
      <motion.div
        className="w-full max-w-xl"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Page header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-1">
            <Clock size={ICON_SIZE.lg} className="text-white/70" aria-hidden="true" />
            <h1 className="text-3xl font-medium text-white tracking-tight">Your Beams</h1>
          </div>
          <p className="text-white/50 text-sm pl-9">
            All beams you&apos;ve sent — copy links, track status, or cancel unclaimed ones.
          </p>
        </div>

        {/* Not connected state */}
        {hydrated && !isConnected && (
          <div className="glass rounded-[24px] flex flex-col items-center gap-5 px-8 py-12 text-center">
            <div className="w-14 h-14 rounded-full glass-sm flex items-center justify-center">
              <Wallet size={ICON_SIZE.xl} className="text-white/70" aria-hidden="true" />
            </div>
            <div>
              <p className="text-base font-medium text-white mb-1">Connect your wallet</p>
              <p className="text-sm text-white/50">
                Connect to see the beams you&apos;ve sent.
              </p>
            </div>
            <button
              type="button"
              onClick={() => connectWallet()}
              className="btn-glass-primary !px-8 !py-3"
            >
              Connect Wallet
            </button>
          </div>
        )}

        {/* Loading / hydrating */}
        {!hydrated && (
          <BeamsSkeleton />
        )}

        {/* Connected — show history */}
        {hydrated && isConnected && walletAddress && (
          <><SentBeams key={walletAddress} walletAddress={walletAddress} /><SpectrumHistory key={`spectrum:${walletAddress}`} walletAddress={walletAddress} /></>
        )}
      </motion.div>
    </main>
  );
}
