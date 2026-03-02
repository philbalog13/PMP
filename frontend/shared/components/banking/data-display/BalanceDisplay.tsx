'use client';

import { useEffect, useRef, useState } from 'react';
import { BankSkeleton } from '../feedback/BankSkeleton';

/* ══════════════════════════════════════════════════════
   COUNT-UP HOOK
   ══════════════════════════════════════════════════════ */
function useCountUp(target: number, duration = 600): number {
  const [current, setCurrent] = useState(0);
  const startRef              = useRef<number | null>(null);
  const rafRef                = useRef<number | null>(null);

  useEffect(() => {
    /* Réinitialiser si target change */
    startRef.current = null;
    setCurrent(0);

    /* Pas d'animation si prefers-reduced-motion */
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setCurrent(target);
      return;
    }

    const animate = (ts: number) => {
      if (startRef.current === null) startRef.current = ts;
      const elapsed  = ts - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      /* Ease out cubic */
      const eased    = 1 - Math.pow(1 - progress, 3);
      setCurrent(target * eased);
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [target, duration]);

  return current;
}

/* ══════════════════════════════════════════════════════
   COMPOSANT
   ══════════════════════════════════════════════════════ */
interface BalanceDisplayProps {
  amount:              number;
  currency?:           string;          /* "EUR", "USD" … */
  label?:              string;          /* "Solde disponible" */
  secondaryAmount?:    number;
  secondaryLabel?:     string;
  loading?:            boolean;
  locale?:             string;
  animateOnMount?:     boolean;
}

function formatCurrency(amount: number, currency = 'EUR', locale = 'fr-FR'): string {
  return new Intl.NumberFormat(locale, {
    style:    'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function BalanceDisplay({
  amount,
  currency      = 'EUR',
  label,
  secondaryAmount,
  secondaryLabel,
  loading       = false,
  locale        = 'fr-FR',
  animateOnMount = true,
}: BalanceDisplayProps) {
  const displayAmount    = animateOnMount ? useCountUp(amount, 700) : amount;
  const displaySecondary = secondaryAmount !== undefined
    ? (animateOnMount ? useCountUp(secondaryAmount, 700) : secondaryAmount)
    : undefined;

  if (loading) {
    return <BankSkeleton variant="balance" />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--bank-space-2)' }}>
      {/* Label */}
      {label && (
        <span className="bk-label-upper" aria-label={label}>
          {label}
        </span>
      )}

      {/* Montant principal */}
      <div
        className="bk-display-balance"
        aria-label={`${label ?? 'Solde'} : ${formatCurrency(amount, currency, locale)}`}
        aria-live="polite"
      >
        {formatCurrency(displayAmount, currency, locale)}
      </div>

      {/* Montant secondaire */}
      {secondaryAmount !== undefined && displaySecondary !== undefined && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--bank-space-2)',
          }}
        >
          {secondaryLabel && (
            <span className="bk-caption">{secondaryLabel} :</span>
          )}
          <span
            style={{
              fontSize: 'var(--bank-text-sm)',
              fontWeight: 'var(--bank-font-medium)',
              color: 'var(--bank-text-secondary)',
            }}
          >
            {formatCurrency(displaySecondary, currency, locale)}
          </span>
        </div>
      )}
    </div>
  );
}
