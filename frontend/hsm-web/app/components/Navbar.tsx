'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Key, FileText, AlertTriangle, Shield } from 'lucide-react';

export default function Navbar() {
    const pathname = usePathname();

    const links = [
        { href: '/', label: 'Dashboard', icon: Home },
        { href: '/keys', label: 'Keys', icon: Key },
        { href: '/logs', label: 'Logs', icon: FileText },
        { href: '/vuln', label: 'Vulnerabilities', icon: AlertTriangle, danger: true },
    ];

    return (
        <nav className="bg-slate-900/80 backdrop-blur-xl border-b border-white/5 sticky top-0 z-50">
            <div className="container mx-auto flex justify-between items-center px-6 py-4">
                <Link href="/" className="flex items-center gap-3 group">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-green-500/30 group-hover:shadow-green-500/50 transition-shadow">
                        <Shield size={20} className="text-white" />
                    </div>
                    <span className="text-xl font-bold bg-gradient-to-r from-green-400 to-emerald-500 bg-clip-text text-transparent font-heading">
                        HSM Console
                    </span>
                </Link>
                <div className="flex gap-2">
                    {links.map((link) => {
                        const isActive = pathname === link.href;
                        return (
                            <Link
                                key={link.href}
                                href={link.href}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${isActive
                                        ? 'bg-white/10 text-white'
                                        : link.danger
                                            ? 'text-red-400 hover:bg-red-500/10 hover:text-red-300'
                                            : 'text-slate-400 hover:bg-white/5 hover:text-white'
                                    }`}
                            >
                                <link.icon size={16} />
                                {link.label}
                            </Link>
                        );
                    })}
                </div>
            </div>
        </nav>
    );
}
