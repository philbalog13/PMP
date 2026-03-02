import type { Metadata } from 'next';
import { Outfit, Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider }    from '@shared/context/AuthContext';
import { BankShell }       from '@shared/components/banking/layout/BankShell';
import { ClientSidebar }   from '@/components/banking/ClientSidebar';
import { ClientTopbar }    from '@/components/banking/ClientTopbar';
import { ClientMobileNav } from '@/components/banking/ClientMobileNav';

/* ── Fonts (inchangé) ── */
const outfit = Outfit({ subsets: ['latin'], variable: '--font-outfit' });
const inter  = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title:       'MoneBank — Espace Client',
  description: 'Gestion de vos cartes et transactions — Plateforme Monétique Pédagogique MoneTIC',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${outfit.variable} ${inter.variable}`}>
      <head>
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body>
        <AuthProvider>
          {/*
           * BankShell remplace :
           *   <Sidebar /> + <main className="md:ml-64 min-h-screen">
           * Il gère : sidebar desktop, topbar sticky, bottom nav mobile,
           *           thème dark/light (localStorage), data-bank-theme/role.
           */}
          <BankShell
            role="client"
            defaultTheme="dark"
            sidebar={<ClientSidebar />}
            topbar={<ClientTopbar />}
            mobileNav={<ClientMobileNav />}
          >
            {children}
          </BankShell>
        </AuthProvider>
      </body>
    </html>
  );
}
