'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { parseUnits } from 'viem';
import { ArrowLeft, Zap, Wallet, LogOut } from 'lucide-react';

import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { GaslessBadge } from '@/components/ui/Badge';
import { TokenPicker, type SelectedAsset } from '@/components/CreateBeamModal/TokenPicker';
import { DollarAmountInput } from '@/components/CreateBeamModal/DollarAmountInput';
import { FeeEstimate } from '@/components/CreateBeamModal/FeeEstimate';
import { StepIndicator } from '@/components/CreateBeamModal/StepIndicator';
import { BeamLinkDisplay } from '@/components/CreateBeamModal/BeamLinkDisplay';
import { useDeposit } from '@/hooks/useDeposit';

const ESTIMATE_SIGNER: `0x${string}` = '0x1111111111111111111111111111111111111111';

export interface CreateBeamModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/* ── Connected wallet bar ────────────────────────────────────────────────── */
function ConnectedBar({ address, onDisconnect }: { address: string; onDisconnect: () => void }) {
  const short = `${address.slice(0, 6)}…${address.slice(-4)}`;
  return (
    <div className="flex items-center gap-2 glass-sm rounded-xl px-3 py-2">
      <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" aria-hidden="true" />
      <span className="text-xs text-white/70 flex-1 font-mono">{short}</span>
      <button
        type="button"
        onClick={onDisconnect}
        className="flex items-center gap-1 text-[11px] text-white/40 hover:text-white/70 transition-colors"
        aria-label="Disconnect wallet"
      >
        <LogOut size={11} />
        Disconnect
      </button>
    </div>
  );
}

/* ── Main modal ─────────────────────────────────────────────────────────── */
export function CreateBeamModal({ isOpen, onClose }: CreateBeamModalProps) {
  const { address: walletAddress, isConnected, status: accountStatus } = useAccount();
  const { connectWallet, ready } = usePrivy();
  const { wallets } = useWallets();

  // Same hydration guard as send/page.tsx — prevents the wallet bar from
  // flashing "Connect Wallet" on first render before wagmi rehydrates.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const hydrated = mounted && accountStatus !== 'connecting' && accountStatus !== 'reconnecting';

  const handleDisconnect = useCallback(async () => {
    const active = wallets[0];
    if (active) await active.disconnect();
  }, [wallets]);

  // When we open Privy's wallet picker we visually hide our modal so
  // there's no stacking-context conflict. It comes back once connected.
  const [reopenAfterConnect, setReopenAfterConnect] = useState(false);

  /* ── Form state ───────────────────────────────────────────────────────── */
  const [selectedAsset, setSelectedAsset] = useState<SelectedAsset>({ type: 'native', symbol: 'ETH' });
  const [dollarValue, setDollarValue] = useState('');
  const [tokenAmount, setTokenAmount] = useState<string | null>(null);
  const [amountError, setAmountError] = useState<string | null>('Please enter an amount');
  const [feeAvailable, setFeeAvailable] = useState(true);

  const { step, beamLink, error: depositError, startDeposit, reset } = useDeposit();

  /* ── Derived ──────────────────────────────────────────────────────────── */
  const isERC20 = selectedAsset.type === 'erc20';
  const isInProgress = ['approval-pending', 'approval-confirming', 'deposit-pending', 'deposit-confirming'].includes(step);
  const isLinkReady = step === 'link-generated';
  const tokenAddress = isERC20 ? (selectedAsset as { type: 'erc20'; address: `0x${string}` }).address : null;

  const amountWei: bigint | null = useMemo(() => {
    if (!tokenAmount || amountError !== null) return null;
    const decimals = selectedAsset.type === 'erc20' ? selectedAsset.decimals : 18;
    try { return parseUnits(tokenAmount, decimals); } catch { return null; }
  }, [tokenAmount, amountError, selectedAsset]);

  const canConfirm =
    amountError === null && feeAvailable && amountWei !== null &&
    hydrated && isConnected && walletAddress !== undefined && step === 'idle';

  // Reopen our modal once a wallet connects after we dismissed for Privy picker
  useEffect(() => {
    if (reopenAfterConnect && isConnected) {
      setReopenAfterConnect(false);
      onClose(); // ensure parent knows — then re-trigger open via the flag below
    }
  }, [isConnected, reopenAfterConnect, onClose]);
  useEffect(() => {
    if (isOpen && step === 'idle') {
      setSelectedAsset({ type: 'native', symbol: 'ETH' });
      setDollarValue('');
      setTokenAmount(null);
      setAmountError('Please enter an amount');
      setFeeAvailable(true);
    }
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleClose = useCallback(() => {
    if (isInProgress) return;
    reset();
    setSelectedAsset({ type: 'native', symbol: 'ETH' });
    setDollarValue('');
    setTokenAmount(null);
    setAmountError('Please enter an amount');
    setFeeAvailable(true);
    onClose();
  }, [isInProgress, reset, onClose]);

  const handleAssetChange = useCallback((asset: SelectedAsset) => {
    setSelectedAsset(asset);
    setDollarValue('');
    setTokenAmount(null);
    setAmountError('Please enter an amount');
  }, []);

  const handleConfirm = useCallback(async () => {
    if (!isConnected || !walletAddress) {
      // Open Privy's own wallet picker — correctly z-indexed, handles MetaMask/WC/etc.
      connectWallet();
      return;
    }
    if (!canConfirm) return;

    const tokenAddr = isERC20 ? tokenAddress : null;
    const tokenSymbol = isERC20
      ? (selectedAsset as { type: 'erc20'; symbol: string }).symbol
      : 'ETH';
    const usdAmount = parseFloat(dollarValue) || 0;

    await startDeposit(
      tokenAddr,
      usdAmount,
      tokenSymbol,
      walletAddress,
      typeof window !== 'undefined' ? window.location.origin : '',
    );
  }, [isConnected, walletAddress, canConfirm, connectWallet, isERC20, tokenAddress, selectedAsset, dollarValue, startDeposit]);

  const title = isLinkReady ? 'Your BeamLink is ready' : 'Send a Beam';

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={title} className="!max-w-lg">

      {/* ── In-progress ──────────────────────────────────────────────────── */}
      {isInProgress && (
        <div className="flex flex-col items-center gap-8 py-6">
          <div className="relative">
            <div className="w-16 h-16 rounded-full glass flex items-center justify-center animate-glow-pulse">
              <Zap size={28} className="text-white" />
            </div>
            <div className="absolute inset-0 rounded-full bg-white/10 blur-lg" aria-hidden="true" />
          </div>
          <StepIndicator step={step} isERC20={isERC20} />
          <p className="text-sm text-white/55 text-center">
            {step === 'approval-pending' && 'Waiting for approval…'}
            {step === 'approval-confirming' && 'Confirming approval…'}
            {step === 'deposit-pending' && 'Waiting for deposit…'}
            {step === 'deposit-confirming' && 'Confirming on-chain…'}
          </p>
        </div>
      )}

      {/* ── Link ready ───────────────────────────────────────────────────── */}
      {isLinkReady && beamLink && (
        <div className="flex flex-col gap-5">
          <div className="glass-sm flex items-center justify-center gap-2 py-3 px-4">
            <span className="w-5 h-5 rounded-full bg-emerald-400/30 flex items-center justify-center">
              <span className="w-2 h-2 rounded-full bg-emerald-300" aria-hidden="true" />
            </span>
            <span className="text-sm text-white/80">Beam sent successfully</span>
          </div>
          <p className="text-sm text-white/55">
            Share this link — the recipient claims gaslessly with just a social login.
          </p>
          <BeamLinkDisplay beamLink={beamLink} />
          <div className="pt-2"><StepIndicator step={step} isERC20={isERC20} /></div>
          <Button variant="ghost" size="sm" leftIcon={<ArrowLeft size={14} />} onClick={handleClose} className="self-start">
            Send another
          </Button>
        </div>
      )}

      {/* ── Idle: send form ──────────────────────────────────────────────── */}
      {step === 'idle' && (
        <div className="flex flex-col gap-5">

          {hydrated && isConnected && walletAddress && (
            <ConnectedBar address={walletAddress} onDisconnect={handleDisconnect} />
          )}

          <TokenPicker value={selectedAsset} onChange={handleAssetChange} />

          <div className="h-px bg-white/12" aria-hidden="true" />

          <DollarAmountInput
            dollarValue={dollarValue}
            onChange={setDollarValue}
            onTokenAmount={setTokenAmount}
            onError={setAmountError}
            selectedAsset={selectedAsset}
          />

          <FeeEstimate
            amountWei={amountWei}
            tokenAddress={tokenAddress}
            claimSignerAddress={ESTIMATE_SIGNER}
            onFeeAvailable={setFeeAvailable}
          />

          {depositError && (
            <p className="glass-sm px-3 py-2 text-sm text-red-300">{depositError}</p>
          )}

          <StepIndicator step={step} isERC20={isERC20} />

          <Button
            variant="primary"
            size="lg"
            disabled={hydrated && isConnected ? !canConfirm : !ready}
            onClick={handleConfirm}
            aria-label={!hydrated || !isConnected ? 'Connect wallet to send' : 'Confirm and generate BeamLink'}
            className="w-full !justify-center"
            leftIcon={!hydrated || !isConnected ? <Wallet size={16} /> : undefined}
          >
            {!hydrated || !isConnected ? 'Connect Wallet to Send' : 'Confirm & Send'}
          </Button>

          <div className="flex items-center justify-center gap-2 -mt-2">
            <GaslessBadge />
            <span className="text-xs text-white/40">Recipient pays zero gas</span>
          </div>
        </div>
      )}
    </Modal>
  );
}
