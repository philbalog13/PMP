'use client';

import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { BankButton } from '../primitives/BankButton';

/* ══════════════════════════════════════════════════════
   TYPES
   ══════════════════════════════════════════════════════ */
interface BankModalProps {
  open:       boolean;
  onClose:    () => void;
  title:      string;
  children:   React.ReactNode;
  footer?:    React.ReactNode;
  size?:      'sm' | 'md' | 'lg';
  /** Ne ferme pas en cliquant sur le backdrop */
  persistent?: boolean;
}

const SIZE_WIDTH = { sm: 400, md: 560, lg: 720 };

/* ══════════════════════════════════════════════════════
   COMPOSANT
   ══════════════════════════════════════════════════════ */
export function BankModal({
  open,
  onClose,
  title,
  children,
  footer,
  size       = 'md',
  persistent = false,
}: BankModalProps) {
  const dialogRef  = useRef<HTMLDivElement>(null);
  const titleId    = `bank-modal-${Math.random().toString(36).slice(2, 7)}`;

  /* Focus trap + restauration du focus précédent */
  useEffect(() => {
    if (!open) return;

    const previousFocus = document.activeElement as HTMLElement | null;

    /* Focus sur la boîte de dialogue */
    const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    focusable?.[0]?.focus();

    /* Gestion des touches */
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); return; }
      if (e.key !== 'Tab') return;

      const els     = Array.from(focusable ?? []);
      const first   = els[0];
      const last    = els[els.length - 1];
      const focused = document.activeElement;

      if (e.shiftKey) {
        if (focused === first) { e.preventDefault(); last?.focus(); }
      } else {
        if (focused === last)  { e.preventDefault(); first?.focus(); }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previousFocus?.focus();
    };
  }, [open, onClose]);

  /* Bloquer le scroll du body */
  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = prev; };
    }
  }, [open]);

  if (!open) return null;

  return (
    /* Backdrop */
    <div
      className="bk-overlay"
      onClick={persistent ? undefined : onClose}
      role="presentation"
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--bank-space-4)' }}
    >
      {/* Boîte de dialogue */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--bank-bg-elevated)',
          border: '1px solid var(--bank-border-default)',
          borderRadius: 'var(--bank-radius-xl)',
          boxShadow: 'var(--bank-shadow-modal)',
          width: '100%',
          maxWidth: SIZE_WIDTH[size],
          maxHeight: '90dvh',
          display: 'flex',
          flexDirection: 'column',
          animation: 'bk-scale-in var(--bank-t-base) var(--bank-ease-out) both',
          overflow: 'hidden',
          zIndex: 'var(--bank-z-modal)',
          position: 'relative',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: 'var(--bank-space-5) var(--bank-space-6)',
            borderBottom: '1px solid var(--bank-border-subtle)',
            flexShrink: 0,
          }}
        >
          <h2
            id={titleId}
            style={{
              fontSize: 'var(--bank-text-lg)',
              fontWeight: 'var(--bank-font-semibold)',
              color: 'var(--bank-text-primary)',
              margin: 0,
            }}
          >
            {title}
          </h2>
          <BankButton
            variant="ghost"
            size="sm"
            onClick={onClose}
            aria-label="Fermer"
            style={{ padding: 'var(--bank-space-2)', minWidth: 'unset' }}
          >
            <X size={16} aria-hidden="true" />
          </BankButton>
        </div>

        {/* Body */}
        <div
          style={{
            padding: 'var(--bank-space-6)',
            overflowY: 'auto',
            flex: 1,
          }}
        >
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div
            style={{
              padding: 'var(--bank-space-4) var(--bank-space-6)',
              borderTop: '1px solid var(--bank-border-subtle)',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 'var(--bank-space-3)',
              flexShrink: 0,
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
