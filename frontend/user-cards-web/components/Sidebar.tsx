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
    Menu,
    X,
    ShieldCheck,
    LogOut
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useAuth } from '@shared/context/AuthContext';

export default function Sidebar() {
    const pathname = usePathname();
    const [mobileOpen, setMobileOpen] = useState(false);
    const { user } = useAuth();

    const handleLogout = () => {
        setMobileOpen(false);
        const token = localStorage.getItem('token');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('role');
        localStorage.removeItem('refreshToken');
        document.cookie = 'token=; Max-Age=0; path=/';
        document.cookie = 'refreshToken=; Max-Age=0; path=/';
        if (token) {
            fetch('/api/auth/logout', {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
            }).catch(() => {});
        }
        const portalLogin = `${process.env.NEXT_PUBLIC_PORTAL_URL || 'http://localhost:3000'}/login`;
        window.location.replace(portalLogin);
    };

    // Detect admin role (FORMATEUR has FULL_ACCESS)
    const userRole = (user as any)?.role || '';
    const isAdmin = userRole === 'ROLE_FORMATEUR' || userRole.includes('FORMATEUR');

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
    ];

    const portalUrl = process.env.NEXT_PUBLIC_PORTAL_URL || 'http://localhost:3000';

    const sidebarContent = (
        <>
            <div className="p-8">
                <div className="flex items-center gap-3 mb-10">
                    <Image src="/monetic-logo.svg" alt="MoneTIC Logo" width={40} height={40} />
                    <div>
                        <h1 className="font-bold text-xl italic tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">MoneTIC</h1>
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-cyan-400">Espace Client</p>
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

                    {/* Admin link — visible only for FORMATEUR (admin) */}
                    {isAdmin && (
                        <div className="pt-3 mt-3 border-t border-white/5">
                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-600 px-4 mb-2">Administration</p>
                            <Link
                                href="/admin"
                                onClick={() => setMobileOpen(false)}
                                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group relative overflow-hidden ${
                                    pathname === '/admin'
                                        ? 'bg-red-600/80 text-white shadow-lg shadow-red-500/20'
                                        : 'text-red-400/70 hover:text-red-300 hover:bg-red-500/10'
                                }`}
                            >
                                <ShieldCheck size={20} className={pathname === '/admin' ? 'text-white' : 'text-red-500/70 group-hover:text-red-400 transition-colors'} />
                                <span className="font-medium relative z-10">Gestion Clients</span>
                                {pathname !== '/admin' && (
                                    <span className="ml-auto text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 bg-red-500/15 text-red-400 rounded-full border border-red-500/20">
                                        Admin
                                    </span>
                                )}
                            </Link>
                        </div>
                    )}
                </nav>
            </div>

            <div className="mt-auto p-6 border-t border-slate-800 space-y-1">
                {/* User info */}
                {user && (
                    <div className="flex items-center gap-3 px-4 py-3 mb-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                            {((user as any).firstName?.[0] || (user as any).name?.[0] || (user as any).email?.[0] || '?').toUpperCase()}
                        </div>
                        <div className="overflow-hidden">
                            <p className="text-white text-sm font-semibold truncate">
                                {(user as any).firstName || (user as any).name || 'Utilisateur'}
                            </p>
                            <p className="text-slate-500 text-xs truncate">{(user as any).email || ''}</p>
                        </div>
                    </div>
                )}

                <a
                    href={`${portalUrl}/`}
                    className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                >
                    <Home size={18} />
                    <span className="font-medium text-sm">Retour Portail</span>
                </a>
                <Link
                    href="/settings"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                >
                    <Settings size={18} />
                    <span className="font-medium text-sm">Paramètres</span>
                </Link>
                <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-red-400/80 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                >
                    <LogOut size={18} />
                    <span className="font-medium text-sm">Se déconnecter</span>
                </button>
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
