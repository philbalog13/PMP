'use client';

import type { ReactNode } from 'react';

interface TPEShellProps {
    children: ReactNode;
    className?: string;
}

export default function TPEShell({ children, className = '' }: TPEShellProps) {
    return (
        <div className={`tpe-shell bk-root ${className}`}>
            <div className="tpe-shell__backdrop" aria-hidden="true" />
            <div className="tpe-shell__content">{children}</div>

            <style jsx>{`
              .tpe-shell {
                position: relative;
                min-height: 100dvh;
                background: var(--bank-bg-base);
                overflow: hidden;
              }

              .tpe-shell__backdrop {
                position: absolute;
                inset: 0;
                pointer-events: none;
                background:
                  radial-gradient(circle at 18% 20%, color-mix(in srgb, var(--bank-accent) 18%, transparent), transparent 42%),
                  radial-gradient(circle at 88% 0%, rgba(14, 165, 233, 0.12), transparent 34%),
                  linear-gradient(160deg, rgba(255, 255, 255, 0.02), transparent 35%),
                  var(--bank-bg-base);
              }

              .tpe-shell__content {
                position: relative;
                z-index: 1;
                max-width: 1320px;
                margin: 0 auto;
                padding: var(--bank-space-6);
              }

              @media (max-width: 768px) {
                .tpe-shell__content {
                  padding: var(--bank-space-4);
                }
              }
            `}</style>
        </div>
    );
}

