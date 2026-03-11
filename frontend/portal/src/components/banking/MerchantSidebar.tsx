'use client';

import {
  BarChart3,
  Code2,
  LayoutDashboard,
  Receipt,
  Store,
  Tablet,
} from 'lucide-react';
import { useAuth } from '@shared/context/AuthContext';
import { BankSidebar, type BankNavItem } from '@shared/components/banking/layout/BankSidebar';

/* ══════════════════════════════════════════════════════
   LOGO SOLUBANK
   ══════════════════════════════════════════════════════ */
function SoluBankLogo() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--bank-space-3)' }}>
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
        <Store size={18} style={{ color: 'var(--bank-accent)' }} />
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
          SoluBank
        </div>
        <div className="bk-label-upper" style={{ fontSize: '0.6rem', marginTop: 2 }}>
          Espace Marchand
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   NAV ITEMS
   ══════════════════════════════════════════════════════ */
const MERCHANT_NAV_ITEMS: BankNavItem[] = [
  { href: '/merchant',              label: 'Tableau de bord', icon: LayoutDashboard, exact: true },
  { href: '/merchant/transactions', label: 'Transactions',    icon: Receipt },
  { href: '/merchant/pos',          label: 'Terminal POS',    icon: Tablet },
  { href: '/merchant/reports',      label: 'Rapports',        icon: BarChart3 },
  { href: '/merchant/api',          label: 'API',             icon: Code2 },
];

/* ══════════════════════════════════════════════════════
   COMPOSANT
   ══════════════════════════════════════════════════════ */
export function MerchantSidebar() {
  const { user, logout } = useAuth();

  const userInfo = user
    ? {
        name: (user as any).firstName
          ? `${(user as any).firstName} ${(user as any).lastName ?? ''}`.trim()
          : (user as any).name ?? (user as any).email ?? 'Marchand',
        email: (user as any).email ?? '',
      }
    : undefined;

  return (
    <BankSidebar
      logo={<SoluBankLogo />}
      items={MERCHANT_NAV_ITEMS}
      user={userInfo}
      onLogout={logout}
    />
  );
}
