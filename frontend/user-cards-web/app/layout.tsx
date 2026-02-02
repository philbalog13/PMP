import type { Metadata } from 'next';
import { Outfit, Inter } from 'next/font/google';
import './globals.css';
import Sidebar from '@/components/Sidebar';
import { AuthProvider } from '@shared/context/AuthContext';

const outfit = Outfit({ subsets: ['latin'], variable: '--font-outfit' });
const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'PMP Bank | Premium Banking',
  description: 'Experience the future of banking simulation.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className={`${outfit.variable} ${inter.variable}`}>
      <head>
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body className="font-sans bg-slate-950 text-slate-50 selection:bg-blue-500/30 overflow-x-hidden antialiased">
        <AuthProvider>
          <Sidebar />
          <main className="md:ml-64 min-h-screen">
            {children}
          </main>
        </AuthProvider>
      </body>
    </html>
  );
}
