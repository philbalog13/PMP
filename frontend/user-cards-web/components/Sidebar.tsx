'use client';

import { useState, useEffect } from 'react';
import {
    LayoutDashboard,
    CreditCard,
    History,
    Wallet,
    Settings,
    Home,
    PieChart,
    GraduationCap,
    Menu,
    X
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Sidebar() {
    const pathname = usePathname();
    const [mobileOpen, setMobileOpen] = useState(false);

    // Prevent body scroll when mobile menu is open
    useEffect(() => {
        if (mobileOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [mobileOpen]);

    const menuItems = [
        { icon: LayoutDashboard, label: 'Tableau de bord', href: '/' },
        { icon: CreditCard, label: 'Payer', href: '/pay' },
        { icon: Wallet, label: 'Compte bancaire', href: '/account' },
        { icon: CreditCard, label: 'Mes Cartes', href: '/cards' },
        { icon: History, label: 'Transactions', href: '/transactions' },
        { icon: PieChart, label: 'Statistiques', href: '/stats' },
        { icon: GraduationCap, label: 'Formation', href: '/learn' },
    ];

    const portalUrl = process.env.NEXT_PUBLIC_PORTAL_URL || 'http://localhost:3000';

    const sidebarContent = (
        <>
            <div className="p-8">
                <div className="flex items-center gap-3 mb-10">
                    <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center font-bold text-xl shadow-lg shadow-blue-500/30">
                        P
                    </div>
                    <div>
                        <h1 className="font-bold text-xl tracking-tight">PMP Bank</h1>
                        <p className="text-xs text-slate-400">Premium Banking</p>
                    </div>
                </div>

                <nav className="space-y-2">
                    {menuItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.href;

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setMobileOpen(false)}
                                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group relative overflow-hidden ${isActive
                                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                                    }`}
                            >
                                {isActive && <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />}
                                <Icon size={20} className={isActive ? 'text-white' : 'text-slate-500 group-hover:text-blue-400 transition-colors'} />
                                <span className="font-medium relative z-10">{item.label}</span>
                            </Link>
                        );
                    })}
                </nav>
            </div>

            <div className="mt-auto p-8 border-t border-slate-800">
                <a
                    href={`${portalUrl}/`}
                    className="flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-white transition-colors mb-2"
                >
                    <Home size={20} />
                    <span className="font-medium">Retour Portail</span>
                </a>
                <Link
                    href="/settings"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-white transition-colors"
                >
                    <Settings size={20} />
                    <span className="font-medium">Parametres</span>
                </Link>
            </div>
        </>
    );

    return (
        <>
            {/* Mobile hamburger button */}
            <button
                onClick={() => setMobileOpen(true)}
                className="fixed top-4 left-4 z-[60] md:hidden p-2 rounded-xl bg-slate-900/80 backdrop-blur-xl border border-white/10 text-white hover:bg-slate-800 transition-colors"
                aria-label="Ouvrir le menu"
            >
                <Menu size={22} />
            </button>

            {/* Mobile backdrop */}
            {mobileOpen && (
                <div
                    className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm md:hidden"
                    onClick={() => setMobileOpen(false)}
                />
            )}

            {/* Mobile slide-in sidebar */}
            <aside
                className={`fixed left-0 top-0 z-[70] w-72 bg-slate-900/95 backdrop-blur-xl text-white h-screen flex flex-col border-r border-white/5 md:hidden transition-transform duration-300 ${
                    mobileOpen ? 'translate-x-0' : '-translate-x-full'
                }`}
            >
                <button
                    onClick={() => setMobileOpen(false)}
                    className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                    aria-label="Fermer le menu"
                >
                    <X size={20} />
                </button>
                {sidebarContent}
            </aside>

            {/* Desktop sidebar (unchanged) */}
            <aside className="w-64 bg-slate-900/60 backdrop-blur-xl text-white h-screen fixed left-0 top-0 border-r border-white/5 hidden md:flex flex-col z-50">
                {sidebarContent}
            </aside>
        </>
    );
}
