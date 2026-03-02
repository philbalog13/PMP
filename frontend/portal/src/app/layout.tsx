import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MoneTIC - L'écosystème pédagogique industriel",
  description: "La plateforme de référence pour l'apprentissage de la monétique",
};

import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { AppShell } from "@/components/AppShell";
import { AuthProvider } from "@shared/context/AuthContext";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>
          {/*
           * AppShell gère conditionnellement Navbar+Footer :
           * - /student/*, /instructor/*, /merchant/* → NotionLayout (pas de Navbar publique)
           * - /auth/*, /login, /register            → standalone (pas de chrome)
           * - tout le reste                         → Navbar + pt-20 + Footer
           */}
          <AppShell
            navbar={<Navbar />}
            footer={<Footer />}
          >
            {children}
          </AppShell>
        </AuthProvider>
      </body>
    </html>
  );
}
