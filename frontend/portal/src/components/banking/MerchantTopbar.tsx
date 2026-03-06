'use client';

import { LogOut } from 'lucide-react';
import { useAuth } from '@shared/context/AuthContext';
import { BankTopbar } from '@shared/components/banking/layout/BankTopbar';
import { BankButton } from '@shared/components/banking/primitives/BankButton';

export function MerchantTopbar() {
  const { logout, isLoading } = useAuth();

  return (
    <BankTopbar
      actions={
        <BankButton
          variant="ghost"
          size="sm"
          icon={LogOut}
          onClick={logout}
          disabled={isLoading}
          aria-label="Se deconnecter"
          title="Se deconnecter"
        >
          Deconnexion
        </BankButton>
      }
    />
  );
}
