'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Calculator, Home, Key, Shield } from 'lucide-react';

const links = [
    { href: '/', label: 'Overview', icon: Home },
    { href: '/keys', label: 'Keys', icon: Key },
    { href: '/operations', label: 'Ops', icon: Calculator },
    { href: '/security', label: 'Security', icon: Shield },
];

export default function Navbar() {
    const pathname = usePathname();

    return (
        <nav className="bg-slate-900/90 backdrop-blur-xl border-b border-white/5 sticky top-0 z-40">
            <div className="px-4 py-3">
                <div className="flex items-center justify-between mb-3">
                    <Link href="/" className="flex items-center gap-2">
                        <Image src="/monetic-logo.svg" alt="MoneTIC Logo" width={34} height={34} />
                        <div>
                            <span className="text-base font-bold italic text-white font-heading">MoneTIC</span>
                            <p className="text-[10px] font-semibold uppercase tracking-widest text-green-400 leading-none">HSM Admin</p>
                        </div>
                    </Link>
                    <a href={`${process.env.NEXT_PUBLIC_PORTAL_URL || 'http://localhost:3000'}/`} className="text-xs text-slate-400">
                        Portail
                    </a>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1">
                    {links.map((link) => {
                        const isActive = pathname === link.href || (link.href !== '/' && pathname.startsWith(`${link.href}/`));
                        return (
                            <Link
                                key={link.href}
                                href={link.href}
                                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${isActive
                                    ? 'bg-white/10 text-white'
                                    : 'text-slate-400 hover:bg-white/5 hover:text-white'
                                    }`}
                            >
                                <link.icon size={14} />
                                {link.label}
                            </Link>
                        );
                    })}
                </div>
            </div>
        </nav>
    );
}
