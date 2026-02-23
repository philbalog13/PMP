'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
    Calculator,
    GraduationCap,
    Key,
    LayoutDashboard,
    Server,
    Settings,
    ShieldAlert,
    Zap
} from 'lucide-react';

const menuItems = [
    { href: '/', label: 'Overview', icon: LayoutDashboard },
    { href: '/keys', label: 'Key Management', icon: Key },
    { href: '/operations', label: 'Operations', icon: Calculator },
    { href: '/security', label: 'Security & Audit', icon: ShieldAlert },
    { href: '/simulation', label: 'Hardware Sim', icon: Server },
    { href: '/config', label: 'Configuration', icon: Settings },
    { href: '/learn', label: 'Academy', icon: GraduationCap },
];

export default function Sidebar() {
    const pathname = usePathname();

    return (
        <aside className="hidden lg:flex w-64 bg-slate-900 border-r border-white/5 flex-col h-screen fixed left-0 top-0 z-50">
            <div className="h-16 flex items-center px-6 border-b border-white/5">
                <div className="flex items-center gap-3">
                    <Image src="/monetic-logo.svg" alt="MoneTIC Logo" width={34} height={34} />
                    <div>
                        <span className="font-heading font-bold text-base italic tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">MoneTIC</span>
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-green-400 leading-none mt-0.5">HSM Admin</p>
                    </div>
                </div>
            </div>

            <nav className="flex-1 p-4 space-y-1 overflow-y-auto custom-scrollbar">
                <div className="px-3 mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Main Module
                </div>

                {menuItems.map((item) => {
                    const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(`${item.href}/`));
                    const Icon = item.icon;

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${isActive
                                ? 'bg-green-500/10 text-green-500 border border-green-500/20'
                                : 'text-slate-400 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            <Icon size={18} />
                            {item.label}
                        </Link>
                    );
                })}

                <div className="mt-8 px-3 mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Hardware Status
                </div>
                <div className="px-3 py-3 rounded-lg bg-slate-950/50 border border-white/5 space-y-3">
                    <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400">LMK Status</span>
                        <span className="text-green-500 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                            Loaded
                        </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400">Tamper</span>
                        <span className="text-green-500">Secure</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400">Temp</span>
                        <span className="text-slate-300">42C</span>
                    </div>
                </div>
            </nav>

            <div className="p-4 border-t border-white/5 bg-slate-950/30">
                <a
                    href={`${process.env.NEXT_PUBLIC_PORTAL_URL || 'http://localhost:3000'}/`}
                    className="flex items-center gap-3 mb-4 text-slate-400 hover:text-white transition-colors"
                >
                    <LayoutDashboard size={16} />
                    <span className="text-sm font-medium">Retour Portail</span>
                </a>
                <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                    <div className="text-xs">
                        <div className="text-white font-medium">Online</div>
                        <div className="text-slate-500">Uptime: 14d 2h 12m</div>
                    </div>
                </div>
            </div>
        </aside>
    );
}
