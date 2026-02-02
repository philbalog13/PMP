'use client';

import Link from 'next/link';
import { CreditCard, Github, Twitter, Linkedin, Mail } from 'lucide-react';
import { usePathname } from 'next/navigation';

export function Footer() {
    const pathname = usePathname();
    const isAuthPage = pathname === '/login' || pathname === '/register';
    if (isAuthPage) return null;

    return (
        <footer className="bg-slate-950 border-t border-white/5 pt-20 pb-10 px-6">
            <div className="max-w-7xl mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
                    {/* Brand */}
                    <div className="col-span-1 md:col-span-2 space-y-6">
                        <Link href="/" className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                                <CreditCard className="w-5 h-5 text-white" />
                            </div>
                            <span className="text-xl font-bold text-white tracking-tight">FINED-SIM</span>
                        </Link>
                        <p className="text-slate-400 max-w-sm leading-relaxed">
                            La première plateforme open-source dédiée à l'apprentissage pratique de la monétique,
                            de la cryptographie bancaire et de la sécurité des paiements.
                        </p>
                        <div className="flex gap-4">
                            <SocialIcon icon={<Github size={18} />} href="#" />
                            <SocialIcon icon={<Twitter size={18} />} href="#" />
                            <SocialIcon icon={<Linkedin size={18} />} href="#" />
                        </div>
                    </div>

                    {/* Resources */}
                    <div>
                        <h4 className="text-white font-bold uppercase tracking-widest text-xs mb-6">Plateforme</h4>
                        <ul className="space-y-4">
                            <FooterLink href="/documentation" label="Documentation" />
                            <FooterLink href="/lab" label="Laboratoire" />
                            <FooterLink href="/workshops" label="Ateliers" />
                            <FooterLink href="/demo" label="Démo Interactive" />
                        </ul>
                    </div>

                    {/* Company */}
                    <div>
                        <h4 className="text-white font-bold uppercase tracking-widest text-xs mb-6">À Propos</h4>
                        <ul className="space-y-4">
                            <FooterLink href="/about" label="Notre Mission" />
                            <FooterLink href="/support" label="Support & Aide" />
                            <FooterLink href="/tools" label="Outils" />
                            <FooterLink href="/api-docs" label="API Gateway" />
                        </ul>
                    </div>
                </div>

                <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">
                        © 2026 FINED-SIM. TOUS DROITS RÉSERVÉS.
                    </p>
                    <div className="flex gap-8">
                        <Link href="#" className="text-slate-500 hover:text-white text-[10px] font-bold uppercase tracking-widest transition">Confidentialité</Link>
                        <Link href="#" className="text-slate-500 hover:text-white text-[10px] font-bold uppercase tracking-widest transition">Mentions Légales</Link>
                        <Link href="#" className="text-slate-500 hover:text-white text-[10px] font-bold uppercase tracking-widest transition">Cookies</Link>
                    </div>
                </div>
            </div>
        </footer>
    );
}

function FooterLink({ href, label }: { href: string; label: string }) {
    return (
        <li>
            <Link href={href} className="text-slate-400 hover:text-white text-sm font-medium transition-colors">
                {label}
            </Link>
        </li>
    );
}

function SocialIcon({ icon, href }: { icon: any; href: string }) {
    return (
        <Link href={href} className="w-10 h-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center text-slate-400 hover:bg-white/10 hover:text-white transition-all">
            {icon}
        </Link>
    );
}
