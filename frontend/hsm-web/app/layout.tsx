import type { Metadata } from "next";
import { Outfit, Inter } from "next/font/google";
import "./globals.css";
import Navbar from "./components/Navbar";

const outfit = Outfit({ subsets: ["latin"], variable: "--font-heading" });
const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "HSM Simulator Admin",
  description: "Educational HSM Management Interface",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${outfit.variable} ${inter.variable}`}>
      <body className="font-sans bg-slate-950 text-slate-50 antialiased selection:bg-green-500/30 overflow-x-hidden">
        <Navbar />
        <main className="container mx-auto p-6 md:p-10">
          {children}
        </main>
      </body>
    </html>
  );
}
