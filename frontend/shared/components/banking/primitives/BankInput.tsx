'use client';

import { forwardRef, isValidElement, useState } from 'react';
import { Eye, EyeOff, type LucideIcon } from 'lucide-react';

/* ══════════════════════════════════════════════════════
   TYPES
   ══════════════════════════════════════════════════════ */
export interface BankInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'prefix'> {
  label?: string;
  error?: string;
  hint?: string;
  prefix?: LucideIcon | React.ReactNode;   /* icône ou texte à gauche */
  suffix?: React.ReactNode;               /* icône ou texte à droite */
  required?: boolean;
}

function isLucideIcon(value: BankInputProps['prefix']): value is LucideIcon {
  if (!value || typeof value !== 'function') {
    return false;
  }

  return !isValidElement(value);
}

/* ══════════════════════════════════════════════════════
   COMPOSANT
   ══════════════════════════════════════════════════════ */
export const BankInput = forwardRef<HTMLInputElement, BankInputProps>(
  function BankInput(
    { label, error, hint, prefix: Prefix, suffix, required, type = 'text', id, className = '', ...rest },
    ref,
  ) {
    const [showPassword, setShowPassword] = useState(false);
    const inputId = id ?? `bank-input-${Math.random().toString(36).slice(2, 9)}`;

    const isPassword = type === 'password';
    const resolvedType = isPassword ? (showPassword ? 'text' : 'password') : type;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--bank-space-2)' }}>
        {/* Label */}
        {label && (
          <label htmlFor={inputId} className={`bk-label${required ? ' bk-label--required' : ''}`}>
            {label}
          </label>
        )}

        {/* Input wrapper */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          {/* Prefix */}
          {Prefix !== undefined && (
            <span
              aria-hidden="true"
              style={{
                position: 'absolute',
                left: 'var(--bank-space-4)',
                color: 'var(--bank-text-tertiary)',
                pointerEvents: 'none',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              {isLucideIcon(Prefix)
                ? <Prefix size={16} strokeWidth={1.8} />
                : Prefix}
            </span>
          )}

          <input
            ref={ref}
            id={inputId}
            type={resolvedType}
            aria-invalid={error ? 'true' : undefined}
            aria-describedby={
              [error ? `${inputId}-error` : '', hint ? `${inputId}-hint` : '']
                .filter(Boolean)
                .join(' ') || undefined
            }
            data-error={error ? 'true' : undefined}
            className={`bk-input ${className}`}
            style={{
              paddingLeft: Prefix !== undefined ? 'var(--bank-space-10)' : undefined,
              paddingRight: (isPassword || suffix !== undefined) ? 'var(--bank-space-10)' : undefined,
            }}
            required={required}
            {...rest}
          />

          {/* Suffix ou toggle password */}
          {(suffix !== undefined || isPassword) && (
            <span
              style={{
                position: 'absolute',
                right: 'var(--bank-space-3)',
                display: 'flex',
                alignItems: 'center',
                color: 'var(--bank-text-tertiary)',
              }}
            >
              {isPassword ? (
                <button
                  type="button"
                  onClick={() => setShowPassword(p => !p)}
                  aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 'var(--bank-space-1)',
                    color: 'var(--bank-text-tertiary)',
                    display: 'flex',
                    alignItems: 'center',
                    borderRadius: 'var(--bank-radius-sm)',
                  }}
                >
                  {showPassword
                    ? <EyeOff size={16} strokeWidth={1.8} aria-hidden="true" />
                    : <Eye size={16} strokeWidth={1.8} aria-hidden="true" />
                  }
                </button>
              ) : suffix}
            </span>
          )}
        </div>

        {/* Error */}
        {error && (
          <p id={`${inputId}-error`} className="bk-field-error" role="alert" aria-live="polite">
            {error}
          </p>
        )}

        {/* Hint */}
        {!error && hint && (
          <p id={`${inputId}-hint`} className="bk-field-hint">
            {hint}
          </p>
        )}
      </div>
    );
  },
);
