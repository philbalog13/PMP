import type { Metadata } from 'next';
import { Outfit, Inter } from 'next/font/google';
import './globals.css';

const outfit = Outfit({ subsets: ['latin'], variable: '--font-outfit' });
const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
    title: 'TPE Web Pédagogique - PMP',
    description: 'Terminal de Paiement Électronique - Plateforme Monétique Pédagogique',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="fr" className={`${outfit.variable} ${inter.variable}`}>
            <body className="font-sans bg-slate-950 text-slate-50 antialiased selection:bg-blue-500/30 overflow-x-hidden">
                {children}
            </body>
        </html>
    );
}
