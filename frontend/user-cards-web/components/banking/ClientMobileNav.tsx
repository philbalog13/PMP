'use client';

import {
  CreditCard,
  History,
  LayoutDashboard,
  SendHorizonal,
  Wallet,
} from 'lucide-react';
import { BankMobileNav } from '@shared/components/banking/layout/BankMobileNav';

/* 5 items max sur mobile — les plus importants */
export function ClientMobileNav() {
  return (
    <BankMobileNav
      items={[
        { href: '/',            label: 'Accueil',    icon: LayoutDashboard, exact: true },
        { href: '/pay',         label: 'Payer',      icon: SendHorizonal },
        { href: '/account',     label: 'Compte',     icon: Wallet },
        { href: '/cards',       label: 'Cartes',     icon: CreditCard },
        { href: '/transactions',label: 'Historique', icon: History },
      ]}
    />
  );
}
