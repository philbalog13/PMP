'use client';

import React, { useEffect } from 'react';

interface NotionModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function NotionModal({
  open,
  onClose,
  title,
  children,
  footer,
}: NotionModalProps) {
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="n-modal-backdrop" onClick={onClose}>
      <div
        className="n-modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        style={{
          left: '50%',
          maxHeight: '88vh',
          maxWidth: '640px',
          overflow: 'hidden',
          position: 'fixed',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          width: 'calc(100vw - 32px)',
        }}
      >
        <header
          style={{
            alignItems: 'center',
            borderBottom: '1px solid var(--n-border)',
            display: 'flex',
            justifyContent: 'space-between',
            padding: 'var(--n-space-4) var(--n-space-5)',
          }}
        >
          <h2
            style={{
              color: 'var(--n-text-primary)',
              fontFamily: 'var(--n-font-sans)',
              fontSize: 'var(--n-text-lg)',
              fontWeight: 'var(--n-weight-semibold)',
              margin: 0,
            }}
          >
            {title}
          </h2>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: '1px solid var(--n-border)',
              borderRadius: 'var(--n-radius-sm)',
              color: 'var(--n-text-tertiary)',
              cursor: 'pointer',
              fontSize: 'var(--n-text-sm)',
              height: '30px',
              width: '30px',
            }}
          >
            x
          </button>
        </header>
        <section
          style={{
            maxHeight: 'calc(88vh - 132px)',
            overflowY: 'auto',
            padding: 'var(--n-space-5)',
          }}
        >
          {children}
        </section>
        {footer && (
          <footer
            style={{
              borderTop: '1px solid var(--n-border)',
              display: 'flex',
              gap: 'var(--n-space-3)',
              justifyContent: 'flex-end',
              padding: 'var(--n-space-4) var(--n-space-5)',
            }}
          >
            {footer}
          </footer>
        )}
      </div>
    </div>
  );
}
