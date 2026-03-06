'use client';

import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

type ToastVariant = 'success' | 'error' | 'info' | 'xp';

interface NotionToastItem {
  id: string;
  title: string;
  message?: string;
  variant: ToastVariant;
}

interface NotionToastContextValue {
  pushToast: (item: Omit<NotionToastItem, 'id'>) => void;
}

const NotionToastContext = createContext<NotionToastContextValue | null>(null);

const VARIANT_STYLE: Record<ToastVariant, React.CSSProperties> = {
  success: { borderLeft: '3px solid var(--n-success)' },
  error: { borderLeft: '3px solid var(--n-danger)' },
  info: { borderLeft: '3px solid var(--n-info)' },
  xp: { borderLeft: '3px solid var(--n-reward)', boxShadow: 'var(--n-glow-reward)' },
};

export function NotionToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<NotionToastItem[]>([]);

  const pushToast = useCallback((item: Omit<NotionToastItem, 'id'>) => {
    const id = Math.random().toString(36).slice(2, 9);
    setToasts((prev) => [...prev.slice(-2), { ...item, id }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 3800);
  }, []);

  const value = useMemo(() => ({ pushToast }), [pushToast]);

  return (
    <NotionToastContext.Provider value={value}>
      {children}
      <div
        style={{
          bottom: 'var(--n-space-6)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--n-space-2)',
          position: 'fixed',
          right: 'var(--n-space-6)',
          zIndex: 160,
        }}
      >
        {toasts.map((toast) => (
          <div key={toast.id} className="n-toast" style={{ ...VARIANT_STYLE[toast.variant], minWidth: '280px' }}>
            <div
              style={{
                color: 'var(--n-text-primary)',
                fontFamily: 'var(--n-font-sans)',
                fontSize: 'var(--n-text-sm)',
                fontWeight: 'var(--n-weight-semibold)',
              }}
            >
              {toast.title}
            </div>
            {toast.message && (
              <div
                style={{
                  color: 'var(--n-text-secondary)',
                  fontFamily: 'var(--n-font-sans)',
                  fontSize: 'var(--n-text-xs)',
                  marginTop: '2px',
                }}
              >
                {toast.message}
              </div>
            )}
          </div>
        ))}
      </div>
    </NotionToastContext.Provider>
  );
}

export function useNotionToast() {
  const context = useContext(NotionToastContext);
  if (!context) {
    throw new Error('useNotionToast must be used inside NotionToastProvider');
  }
  return context;
}
