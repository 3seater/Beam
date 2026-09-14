'use client';

import { useEffect, useId } from 'react';
import { useEstimateGas, useAccount } from 'wagmi';
import { formatEther, encodeFunctionData } from 'viem';
import { Fuel, AlertTriangle } from 'lucide-react';
import { ICON_SIZE } from '@/lib/icons';
import { BEAM_ESCROW_ABI } from '@/lib/escrow-abi';
import { BEAM_ESCROW_ADDRESS } from '@/lib/constants';
import { Skeleton } from '../ui/Skeleton';

export interface FeeEstimateProps {
  amountWei: bigint | null;
  tokenAddress: `0x${string}` | null;
  claimSignerAddress: `0x${string}`;
  onFeeAvailable: (available: boolean) => void;
  className?: string;
}

const PLACEHOLDER_SIGNER: `0x${string}` = '0x1111111111111111111111111111111111111111';

export function FeeEstimate({
  amountWei,
  tokenAddress,
  claimSignerAddress,
  onFeeAvailable,
  className = '',
}: FeeEstimateProps) {
  const descriptionId = useId();
  const { address: senderAddress } = useAccount();

  const effectiveSigner: `0x${string}` =
    claimSignerAddress !== '0x0000000000000000000000000000000000000000'
      ? claimSignerAddress
      : PLACEHOLDER_SIGNER;

  const estimateRequest = (() => {
    if (amountWei === null || amountWei === 0n || !senderAddress) return undefined;
    if (tokenAddress === null) {
      return {
        account: senderAddress,
        to: BEAM_ESCROW_ADDRESS,
        data: encodeFunctionData({ abi: BEAM_ESCROW_ABI, functionName: 'depositNative', args: [effectiveSigner] }),
        value: amountWei,
      };
    }
    return {
      account: senderAddress,
      to: BEAM_ESCROW_ADDRESS,
      data: encodeFunctionData({ abi: BEAM_ESCROW_ABI, functionName: 'depositToken', args: [tokenAddress, amountWei, effectiveSigner] }),
      value: 0n,
    };
  })();

  const { data: gasEstimate, isLoading, isError } = useEstimateGas({
    ...(estimateRequest ?? {}),
    query: { enabled: estimateRequest !== undefined, staleTime: 3_000, retry: 1 },
  });

  const GAS_PRICE_WEI = BigInt(1e9);
  const feeWei = gasEstimate !== undefined ? gasEstimate * GAS_PRICE_WEI : null;
  const feeEth = feeWei !== null ? formatEther(feeWei) : null;
  const feeDisplay = feeEth !== null
    ? Number(feeEth).toFixed(6).replace(/\.?0+$/, '') || '< 0.000001'
    : null;
  const available = !isLoading && !isError && feeDisplay !== null;

  useEffect(() => {
    if (amountWei === null || amountWei === 0n) { onFeeAvailable(true); return; }
    onFeeAvailable(available);
  }, [available, amountWei]); // eslint-disable-line react-hooks/exhaustive-deps

  if (amountWei === null || amountWei === 0n || !senderAddress) return null;

  if (isLoading) return (
    <div className={`flex items-center justify-between text-sm min-h-5 ${className}`} aria-live="polite" aria-busy="true" aria-label="Estimating fee">
      <span className="flex items-center gap-1.5 text-white/50"><Fuel size={ICON_SIZE.sm} aria-hidden="true" className="shrink-0" />Estimated fee</span>
      <Skeleton className="w-28 h-4" />
    </div>
  );

  if (isError || feeDisplay === null) return (
    <div className={`flex items-center gap-2 text-sm text-amber-300 ${className}`} role="alert" aria-describedby={descriptionId}>
      <AlertTriangle size={ICON_SIZE.sm} className="shrink-0" aria-hidden="true" />
      <span id={descriptionId}>Fee estimation unavailable</span>
    </div>
  );

  return (
    <div className={`flex items-center justify-between text-sm ${className}`} aria-live="polite">
      <span className="flex items-center gap-1.5 text-white/50">
        <Fuel size={ICON_SIZE.sm} aria-hidden="true" className="shrink-0" />
        Estimated fee
      </span>
      <span className="font-mono text-white/80">{feeDisplay} ETH</span>
    </div>
  );
}
