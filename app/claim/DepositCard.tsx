'use client';

import { truncateAddress, formatTokenAmount, formatUsd } from '@/lib/format';
import { useTokenPrice } from '@/hooks/useTokenPrice';
import type { Deposit } from '@/lib/types';
import { BeamGiftCard } from '@/components/BeamGiftCard';

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
  const tokenAddress = isNativeEth ? undefined : deposit.token;
  const price = useTokenPrice(symbol, tokenAddress);
  const usdValue = price !== null
    ? formatUsd(Number(deposit.amount) / 10 ** decimals * price)
    : null;

  return <div role="region" aria-label="Deposit details" className="claim-deposit">
    <BeamGiftCard amount={usdValue ? `≈ ${usdValue}` : formattedAmount} symbol={symbol} logoUrl={tokenLogoUrl} label="A little something for you" status="Ready to claim" detail={usdValue ? `${formattedAmount} ${symbol}` : 'On Robinhood Chain'} />
    <div className="claim-sender"><span>From</span><span title={deposit.sender} aria-label={`Sender: ${deposit.sender}`}>{truncateAddress(deposit.sender)}</span></div>
  </div>;
}
