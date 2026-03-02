'use client';

import { useState, useRef, useCallback, forwardRef } from 'react';

/* ══════════════════════════════════════════════════════
   TYPES
   ══════════════════════════════════════════════════════ */
interface AmountInputProps {
  value?:          number | null;
  onChange?:       (amount: number | null) => void;
  currency?:       string;
  locale?:         string;
  label?:          string;
  hint?:           string;
  error?:          string;
  min?:            number;
  max?:            number;
  disabled?:       boolean;
  required?:       boolean;
  placeholder?:    string;
  id?:             string;
  name?:           string;
  className?:      string;
  style?:          React.CSSProperties;
  /** Alignement du montant */
  align?:          'left' | 'right';
  /** Taille de la police (fullscreen POS vs formulaire standard) */
  size?:           'sm' | 'md' | 'lg' | 'xl';
  /** Mise en évidence sur focus (effet "POS") */
  highlight?:      boolean;
  autoFocus?:      boolean;
  onBlur?:         (e: React.FocusEvent<HTMLInputElement>) => void;
  onFocus?:        (e: React.FocusEvent<HTMLInputElement>) => void;
}

/* ══════════════════════════════════════════════════════
   HELPERS
   ══════════════════════════════════════════════════════ */
const FONT_SIZES: Record<NonNullable<AmountInputProps['size']>, string> = {
  sm: 'var(--bank-text-base)',
  md: 'var(--bank-text-lg)',
  lg: 'var(--bank-text-2xl)',
  xl: 'var(--bank-text-4xl)',
};

const INPUT_PADS: Record<NonNullable<AmountInputProps['size']>, string> = {
  sm: 'var(--bank-space-2) var(--bank-space-3)',
  md: 'var(--bank-space-3) var(--bank-space-4)',
  lg: 'var(--bank-space-4) var(--bank-space-5)',
  xl: 'var(--bank-space-5) var(--bank-space-6)',
};

function getCurrencySymbol(currency: string, locale: string): string {
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency })
      .formatToParts(0)
      .find(p => p.type === 'currency')?.value ?? currency;
  } catch {
    return currency;
  }
}

/** Nettoie une saisie brute → nombre (ou null si vide/invalide) */
function parseRaw(raw: string): number | null {
  const cleaned = raw.replace(/[^\d.,]/g, '').replace(',', '.');
  const parsed  = parseFloat(cleaned);
  return isNaN(parsed) ? null : Math.round(parsed * 100) / 100;
}

/** Formate un nombre pour l'affichage dans le champ (sans symbol) */
function formatDisplay(amount: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/* ══════════════════════════════════════════════════════
   COMPOSANT
   ══════════════════════════════════════════════════════ */
export const AmountInput = forwardRef<HTMLInputElement, AmountInputProps>(
function AmountInput(
  {
    value,
    onChange,
    currency    = 'EUR',
    locale      = 'fr-FR',
    label,
    hint,
    error,
    min,
    max,
    disabled    = false,
    required    = false,
    placeholder = '0,00',
    id,
    name,
    className   = '',
    style,
    align       = 'left',
    size        = 'md',
    highlight   = false,
    autoFocus   = false,
    onBlur,
    onFocus,
  },
  ref,
) {
  const inputId  = id ?? `amount-input-${Math.random().toString(36).slice(2, 8)}`;
  const hintId   = `${inputId}-hint`;
  const errorId  = `${inputId}-error`;

  /* État interne d'édition */
  const [rawValue,  setRawValue]  = useState(() =>
    value != null ? formatDisplay(value, locale) : '',
  );
  const [isFocused, setIsFocused] = useState(false);

  const symbol = getCurrencySymbol(currency, locale);

  /* ── Sync value externe → affichage ── */
  const prevValueRef = useRef(value);
  if (prevValueRef.current !== value && !isFocused) {
    prevValueRef.current = value;
    const next = value != null ? formatDisplay(value, locale) : '';
    if (next !== rawValue) setRawValue(next);
  }

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setRawValue(raw);
    const parsed = parseRaw(raw);
    onChange?.(parsed);
  }, [onChange]);

  const handleFocus = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);
    onFocus?.(e);
  }, [onFocus]);

  const handleBlur = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(false);
    const parsed = parseRaw(rawValue);
    if (parsed != null) {
      /* reformate à la perte du focus */
      setRawValue(formatDisplay(parsed, locale));
      onChange?.(parsed);
    } else if (rawValue.trim() === '') {
      onChange?.(null);
    }
    onBlur?.(e);
  }, [rawValue, locale, onChange, onBlur]);

  const hasError = Boolean(error);

  /* ── Rang de validation ── */
  let validationMsg = '';
  if (!hasError && value != null) {
    if (min !== undefined && value < min) validationMsg = `Minimum : ${formatDisplay(min, locale)} ${symbol}`;
    if (max !== undefined && value > max) validationMsg = `Maximum : ${formatDisplay(max, locale)} ${symbol}`;
  }

  return (
    <div className={className} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--bank-space-1)', ...style }}>
      {label && (
        <label
          htmlFor={inputId}
          style={{
            fontSize:   'var(--bank-text-sm)',
            fontWeight: 'var(--bank-font-medium)',
            color:      hasError ? 'var(--bank-danger)' : 'var(--bank-text-secondary)',
          }}
        >
          {label}
          {required && <span aria-hidden="true" style={{ color: 'var(--bank-danger)', marginLeft: 2 }}>*</span>}
        </label>
      )}

      {/* ── Input wrapper ── */}
      <div
        style={{
          position:     'relative',
          display:      'flex',
          alignItems:   'center',
          borderRadius: 'var(--bank-radius-md)',
          border:       `1px solid ${hasError ? 'var(--bank-danger)' : isFocused ? 'var(--bank-accent)' : 'var(--bank-border-default)'}`,
          background:   disabled ? 'var(--bank-bg-elevated)' : 'var(--bank-bg-surface)',
          boxShadow:    highlight && isFocused ? '0 0 0 3px rgba(var(--bank-accent-rgb, 129,140,248),0.18)' : undefined,
          transition:   'border-color var(--bank-t-fast), box-shadow var(--bank-t-fast)',
          opacity:      disabled ? 0.55 : 1,
        }}
      >
        {/* Symbole monétaire */}
        <span
          aria-hidden="true"
          style={{
            padding:    INPUT_PADS[size],
            paddingRight: 0,
            fontSize:   FONT_SIZES[size],
            fontWeight: 'var(--bank-font-medium)',
            color:      'var(--bank-text-tertiary)',
            userSelect: 'none',
            flexShrink: 0,
          }}
        >
          {symbol}
        </span>

        <input
          ref={ref}
          id={inputId}
          name={name}
          type="text"
          inputMode="decimal"
          value={rawValue}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          disabled={disabled}
          required={required}
          placeholder={placeholder}
          autoFocus={autoFocus}
          aria-invalid={hasError ? 'true' : undefined}
          aria-describedby={[hint && hintId, (hasError || validationMsg) && errorId].filter(Boolean).join(' ') || undefined}
          aria-label={label ? undefined : `Montant en ${currency}`}
          data-error={hasError || undefined}
          style={{
            flex:         1,
            border:       'none',
            outline:      'none',
            background:   'transparent',
            padding:      INPUT_PADS[size],
            fontSize:     FONT_SIZES[size],
            fontWeight:   'var(--bank-font-semibold)',
            color:        'var(--bank-text-primary)',
            textAlign:    align,
            fontVariantNumeric: 'tabular-nums',
            minWidth:     0,
          }}
        />
      </div>

      {hint && !hasError && (
        <span id={hintId} className="bk-caption" style={{ color: 'var(--bank-text-tertiary)' }}>
          {hint}
        </span>
      )}
      {(hasError || validationMsg) && (
        <span id={errorId} role="alert" style={{ fontSize: 'var(--bank-text-xs)', color: 'var(--bank-danger)' }}>
          {error ?? validationMsg}
        </span>
      )}
    </div>
  );
});
