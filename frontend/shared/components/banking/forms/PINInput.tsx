'use client';

import {
  useState,
  useRef,
  useCallback,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from 'react';

/* ══════════════════════════════════════════════════════
   TYPES
   ══════════════════════════════════════════════════════ */
export interface PINInputRef {
  /** Vider les champs */
  clear: () => void;
  /** Focus sur le premier champ vide */
  focus: () => void;
}

interface PINInputProps {
  length?:        number;   /* défaut 4 */
  onComplete?:    (pin: string) => void;
  onChange?:      (partial: string) => void;
  /** Masquer les chiffres (••) */
  secret?:        boolean;
  disabled?:      boolean;
  error?:         string;
  label?:         string;
  /** Affichage "gros boutons" mode TPE */
  size?:          'sm' | 'md' | 'lg';
  /** Tremblement sur erreur */
  shake?:         boolean;
  autoFocus?:     boolean;
  className?:     string;
  style?:         React.CSSProperties;
}

/* ══════════════════════════════════════════════════════
   DIMENSIONS
   ══════════════════════════════════════════════════════ */
const CELL_SIZES = {
  sm: { width: 40,  height: 48,  fontSize: 'var(--bank-text-lg)' },
  md: { width: 52,  height: 60,  fontSize: 'var(--bank-text-2xl)' },
  lg: { width: 64,  height: 72,  fontSize: 'var(--bank-text-3xl)' },
} as const;

/* ══════════════════════════════════════════════════════
   COMPOSANT
   ══════════════════════════════════════════════════════ */
export const PINInput = forwardRef<PINInputRef, PINInputProps>(
function PINInput(
  {
    length     = 4,
    onComplete,
    onChange,
    secret     = true,
    disabled   = false,
    error,
    label,
    size       = 'md',
    shake      = false,
    autoFocus  = false,
    className  = '',
    style,
  },
  ref,
) {
  const [digits, setDigits]   = useState<string[]>(Array(length).fill(''));
  const [shaking, setShaking] = useState(false);
  const inputRefs             = useRef<Array<HTMLInputElement | null>>(Array(length).fill(null));
  const { width, height, fontSize } = CELL_SIZES[size];

  useImperativeHandle(ref, () => ({
    clear: () => {
      setDigits(Array(length).fill(''));
      inputRefs.current[0]?.focus();
    },
    focus: () => {
      const idx = digits.findIndex(d => d === '');
      inputRefs.current[Math.max(0, idx)]?.focus();
    },
  }), [length, digits]);

  /* ── Déclenche le shake quand error ou shake change ── */
  useEffect(() => {
    if (shake || error) {
      setShaking(true);
      const t = setTimeout(() => setShaking(false), 500);
      return () => clearTimeout(t);
    }
  }, [shake, error]);

  /* ── Notification onChange ── */
  useEffect(() => {
    const partial = digits.join('');
    onChange?.(partial);
    if (partial.length === length && !digits.includes('')) {
      onComplete?.(partial);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [digits]);

  const handleChange = useCallback((index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '');
    if (!val) return;
    const char = val[val.length - 1]; /* dernier digit collé */
    const next = [...digits];
    next[index] = char;
    setDigits(next);
    if (index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  }, [digits, length]);

  const handleKeyDown = useCallback((index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      const next = [...digits];
      if (next[index]) {
        next[index] = '';
        setDigits(next);
      } else if (index > 0) {
        next[index - 1] = '';
        setDigits(next);
        inputRefs.current[index - 1]?.focus();
      }
    }
    if (e.key === 'ArrowLeft' && index > 0)         inputRefs.current[index - 1]?.focus();
    if (e.key === 'ArrowRight' && index < length - 1) inputRefs.current[index + 1]?.focus();
  }, [digits, length]);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    if (!pasted) return;
    const next = Array(length).fill('');
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i];
    setDigits(next);
    const focusIdx = Math.min(pasted.length, length - 1);
    inputRefs.current[focusIdx]?.focus();
  }, [length]);

  const hasError = Boolean(error);

  return (
    <div
      className={className}
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--bank-space-3)', ...style }}
      aria-label={label ?? `Saisie du code PIN à ${length} chiffres`}
    >
      {label && (
        <span style={{
          fontSize:   'var(--bank-text-sm)',
          fontWeight: 'var(--bank-font-medium)',
          color:      hasError ? 'var(--bank-danger)' : 'var(--bank-text-secondary)',
          textAlign:  'center',
        }}>
          {label}
        </span>
      )}

      {/* ── Cellules ── */}
      <div
        role="group"
        aria-label={label ?? 'Code PIN'}
        style={{
          display: 'flex',
          gap:     'var(--bank-space-2)',
          animation: shaking ? 'bk-shake 0.4s ease' : undefined,
        }}
      >
        {digits.map((digit, i) => {
          const isFilled = digit !== '';
          return (
            <input
              key={i}
              ref={el => { inputRefs.current[i] = el; }}
              type={secret ? 'password' : 'text'}
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={1}
              value={digit}
              disabled={disabled}
              autoFocus={autoFocus && i === 0}
              aria-label={`Chiffre ${i + 1} sur ${length}`}
              aria-invalid={hasError ? 'true' : undefined}
              onChange={e => handleChange(i, e)}
              onKeyDown={e => handleKeyDown(i, e)}
              onPaste={handlePaste}
              onFocus={e => e.target.select()}
              style={{
                width,
                height,
                textAlign:     'center',
                fontSize,
                fontWeight:    'var(--bank-font-bold)',
                fontVariantNumeric: 'tabular-nums',
                border:        `2px solid ${hasError ? 'var(--bank-danger)' : isFilled ? 'var(--bank-accent)' : 'var(--bank-border-default)'}`,
                borderRadius:  'var(--bank-radius-md)',
                background:    isFilled ? 'var(--bank-bg-elevated)' : 'var(--bank-bg-surface)',
                color:         'var(--bank-text-primary)',
                outline:       'none',
                caretColor:    'var(--bank-accent)',
                cursor:        disabled ? 'not-allowed' : 'text',
                opacity:       disabled ? 0.5 : 1,
                transition:    'border-color var(--bank-t-fast), background var(--bank-t-fast)',
              }}
            />
          );
        })}
      </div>

      {hasError && (
        <span role="alert" style={{ fontSize: 'var(--bank-text-xs)', color: 'var(--bank-danger)', textAlign: 'center' }}>
          {error}
        </span>
      )}

      {/* ── Keyframes shake (inline pour isolation) ── */}
      <style>{`
        @keyframes bk-shake {
          0%,100% { transform: translateX(0); }
          20%      { transform: translateX(-6px); }
          40%      { transform: translateX(6px); }
          60%      { transform: translateX(-4px); }
          80%      { transform: translateX(4px); }
        }
      `}</style>
    </div>
  );
});
