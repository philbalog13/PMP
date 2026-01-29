'use client';

import {
    LayoutDashboard,
    CreditCard,
    History,
    Settings,
    LogOut,
    PieChart
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Sidebar() {
    const pathname = usePathname();

    const menuItems = [
        { icon: LayoutDashboard, label: 'Tableau de bord', href: '/' },
        { icon: CreditCard, label: 'Mes Cartes', href: '/cards' },
        { icon: History, label: 'Transactions', href: '/transactions' },
        { icon: PieChart, label: 'Statistiques', href: '/stats' },
    ];

    return (
        <aside className="w-64 bg-slate-900/60 backdrop-blur-xl text-white h-screen fixed left-0 top-0 border-r border-white/5 hidden md:flex flex-col z-50">
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
                <Link
                    href="/settings"
                    className="flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-white transition-colors"
                >
                    <Settings size={20} />
                    <span className="font-medium">Paramètres</span>
                </Link>
            </div>
        </aside>
    );
}
