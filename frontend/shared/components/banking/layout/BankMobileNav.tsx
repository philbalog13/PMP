'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';

/* ══════════════════════════════════════════════════════
   TYPES
   ══════════════════════════════════════════════════════ */
export interface BankMobileNavItem {
  href:   string;
  label:  string;
  icon:   LucideIcon;
  exact?: boolean;
}

interface BankMobileNavProps {
  items: BankMobileNavItem[];   /* max 5 recommandé */
}

/* ══════════════════════════════════════════════════════
   COMPOSANT
   ══════════════════════════════════════════════════════ */
export function BankMobileNav({ items }: BankMobileNavProps) {
  const pathname = usePathname();

  return (
    <>
      {items.map(item => {
        const isActive = item.exact
          ? pathname === item.href
          : pathname === item.href || pathname.startsWith(item.href + '/');

        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? 'page' : undefined}
            aria-label={item.label}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '3px',
              padding: 'var(--bank-space-2) var(--bank-space-1)',
              textDecoration: 'none',
              color: isActive ? 'var(--bank-accent)' : 'var(--bank-text-tertiary)',
              transition: 'color var(--bank-t-fast) var(--bank-ease)',
              position: 'relative',
            }}
          >
            {/* Indicateur active */}
            {isActive && (
              <span
                style={{
                  position: 'absolute',
                  top: 0,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: 24,
                  height: 2,
                  borderRadius: '0 0 var(--bank-radius-full) var(--bank-radius-full)',
                  backgroundColor: 'var(--bank-accent)',
                }}
                aria-hidden="true"
              />
            )}

            <Icon
              size={20}
              aria-hidden="true"
              strokeWidth={isActive ? 2.2 : 1.8}
            />
            <span
              style={{
                fontSize: '0.65rem',
                fontWeight: isActive ? 'var(--bank-font-semibold)' : 'var(--bank-font-normal)',
                lineHeight: 1,
              }}
            >
              {item.label}
            </span>
          </Link>
        );
      })}
    </>
  );
}
