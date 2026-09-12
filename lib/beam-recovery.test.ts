import { expect, it } from 'vitest';
import { recoveryMessage, validRecoveryTime } from './beam-recovery';
it('binds a recovery signature to wallet, origin, chain and timestamp', () => {
  const message = recoveryMessage('0xABC', 'https://beam.example', 1000);
  expect(message).toContain('Wallet: 0xabc');
  expect(message).toContain('Origin: https://beam.example');
  expect(message).toContain('Chain: 4663');
  expect(message).not.toBe(recoveryMessage('0xDEF', 'https://beam.example', 1000));
});
it('rejects expired, far-future and invalid recovery requests', () => {
  expect(validRecoveryTime(1000000, 1000000)).toBe(true);
  expect(validRecoveryTime(699999, 1000000)).toBe(false);
  expect(validRecoveryTime(1030001, 1000000)).toBe(false);
  expect(validRecoveryTime(NaN)).toBe(false);
});
