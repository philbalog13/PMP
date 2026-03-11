'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface NotionTopbarProps {
  /** Fil d'Ariane */
  breadcrumbs?: BreadcrumbItem[];
  /** Actions côté droit (boutons, badges, etc.) */
  actions?: React.ReactNode;
  /** Titre courant (affiché si pas de breadcrumbs) */
  title?: string;
}

/**
 * NotionTopbar — Barre supérieure sobre avec breadcrumb et actions
 * Rendu à l'intérieur du topbar du NotionLayout (après le bouton toggle sidebar)
 */
export function NotionTopbar({ breadcrumbs, actions, title }: NotionTopbarProps) {
  return (
    <>
      {/* Breadcrumb ou titre */}
      <div
        className="flex-1 min-w-0 flex items-center gap-1"
        style={{
          fontSize: 'var(--n-text-sm)',
          color: 'var(--n-text-secondary)',
          fontWeight: 'var(--n-weight-medium)',
        }}
      >
        {breadcrumbs && breadcrumbs.length > 0 ? (
          breadcrumbs.map((crumb, idx) => (
            <React.Fragment key={idx}>
              {idx > 0 && (
                <ChevronRight
                  size={13}
                  strokeWidth={1.75}
                  style={{ color: 'var(--n-text-tertiary)', flexShrink: 0 }}
                />
              )}
              {crumb.href ? (
                <Link
                  href={crumb.href}
                  style={{
                    color: idx === breadcrumbs.length - 1
                      ? 'var(--n-text-primary)'
                      : 'var(--n-text-secondary)',
                    fontWeight: idx === breadcrumbs.length - 1
                      ? 'var(--n-weight-semibold)'
                      : 'var(--n-weight-medium)',
                    textDecoration: 'none',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    maxWidth: '160px',
                    transition: 'color var(--n-duration-xs) var(--n-ease)',
                  }}
                  onMouseEnter={e => {
                    if (idx < breadcrumbs.length - 1) {
                      (e.currentTarget as HTMLAnchorElement).style.color = 'var(--n-text-primary)';
                    }
                  }}
                  onMouseLeave={e => {
                    if (idx < breadcrumbs.length - 1) {
                      (e.currentTarget as HTMLAnchorElement).style.color = 'var(--n-text-secondary)';
                    }
                  }}
                >
                  {crumb.label}
                </Link>
              ) : (
                <span
                  style={{
                    color: idx === breadcrumbs.length - 1
                      ? 'var(--n-text-primary)'
                      : 'var(--n-text-secondary)',
                    fontWeight: idx === breadcrumbs.length - 1
                      ? 'var(--n-weight-semibold)'
                      : 'var(--n-weight-medium)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    maxWidth: '200px',
                  }}
                >
                  {crumb.label}
                </span>
              )}
            </React.Fragment>
          ))
        ) : title ? (
          <span
            style={{
              color: 'var(--n-text-primary)',
              fontWeight: 'var(--n-weight-semibold)',
            }}
          >
            {title}
          </span>
        ) : null}
      </div>

      {/* Actions côté droit */}
      {actions && (
        <div
          className="flex items-center gap-2 flex-shrink-0"
          style={{ marginLeft: 'auto' }}
        >
          {actions}
        </div>
      )}
    </>
  );
}
