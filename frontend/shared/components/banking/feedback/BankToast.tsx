'use client';

import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, Info, X, XCircle } from 'lucide-react';

/* ══════════════════════════════════════════════════════
   TYPES
   ══════════════════════════════════════════════════════ */
export type ToastVariant = 'success' | 'danger' | 'info' | 'warning';

interface Toast {
  id:       string;
  variant:  ToastVariant;
  title:    string;
  message?: string;
}

interface BankToastContextValue {
  addToast: (variant: ToastVariant, title: string, message?: string) => void;
}

/* ══════════════════════════════════════════════════════
   CONTEXT
   ══════════════════════════════════════════════════════ */
const BankToastContext = createContext<BankToastContextValue | null>(null);

export function useBankToast(): BankToastContextValue {
  const ctx = useContext(BankToastContext);
  if (!ctx) throw new Error('useBankToast must be used inside BankToastProvider');
  return ctx;
}

/* ══════════════════════════════════════════════════════
   TOAST ITEM
   ══════════════════════════════════════════════════════ */
const ICONS: Record<ToastVariant, React.ElementType> = {
  success: CheckCircle2,
  danger:  XCircle,
  warning: AlertCircle,
  info:    Info,
};

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  const Icon = ICONS[toast.variant];
  return (
    <div
      role="alert"
      aria-live="polite"
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 'var(--bank-space-3)',
        padding: 'var(--bank-space-4)',
        background: 'var(--bank-bg-elevated)',
        border: `1px solid var(--bank-border-default)`,
        borderLeft: `3px solid var(--bank-${toast.variant})`,
        borderRadius: 'var(--bank-radius-lg)',
        boxShadow: 'var(--bank-shadow-lg)',
        minWidth: 280,
        maxWidth: 380,
        animation: 'bk-slide-in-right var(--bank-t-base) var(--bank-ease-out) both',
      }}
    >
      <Icon
        size={18}
        aria-hidden="true"
        style={{ color: `var(--bank-${toast.variant})`, flexShrink: 0, marginTop: 1 }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 'var(--bank-text-sm)',
            fontWeight: 'var(--bank-font-semibold)',
            color: 'var(--bank-text-primary)',
          }}
        >
          {toast.title}
        </div>
        {toast.message && (
          <div
            className="bk-caption"
            style={{ marginTop: 'var(--bank-space-1)' }}
          >
            {toast.message}
          </div>
        )}
      </div>
      <button
        onClick={() => onDismiss(toast.id)}
        aria-label="Fermer la notification"
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: 'var(--bank-space-1)',
          color: 'var(--bank-text-tertiary)',
          flexShrink: 0,
          borderRadius: 'var(--bank-radius-sm)',
        }}
      >
        <X size={14} aria-hidden="true" />
      </button>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   PROVIDER — à placer dans le layout banking
   ══════════════════════════════════════════════════════ */
export function BankToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers              = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
    clearTimeout(timers.current.get(id));
    timers.current.delete(id);
  }, []);

  const addToast = useCallback(
    (variant: ToastVariant, title: string, message?: string) => {
      const id = Math.random().toString(36).slice(2, 9);

      setToasts(prev => {
        const next = [...prev, { id, variant, title, message }];
        /* Stack max 3 toasts — supprimer le plus ancien */
        return next.length > 3 ? next.slice(next.length - 3) : next;
      });

      const timer = setTimeout(() => dismissToast(id), 4000);
      timers.current.set(id, timer);
    },
    [dismissToast],
  );

  return (
    <BankToastContext.Provider value={{ addToast }}>
      {children}

      {/* Zone d'affichage — bottom-right */}
      {toasts.length > 0 && (
        <div
          aria-label="Notifications"
          style={{
            position: 'fixed',
            bottom: 'var(--bank-space-6)',
            right: 'var(--bank-space-6)',
            zIndex: 'var(--bank-z-toast)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--bank-space-3)',
            pointerEvents: 'none',
          }}
        >
          {toasts.map(toast => (
            <div key={toast.id} style={{ pointerEvents: 'auto' }}>
              <ToastItem toast={toast} onDismiss={dismissToast} />
            </div>
          ))}
        </div>
      )}
    </BankToastContext.Provider>
  );
}
