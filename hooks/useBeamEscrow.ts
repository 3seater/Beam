import {
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from 'wagmi';
import { BEAM_ESCROW_ABI } from '@/lib/escrow-abi';
import { BEAM_ESCROW_ADDRESS } from '@/lib/constants';

export function useGetDeposit(depositId: bigint | undefined) {
  return useReadContract({
    address: BEAM_ESCROW_ADDRESS,
    abi: BEAM_ESCROW_ABI,
    functionName: 'getDeposit',
    args: depositId !== undefined ? [depositId] : undefined,
    query: { enabled: depositId !== undefined },
  });
}

export function useDepositNative() {
  const { writeContractAsync, data: hash } = useWriteContract();
  const receipt = useWaitForTransactionReceipt({ hash });

  const deposit = (claimSignerAddress: `0x${string}`, value: bigint) =>
    writeContractAsync({
      address: BEAM_ESCROW_ADDRESS,
      abi: BEAM_ESCROW_ABI,
      functionName: 'depositNative',
      args: [claimSignerAddress],
      value,
    });

  return { deposit, hash, receipt };
}

export function useDepositToken() {
  const { writeContractAsync, data: hash } = useWriteContract();
  const receipt = useWaitForTransactionReceipt({ hash });

  const deposit = (
    tokenAddress: `0x${string}`,
    amount: bigint,
    claimSignerAddress: `0x${string}`,
  ) =>
    writeContractAsync({
      address: BEAM_ESCROW_ADDRESS,
      abi: BEAM_ESCROW_ABI,
      functionName: 'depositToken',
      args: [tokenAddress, amount, claimSignerAddress],
    });

  return { deposit, hash, receipt };
}
