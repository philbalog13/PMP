/*
 * Merchant Layout — SoluBank
 * Wraps toutes les pages /merchant/* avec BankShell role="merchant"
 * Crée le contexte de thème banking (data-bank-theme + data-bank-role="merchant")
 * qui active les accents teal dans bank-theme.css.
 *
 * ⚠️ Ce layout ne wrappe QUE les routes /merchant/*.
 *    Les routes /student/* et /instructor/* ont leurs propres layouts Notion
 *    et ne sont pas affectées.
 */
import { BankShell }         from '@shared/components/banking/layout/BankShell';
import { MerchantSidebar }   from '@/components/banking/MerchantSidebar';
import { MerchantTopbar }    from '@/components/banking/MerchantTopbar';
import { MerchantMobileNav } from '@/components/banking/MerchantMobileNav';

export default function MerchantLayout({ children }: { children: React.ReactNode }) {
  return (
    <BankShell
      role="merchant"
      defaultTheme="dark"
      sidebar={<MerchantSidebar />}
      topbar={<MerchantTopbar />}
      mobileNav={<MerchantMobileNav />}
    >
      {children}
    </BankShell>
  );
}
