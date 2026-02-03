import type { Metadata } from "next";
import { Outfit, Inter } from "next/font/google";
import "./globals.css";
import Sidebar from "./components/Sidebar";
import Navbar from "./components/Navbar";
import { AuthProvider } from "@shared/context/AuthContext";

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
      <body className="font-sans bg-slate-950 text-slate-50 antialiased selection:bg-blue-500/30 overflow-x-hidden">
        <AuthProvider>
          <div className="min-h-screen">
            <Sidebar />
            <div className="lg:pl-64 min-h-screen">
              <div className="lg:hidden">
                <Navbar />
              </div>
              <main className="p-4 sm:p-6 lg:p-8 overflow-y-auto">
                <div className="max-w-7xl mx-auto animate-fade-in">
                  {children}
                </div>
              </main>
            </div>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
