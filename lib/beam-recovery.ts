import { BEAM_ESCROW_ADDRESS } from './constants';
export function recoveryMessage(wallet: string, origin: string, timestamp: number): string {
  return ['Restore my private Beam links', 'This signature does not authorize a transaction.', 'Origin: ' + origin, 'Wallet: ' + wallet.toLowerCase(), 'Chain: 4663', 'Escrow: ' + BEAM_ESCROW_ADDRESS.toLowerCase(), 'Issued at: ' + timestamp].join('\n');
}
export function validRecoveryTime(timestamp: number, now = Date.now()): boolean {
  return Number.isSafeInteger(timestamp) && timestamp <= now + 30000 && timestamp >= now - 300000;
}
