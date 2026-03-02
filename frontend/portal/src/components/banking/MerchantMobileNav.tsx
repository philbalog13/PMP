'use client';

import { BarChart3, LayoutDashboard, Receipt, Tablet } from 'lucide-react';
import { BankMobileNav } from '@shared/components/banking/layout/BankMobileNav';

export function MerchantMobileNav() {
  return (
    <BankMobileNav
      items={[
        { href: '/merchant',              label: 'Accueil',  icon: LayoutDashboard, exact: true },
        { href: '/merchant/transactions', label: 'Txns',     icon: Receipt },
        { href: '/merchant/pos',          label: 'POS',      icon: Tablet },
        { href: '/merchant/reports',      label: 'Rapports', icon: BarChart3 },
      ]}
    />
  );
}
