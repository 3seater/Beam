'use client';

import { ChainBadge } from '@/components/ui/Badge';
import { truncateAddress, formatTokenAmount } from '@/lib/format';
import type { Deposit } from '@/lib/types';
import { User, Coins } from 'lucide-react';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
const DEFAULT_DECIMALS = 18;

interface DepositCardProps {
  deposit: Deposit;
  depositId: bigint;
  tokenSymbol?: string;
  tokenDecimals?: number;
}

export function DepositCard({ deposit, depositId, tokenSymbol, tokenDecimals }: DepositCardProps) {
  const isNativeEth = deposit.token.toLowerCase() === ZERO_ADDRESS;
  const symbol = isNativeEth ? 'ETH' : (tokenSymbol ?? 'TOKEN');
  const decimals = isNativeEth ? 18 : (tokenDecimals ?? DEFAULT_DECIMALS);
  const formattedAmount = formatTokenAmount(deposit.amount, decimals);

  return (
    <div
      className="glass flex flex-col gap-5 p-6 w-full max-w-sm mx-auto"
      role="region"
      aria-label="Deposit details"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-normal text-white/60 tracking-normal">
          Beam #{depositId.toString()}
        </h2>
        <ChainBadge />
      </div>

      <div className="h-px bg-white/12" aria-hidden="true" />

      {/* Amount hero */}
      <div className="flex flex-col items-center gap-1 py-2">
        <span
          className="text-5xl font-medium tracking-tight text-white"
          aria-label={`${formattedAmount} ${symbol}`}
        >
          {formattedAmount}
        </span>
        <span className="text-sm font-normal text-white/45 tracking-wider">
          {symbol}
        </span>
      </div>

      <div className="h-px bg-white/12" aria-hidden="true" />

      {/* Metadata rows */}
      <div className="flex flex-col gap-3 text-sm">
        <div className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-white/50">
            <User size={13} aria-hidden="true" />
            From
          </span>
          <span
            className="font-mono text-white/80 text-xs tracking-wide"
            title={deposit.sender}
            aria-label={`Sender: ${deposit.sender}`}
          >
            {truncateAddress(deposit.sender)}
          </span>
        </div>

        {!isNativeEth && (
          <div className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-white/50">
              <Coins size={13} aria-hidden="true" />
              Token
            </span>
            <span className="font-mono text-white/80 text-xs" title={deposit.token}>
              {tokenSymbol ?? truncateAddress(deposit.token as `0x${string}`)}
            </span>
          </div>
        )}

        <div className="flex items-center justify-between gap-4">
          <span className="text-white/50">Network</span>
          <span className="text-white/80">Robinhood Chain</span>
        </div>
      </div>
    </div>
  );
}
