'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    CreditCard,
    LogOut,
    Menu,
    X,
    ChevronRight,
    GraduationCap,
    BookOpen,
    Beaker,
    FileText,
    LayoutDashboard,
    Users,
    ClipboardList,
    Settings,
    Home,
    Receipt,
    Send,
    Store,
    Tablet,
    BarChart,
    ChevronDown,
    User,
    Shield
} from 'lucide-react';
import { UserMenu } from './UserMenu';
import { useState, useEffect, useRef } from 'react';
import { UserRole } from '@shared/types/user';
import { normalizeRole } from '@shared/utils/roleUtils';

interface NavLink {
    name: string;
    href: string;
    icon: React.ComponentType<{ className?: string; size?: number }>;
}

// Navigation par rôle
const roleNavLinks: Record<string, NavLink[]> = {
    [UserRole.ETUDIANT]: [
        { name: 'Mon Parcours', href: '/student', icon: GraduationCap },
        { name: 'Ateliers', href: '/workshops', icon: BookOpen },
        { name: 'Lab', href: '/lab', icon: Beaker },
        { name: 'Documentation', href: '/documentation', icon: FileText },
    ],
    [UserRole.FORMATEUR]: [
        { name: 'Dashboard', href: '/instructor', icon: LayoutDashboard },
        { name: 'Étudiants', href: '/instructor/students', icon: Users },
        { name: 'Exercices', href: '/instructor/exercises', icon: ClipboardList },
        { name: 'Analytics', href: '/instructor/analytics', icon: BarChart },
        { name: 'Lab Control', href: '/instructor/lab-control', icon: Settings },
    ],
    [UserRole.CLIENT]: [
        { name: 'Dashboard', href: '/client', icon: Home },
        { name: 'Mes Cartes', href: '/client/cards', icon: CreditCard },
        { name: 'Transactions', href: '/client/transactions', icon: Receipt },
        { name: 'Payer', href: '/client/pay', icon: Send },
    ],
    [UserRole.MARCHAND]: [
        { name: 'Dashboard', href: '/merchant', icon: Store },
        { name: 'Transactions', href: '/merchant/transactions', icon: Receipt },
        { name: 'Terminal POS', href: '/merchant/pos', icon: Tablet },
        { name: 'Rapports', href: '/merchant/reports', icon: BarChart },
    ],
};

// Couleurs par rôle
const roleColors: Record<string, { bg: string; text: string; border: string; badge: string }> = {
    [UserRole.ETUDIANT]: {
        bg: 'from-emerald-500 to-green-600',
        text: 'text-emerald-400',
        border: 'border-emerald-500/30',
        badge: 'bg-emerald-500/20 text-emerald-400'
    },
    [UserRole.FORMATEUR]: {
        bg: 'from-blue-500 to-indigo-600',
        text: 'text-blue-400',
        border: 'border-blue-500/30',
        badge: 'bg-blue-500/20 text-blue-400'
    },
    [UserRole.CLIENT]: {
        bg: 'from-amber-500 to-orange-600',
        text: 'text-amber-400',
        border: 'border-amber-500/30',
        badge: 'bg-amber-500/20 text-amber-400'
    },
    [UserRole.MARCHAND]: {
        bg: 'from-purple-500 to-violet-600',
        text: 'text-purple-400',
        border: 'border-purple-500/30',
        badge: 'bg-purple-500/20 text-purple-400'
    },
};

// Labels français des rôles
const roleLabels: Record<string, string> = {
    [UserRole.ETUDIANT]: 'Étudiant',
    [UserRole.FORMATEUR]: 'Formateur',
    [UserRole.CLIENT]: 'Client',
    [UserRole.MARCHAND]: 'Marchand',
};

// Icônes des rôles
const roleIcons: Record<string, React.ComponentType<{ className?: string; size?: number }>> = {
    [UserRole.ETUDIANT]: GraduationCap,
    [UserRole.FORMATEUR]: Shield,
    [UserRole.CLIENT]: User,
    [UserRole.MARCHAND]: Store,
};

export function Navbar() {
    const pathname = usePathname();
    const [isScrolled, setIsScrolled] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    const [user, setUser] = useState<any>(null);
    const [role, setRole] = useState<UserRole | null>(null);
    const userMenuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleScroll = () => setIsScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll);

        const storedUser = localStorage.getItem('user');
        const storedRoleStr = localStorage.getItem('role');
        if (storedUser) setUser(JSON.parse(storedUser));
        if (storedRoleStr) {
            const normalized = normalizeRole(storedRoleStr);
            setRole(normalized);
            // Sync normalized role back to localStorage if it was legacy
            if (normalized !== storedRoleStr) {
                localStorage.setItem('role', normalized);
            }
        }

        // Fermer le menu utilisateur quand on clique ailleurs
        const handleClickOutside = (event: MouseEvent) => {
            if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
                setIsUserMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);

        return () => {
            window.removeEventListener('scroll', handleScroll);
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // Pages d'auth - pas de navbar
    const isAuthPage = pathname === '/login' || pathname === '/register';
    if (isAuthPage) return null;

    const handleLogout = () => {
        localStorage.clear();
        document.cookie = 'token=; path=/; max-age=0';
        window.location.href = '/login';
    };

    // Liens de navigation selon le rôle
    const normalizedRole = normalizeRole(role);
    const navLinks = normalizedRole && roleNavLinks[normalizedRole] ? roleNavLinks[normalizedRole] : [
        { name: 'Documentation', href: '/documentation', icon: FileText },
        { name: 'Lab', href: '/lab', icon: Beaker },
        { name: 'Workshops', href: '/workshops', icon: BookOpen },
    ];

    const currentColors = normalizedRole && roleColors[normalizedRole] ? roleColors[normalizedRole] : roleColors[UserRole.ETUDIANT];
    const RoleIcon = normalizedRole && roleIcons[normalizedRole] ? roleIcons[normalizedRole] : User;

    return (
        <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled ? 'backdrop-blur-xl bg-slate-900/80 border-b border-white/10 py-3' : 'bg-transparent py-5'}`}>
            <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
                {/* Logo */}
                <Link href={role ? (role === UserRole.ETUDIANT ? '/student' : role === UserRole.FORMATEUR ? '/instructor' : role === UserRole.CLIENT ? '/client' : '/merchant') : '/'} className="flex items-center gap-3 group">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${currentColors.bg} flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform`}>
                        <CreditCard className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent italic tracking-tight">
                        PMP
                    </span>
                </Link>

                {/* Desktop Nav */}
                <div className="hidden md:flex items-center gap-1">
                    {navLinks.map((link) => {
                        const Icon = link.icon;
                        const isActive = pathname === link.href || pathname.startsWith(link.href + '/');
                        return (
                            <Link
                                key={link.href}
                                href={link.href}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${isActive
                                    ? `${currentColors.badge}`
                                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                                    }`}
                            >
                                <Icon size={16} />
                                {link.name}
                            </Link>
                        );
                    })}
                </div>

                {/* Auth / Profile */}
                <div className="hidden md:flex items-center gap-4">
                    {user && role ? (
                        <UserMenu
                            user={user}
                            role={role}
                            colors={currentColors}
                            roleLabels={roleLabels}
                        />
                    ) : (
                        <Link
                            href="/login"
                            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-black uppercase tracking-widest rounded-xl transition shadow-lg shadow-blue-500/30 active:scale-95"
                        >
                            Connexion
                        </Link>
                    )}
                </div>

                {/* Mobile Menu Toggle */}
                <button className="md:hidden text-white" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
                    {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            </div>

            {/* Mobile Menu */}
            {isMobileMenuOpen && (
                <div className="md:hidden absolute top-full left-0 right-0 bg-slate-900 border-b border-white/10 p-6 animate-in slide-in-from-top duration-300">
                    <div className="flex flex-col gap-2">
                        {/* User Info Mobile */}
                        {user && role && (
                            <div className={`p-4 rounded-xl bg-slate-800/50 border ${currentColors.border} mb-4`}>
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${currentColors.bg} flex items-center justify-center`}>
                                        <RoleIcon size={20} className="text-white" />
                                    </div>
                                    <div>
                                        <div className="text-sm font-medium text-white">
                                            {user.firstName} {user.lastName}
                                        </div>
                                        <div className={`text-xs ${currentColors.text}`}>
                                            {roleLabels[role]}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Nav Links Mobile */}
                        {navLinks.map((link) => {
                            const Icon = link.icon;
                            const isActive = pathname === link.href || pathname.startsWith(link.href + '/');
                            return (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${isActive
                                        ? `${currentColors.badge}`
                                        : 'text-slate-300 hover:bg-white/5'
                                        }`}
                                >
                                    <Icon size={20} />
                                    <span className="font-medium">{link.name}</span>
                                </Link>
                            );
                        })}

                        {/* Logout/Login Mobile */}
                        <div className="pt-4 mt-4 border-t border-white/5">
                            {user ? (
                                <button
                                    onClick={handleLogout}
                                    className="w-full flex items-center justify-center gap-2 p-3 bg-red-500/10 text-red-400 rounded-xl font-medium"
                                >
                                    <LogOut size={18} />
                                    Se déconnecter
                                </button>
                            ) : (
                                <Link
                                    href="/login"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className="w-full flex items-center justify-center gap-2 p-3 bg-blue-600 text-white rounded-xl font-medium"
                                >
                                    Connexion
                                    <ChevronRight size={18} />
                                </Link>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </nav>
    );
}
