'use client';

import Image from 'next/image';
import Link from 'next/link';
import { type ReactNode } from 'react';
import { Github, Linkedin, Twitter } from 'lucide-react';
import { usePathname } from 'next/navigation';

export function Footer() {
  const pathname = usePathname();
  const isAuthPage = pathname === '/login' || pathname === '/register' || pathname.startsWith('/auth/');
  if (isAuthPage) return null;

  return (
    <footer className="border-t border-white/5 bg-slate-950 px-6 pb-10 pt-20">
      <div className="mx-auto max-w-7xl">
        <div className="mb-16 grid grid-cols-1 gap-12 md:grid-cols-4">
          <div className="col-span-1 space-y-6 md:col-span-2">
            <Link href="/" className="flex items-center gap-3">
              <Image
                src="/monetic-logo.svg"
                alt="MoneTIC logo"
                width={40}
                height={40}
                className="h-10 w-10 transition-transform duration-300 hover:scale-110"
              />
              <span className="text-xl font-bold tracking-tight text-white">MoneTIC</span>
            </Link>
            <p className="max-w-sm leading-relaxed text-slate-300">
              Plateforme open-source dediee a l&apos;apprentissage pratique de la monetique, de la cryptographie
              bancaire et de la securite des paiements.
            </p>
            <div className="flex gap-4" aria-label="Liens reseaux sociaux MoneTIC">
              <SocialIcon icon={<Github size={18} />} href="https://github.com/" label="GitHub MoneTIC" />
              <SocialIcon icon={<Twitter size={18} />} href="https://x.com/" label="X MoneTIC" />
              <SocialIcon icon={<Linkedin size={18} />} href="https://www.linkedin.com/" label="LinkedIn MoneTIC" />
            </div>
          </div>

          <div>
            <p className="mb-6 text-xs font-bold uppercase tracking-widest text-white">Plateforme</p>
            <ul className="space-y-4">
              <FooterLink href="/documentation" label="Documentation" />
              <FooterLink href="/student/ctf" label="Laboratoire" />
              <FooterLink href="/student/cursus" label="Ateliers" />
              <FooterLink href="/demo" label="Demo interactive" />
            </ul>
          </div>

          <div>
            <p className="mb-6 text-xs font-bold uppercase tracking-widest text-white">A propos</p>
            <ul className="space-y-4">
              <FooterLink href="/about" label="Notre mission" />
              <FooterLink href="/support" label="Support et aide" />
              <FooterLink href="/tools" label="Outils" />
              <FooterLink href="/api-docs" label="API Gateway" />
            </ul>
          </div>
        </div>

        <div className="flex flex-col items-center justify-between gap-6 border-t border-white/5 pt-8 md:flex-row">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">© 2026 MoneTIC. Tous droits reserves.</p>
          <div className="flex gap-6">
            <LegalLink href="/privacy" label="Confidentialite" />
            <LegalLink href="/legal" label="Mentions legales" />
            <LegalLink href="/cookies" label="Cookies" />
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterLink({ href, label }: { href: string; label: string }) {
  return (
    <li>
      <Link
        href={href}
        className="text-sm font-medium text-slate-300 transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
      >
        {label}
      </Link>
    </li>
  );
}

function LegalLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="text-xs font-bold uppercase tracking-widest text-slate-400 transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
    >
      {label}
    </Link>
  );
}

function SocialIcon({ icon, href, label }: { icon: ReactNode; href: string; label: string }) {
  return (
    <Link
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      aria-label={label}
      title={label}
      className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300 transition-all hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
    >
      {icon}
    </Link>
  );
}
