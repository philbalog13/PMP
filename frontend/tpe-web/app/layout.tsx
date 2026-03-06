import type { Metadata } from 'next';
import { Outfit, Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@shared/context/AuthContext';
import { BankShell }    from '@shared/components/banking/layout/BankShell';

const outfit = Outfit({ subsets: ['latin'], variable: '--font-outfit', display: 'optional' });
const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'optional' });

export const metadata: Metadata = {
  title:       'Terminal POS — SoluBank',
  description: 'Terminal de Paiement Électronique — Plateforme Monétique Pédagogique MoneTIC',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${outfit.variable} ${inter.variable}`}>
      <body>
        <AuthProvider>
          {/*
           * BankShell sans sidebar — le TPE est une UI fullscreen de terminal.
           * Pas de navigation latérale, pas de topbar standard.
           * Le thème dark + accent teal (merchant) est activé via data-bank-role.
           * La page page.tsx gère elle-même son propre layout fullscreen.
           */}
          <BankShell role="merchant" defaultTheme="dark">
            {children}
          </BankShell>
        </AuthProvider>
      </body>
    </html>
  );
}
