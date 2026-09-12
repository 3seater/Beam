'use client';

import { truncateAddress, formatTokenAmount, formatUsd } from '@/lib/format';
import { useTokenPrice } from '@/hooks/useTokenPrice';
import type { Deposit } from '@/lib/types';
import Image from 'next/image';
import { useState } from 'react';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
const DEFAULT_DECIMALS = 18;

interface DepositCardProps {
  deposit: Deposit;
  depositId: bigint;
  tokenSymbol?: string;
  tokenDecimals?: number;
  tokenLogoUrl?: string;
}

export function DepositCard({ deposit, tokenSymbol, tokenDecimals, tokenLogoUrl }: DepositCardProps) {
  const isNativeEth = deposit.token.toLowerCase() === ZERO_ADDRESS;
  const symbol = isNativeEth ? 'ETH' : (tokenSymbol ?? 'TOKEN');
  const decimals = isNativeEth ? 18 : (tokenDecimals ?? DEFAULT_DECIMALS);
  const formattedAmount = formatTokenAmount(deposit.amount, decimals);
  const logoUrl = isNativeEth
    ? 'https://coin-images.coingecko.com/coins/images/279/small/ethereum.png?1696501628'
    : tokenLogoUrl;

  const [imgErr, setImgErr] = useState(false);

  const tokenAddress = isNativeEth ? undefined : deposit.token;
  const price = useTokenPrice(symbol, tokenAddress);
  const usdValue = price !== null
    ? formatUsd(Number(deposit.amount) / 10 ** decimals * price)
    : null;

  return (
    <div
      className="glass flex flex-col items-center justify-center gap-5 px-6 py-10 w-full mx-auto min-h-[260px]"
      role="region"
      aria-label="Deposit details"
    >
      {/* Token logo + amount — centered in the upper half */}
      <div className="flex flex-col items-center gap-3 py-4">
        {logoUrl && !imgErr ? (
          <Image
            src={logoUrl}
            alt={symbol}
            width={72}
            height={72}
            className="rounded-2xl object-contain bg-white/10"
            style={{ width: 72, height: 72 }}
            onError={() => setImgErr(true)}
            unoptimized
          />
        ) : (
          <span className="w-[72px] h-[72px] rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center text-xl font-semibold text-white/80">
            {symbol.slice(0, 2).toUpperCase()}
          </span>
        )}

        {/* Amount hero */}
        <div className="flex flex-col items-center gap-0.5">
          <span
            className="text-5xl font-semibold tracking-tight text-white"
            aria-label={`${formattedAmount} ${symbol}`}
          >
            {formattedAmount}
          </span>
          <div className="flex items-center gap-1.5">
            <span className="text-base font-normal text-white/50">
              {symbol}
            </span>
            {usdValue && (
              <span className="text-sm font-normal text-white/35">
                ≈ {usdValue}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="h-px bg-white/12 w-full" aria-hidden="true" />

      {/* Metadata rows */}
      <div className="flex flex-col gap-2.5 text-sm w-full">
        <div className="flex items-center justify-between gap-4">
          <span className="text-white/45">From</span>
          <span
            className="text-white/75 text-sm"
            title={deposit.sender}
            aria-label={`Sender: ${deposit.sender}`}
          >
            {truncateAddress(deposit.sender)}
          </span>
        </div>

        {!isNativeEth && (
          <div className="flex items-center justify-between gap-4">
            <span className="text-white/45">Token</span>
            <span className="text-white/75 text-sm">
              {tokenSymbol ?? truncateAddress(deposit.token as `0x${string}`)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
