'use client';

import {
  CreditCard,
  History,
  LayoutDashboard,
  SendHorizonal,
  ShieldCheck,
  Wallet,
  Home,
  ShieldCheck as AdminIcon,
} from 'lucide-react';
import { useAuth } from '@shared/context/AuthContext';
import { BankSidebar, type BankNavItem } from '@shared/components/banking/layout/BankSidebar';
import { APP_URLS } from '@shared/lib/app-urls';

/* ══════════════════════════════════════════════════════
   LOGO MONEBANK
   ══════════════════════════════════════════════════════ */
function MoneBankLogo() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--bank-space-3)' }}>
      {/* Icône stylisée */}
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 'var(--bank-radius-md)',
          background: 'var(--bank-accent-dim)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          border: '1px solid var(--bank-accent-subtle)',
        }}
        aria-hidden="true"
      >
        <CreditCard size={18} style={{ color: 'var(--bank-accent)' }} />
      </div>
      <div>
        <div
          style={{
            fontSize: 'var(--bank-text-base)',
            fontWeight: 'var(--bank-font-bold)',
            color: 'var(--bank-text-primary)',
            letterSpacing: 'var(--bank-tracking-tight)',
            lineHeight: 1.2,
          }}
        >
          MoneBank
        </div>
        <div className="bk-label-upper" style={{ fontSize: '0.6rem', marginTop: 2 }}>
          Espace Client
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   NAV ITEMS
   ══════════════════════════════════════════════════════ */
const CLIENT_NAV_ITEMS: BankNavItem[] = [
  { href: '/',            label: 'Tableau de bord', icon: LayoutDashboard, exact: true },
  { href: '/pay',         label: 'Payer',            icon: SendHorizonal },
  { href: '/account',     label: 'Compte',           icon: Wallet },
  { href: '/cards',       label: 'Mes cartes',       icon: CreditCard },
  { href: '/transactions',label: 'Historique',       icon: History },
  { href: '/security',    label: 'Sécurité',         icon: ShieldCheck },
];

const CLIENT_BOTTOM_ITEMS: BankNavItem[] = [
  {
    href: APP_URLS.portal ?? 'http://localhost:3000',
    label: 'Retour portail',
    icon: Home,
    exact: true,
  },
];

/* ══════════════════════════════════════════════════════
   COMPOSANT
   ══════════════════════════════════════════════════════ */
export function ClientSidebar() {
  const { user, logout } = useAuth();

  /* Infos utilisateur normalisées */
  const userInfo = user
    ? {
        name: (user as any).firstName
          ? `${(user as any).firstName} ${(user as any).lastName ?? ''}`.trim()
          : (user as any).name ?? (user as any).email ?? 'Utilisateur',
        email: (user as any).email ?? '',
      }
    : undefined;

  /* Vérification admin (FORMATEUR a FULL_ACCESS) */
  const userRole = (user as any)?.role ?? '';
  const isAdmin  = userRole === 'ROLE_FORMATEUR' || userRole.includes('FORMATEUR');

  const navItems = isAdmin
    ? [
        ...CLIENT_NAV_ITEMS,
        { href: '/admin', label: 'Administration', icon: AdminIcon },
      ]
    : CLIENT_NAV_ITEMS;

  return (
    <BankSidebar
      logo={<MoneBankLogo />}
      items={navItems}
      bottomItems={CLIENT_BOTTOM_ITEMS}
      user={userInfo}
      onLogout={logout}
    />
  );
}
