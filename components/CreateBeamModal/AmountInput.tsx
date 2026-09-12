'use client';

import { useEffect, useId } from 'react';
import { AlertCircle } from 'lucide-react';
import { ICON_SIZE } from '@/lib/icons';

const MIN_AMOUNT = 1e-6;
const MAX_AMOUNT = 999_999_999;
const MAX_DECIMALS = 6;
const VALID_NUM_RE = /^\d*\.?\d{0,6}$/;

export interface SelectedTokenInfo {
  symbol: string;
  balance: string;
  balanceRaw: number | null;
}

export interface AmountInputProps {
  value: string;
  onChange: (v: string) => void;
  selectedToken: SelectedTokenInfo;
  onError: (err: string | null) => void;
  disabled?: boolean;
  className?: string;
}

type ValidationResult = { ok: true } | { ok: false; message: string };

function validate(raw: string, balanceRaw: number | null): ValidationResult {
  if (raw === '' || raw === '.') return { ok: false, message: 'Please enter an amount' };
  if (!VALID_NUM_RE.test(raw)) return { ok: false, message: 'Please enter a valid numeric amount' };
  const num = parseFloat(raw);
  if (isNaN(num) || num <= 0) return { ok: false, message: 'Amount must be greater than zero' };
  if (num < MIN_AMOUNT) return { ok: false, message: `Minimum is ${MIN_AMOUNT}` };
  if (num > MAX_AMOUNT) return { ok: false, message: `Maximum is ${MAX_AMOUNT.toLocaleString()}` };
  const dec = raw.split('.')[1];
  if (dec && dec.length > MAX_DECIMALS) return { ok: false, message: `Max ${MAX_DECIMALS} decimals` };
  if (balanceRaw !== null && num > balanceRaw) return { ok: false, message: 'Insufficient balance' };
  return { ok: true };
}

export function AmountInput({
  value,
  onChange,
  selectedToken,
  onError,
  disabled = false,
  className = '',
}: AmountInputProps) {
  const inputId = useId();
  const errorId = useId();

  const result = validate(value, selectedToken.balanceRaw);
  const hasError = !result.ok;
  const errorMsg = hasError ? result.message : null;

  useEffect(() => { onError(errorMsg); }, [errorMsg]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;
    if (raw === '' || VALID_NUM_RE.test(raw)) onChange(raw);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    const allow = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Tab', 'Home', 'End'];
    if (allow.includes(e.key) || e.ctrlKey || e.metaKey || /^\d$/.test(e.key)) return;
    if (e.key === '.' && !value.includes('.')) return;
    e.preventDefault();
  }

  const isInsufficient = errorMsg === 'Insufficient balance';

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <label htmlFor={inputId} className="text-xs font-normal text-white/50">
        Amount
      </label>

      <div className="relative flex items-center">
        <input
          id={inputId}
          type="text"
          inputMode="decimal"
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder="0.00"
          aria-describedby={hasError ? errorId : undefined}
          aria-invalid={hasError}
          className={[
            'input-glass !font-mono !text-2xl !font-normal !pr-20 !py-4',
            hasError ? 'error' : '',
          ].join(' ')}
        />
        <span
          className="pointer-events-none absolute right-3 glass-pill px-2.5 py-1
                     text-xs font-normal text-white/70"
          aria-hidden="true"
        >
          {selectedToken.symbol}
        </span>
      </div>

      <div className="flex items-center justify-between text-xs text-white/50">
        <span>
          Balance:{' '}
          <span className={isInsufficient ? 'text-red-300' : 'text-white/60'}>
            {selectedToken.balance}
          </span>{' '}
          {selectedToken.symbol}
        </span>

        {selectedToken.balanceRaw !== null && selectedToken.balanceRaw > 0 && (
          <button
            type="button"
            disabled={disabled}
            onClick={() => {
              const s = selectedToken.balanceRaw!.toFixed(MAX_DECIMALS).replace(/\.?0+$/, '');
              onChange(s);
            }}
            className="rounded-full px-2 py-0.5 bg-white/10 border border-white/20
                       text-white/60 font-normal hover:bg-white/20 hover:text-white
                       transition-colors focus-visible:outline-none disabled:opacity-40"
          >
            MAX
          </button>
        )}
      </div>

      {hasError && (
        <p id={errorId} role="alert" className="flex items-center gap-1.5 text-xs text-red-300">
          <AlertCircle size={ICON_SIZE.xs} aria-hidden="true" className="shrink-0" />
          {errorMsg}
        </p>
      )}
    </div>
  );
}
