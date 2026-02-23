'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    CreditCard,
    LogOut,
    Menu,
    X,
    ChevronRight,
    ChevronDown,
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
    Store,
    Tablet,
    BarChart,
    User,
    Shield,
    Zap,
    ShieldCheck
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { UserMenu } from './UserMenu';
import { useAuth } from '@shared/context/AuthContext';
import { UserRole } from '@shared/types/user';
import { normalizeRole } from '@shared/utils/roleUtils';
import { APP_URLS, getRoleRedirectUrl } from '@shared/lib/app-urls';

interface NavDropdownItem {
    name: string;
    href: string;
    icon: React.ComponentType<{ className?: string; size?: number }>;
}

interface NavLink {
    name: string;
    href: string;
    icon: React.ComponentType<{ className?: string; size?: number }>;
    dropdown?: NavDropdownItem[];
}

// Navigation par role
const roleNavLinks: Record<string, NavLink[]> = {
    [UserRole.ETUDIANT]: [
        { name: 'Mon Parcours', href: '/student', icon: GraduationCap },
        { name: 'Cursus', href: '/student/cursus', icon: BookOpen },
        {
            name: 'Laboratoires', href: '#', icon: Beaker,
            dropdown: [
                { name: 'Attaques', href: '/student/ctf', icon: Zap },
                { name: 'Défense', href: '/student/defense', icon: ShieldCheck },
            ]
        },
        { name: 'Quiz', href: '/student/quizzes', icon: ClipboardList },
        { name: 'Badges', href: '/student/badges', icon: Shield },
        { name: 'Transactions', href: '/student/transactions', icon: Receipt },
    ],
    [UserRole.FORMATEUR]: [
        { name: 'Dashboard', href: '/instructor', icon: LayoutDashboard },
        { name: 'CTF', href: '/instructor/ctf', icon: Shield },
        { name: 'Étudiants', href: '/instructor/students', icon: Users },
        { name: 'Exercices', href: '/instructor/exercises', icon: ClipboardList },
        { name: 'Analytics', href: '/instructor/analytics', icon: BarChart },
        { name: 'Lab Control', href: '/instructor/lab-control', icon: Settings },
    ],
    [UserRole.CLIENT]: [
        { name: 'Dashboard', href: APP_URLS.userCards, icon: Home },
        { name: 'Payer', href: `${APP_URLS.userCards}/pay`, icon: Store },
        { name: 'Mes Cartes', href: `${APP_URLS.userCards}/cards`, icon: CreditCard },
        { name: 'Transactions', href: `${APP_URLS.userCards}/transactions`, icon: Receipt },
        { name: 'Sécurité', href: `${APP_URLS.userCards}/security`, icon: Shield },
    ],
    [UserRole.MARCHAND]: [
        { name: 'Dashboard', href: '/merchant', icon: Store },
        { name: 'Transactions', href: '/merchant/transactions', icon: Receipt },
        { name: 'Terminal POS', href: '/merchant/pos', icon: Tablet },
        { name: 'Rapports', href: '/merchant/reports', icon: BarChart },
    ],
};

// Couleurs par role
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

// Labels francais des roles
const roleLabels: Record<string, string> = {
    [UserRole.ETUDIANT]: 'Étudiant',
    [UserRole.FORMATEUR]: 'Formateur',
    [UserRole.CLIENT]: 'Client',
    [UserRole.MARCHAND]: 'Marchand',
};

// Icones des roles
const roleIcons: Record<string, React.ComponentType<{ className?: string; size?: number }>> = {
    [UserRole.ETUDIANT]: GraduationCap,
    [UserRole.FORMATEUR]: Shield,
    [UserRole.CLIENT]: User,
    [UserRole.MARCHAND]: Store,
};

function getRoleHomePath(role: UserRole | null): string {
    return getRoleRedirectUrl(role);
}

export function Navbar() {
    const pathname = usePathname();
    const [isScrolled, setIsScrolled] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [openDropdown, setOpenDropdown] = useState<string | null>(null);
    const [mobileOpenDropdown, setMobileOpenDropdown] = useState<string | null>(null);
    const { user, isAuthenticated, isLoading, logout } = useAuth();

    const normalizedRole = user?.role ? normalizeRole(user.role) : null;

    useEffect(() => {
        const handleScroll = () => setIsScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Pages d'auth - pas de navbar
    const isAuthPage = pathname === '/login' || pathname === '/register' || pathname.startsWith('/auth/');
    if (isAuthPage) return null;

    const handleLogout = () => {
        logout();
        setIsMobileMenuOpen(false);
        window.location.href = '/login';
    };

    // Liens de navigation selon le role
    const navLinks = isAuthenticated && normalizedRole && roleNavLinks[normalizedRole] ? roleNavLinks[normalizedRole] : [
        { name: 'Documentation', href: '/documentation', icon: FileText },
        { name: 'Security Labs', href: '/student/ctf', icon: Beaker },
        { name: 'Cursus', href: '/student/cursus', icon: BookOpen },
    ];

    const currentColors = normalizedRole && roleColors[normalizedRole] ? roleColors[normalizedRole] : roleColors[UserRole.ETUDIANT];
    const RoleIcon = normalizedRole && roleIcons[normalizedRole] ? roleIcons[normalizedRole] : User;

    return (
        <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled ? 'backdrop-blur-xl bg-slate-900/80 border-b border-white/10 py-3' : 'bg-transparent py-5'}`}>
            <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
                {/* Logo */}
                <Link href={getRoleHomePath(normalizedRole)} className="flex items-center gap-3 group">
                    <img src="/monetic-logo.svg" alt="MoneTIC Logo" className="w-10 h-10 group-hover:scale-110 transition-transform duration-300" />
                    <span className="text-xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent italic tracking-tight">
                        MoneTIC
                    </span>
                </Link>

                {/* Desktop Nav */}
                <div className="hidden md:flex items-center gap-1">
                    {navLinks.map((link) => {
                        const Icon = link.icon;
                        const isExactDashboard = link.href === '/student' || link.href === '/instructor';
                        const isActive = link.dropdown
                            ? link.dropdown.some(d => pathname === d.href || pathname.startsWith(d.href + '/'))
                            : isExactDashboard
                                ? pathname === link.href
                                : (pathname === link.href || pathname.startsWith(link.href + '/'));

                        if (link.dropdown) {
                            return (
                                <div
                                    key={link.name}
                                    className="relative"
                                    onMouseEnter={() => setOpenDropdown(link.name)}
                                    onMouseLeave={() => setOpenDropdown(null)}
                                >
                                    <button
                                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${isActive
                                            ? `${currentColors.badge}`
                                            : 'text-slate-400 hover:text-white hover:bg-white/5'
                                            }`}
                                    >
                                        <Icon size={16} />
                                        {link.name}
                                        <ChevronDown size={13} className={`transition-transform duration-200 ${openDropdown === link.name ? 'rotate-180' : ''}`} />
                                    </button>
                                    {openDropdown === link.name && (
                                        <div className="absolute top-full left-0 z-50 pt-1">
                                            <div className="w-44 bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-xl overflow-hidden">
                                                {link.dropdown.map((item) => {
                                                    const ItemIcon = item.icon;
                                                    const itemActive = pathname === item.href || pathname.startsWith(item.href + '/');
                                                    return (
                                                        <Link
                                                            key={item.href}
                                                            href={item.href}
                                                            className={`flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium transition-colors ${itemActive
                                                                ? `${currentColors.badge}`
                                                                : 'text-slate-400 hover:text-white hover:bg-white/5'
                                                                }`}
                                                        >
                                                            <ItemIcon size={15} />
                                                            {item.name}
                                                        </Link>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        }

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
                    {isLoading ? (
                        <div className="h-10 w-28 rounded-xl bg-slate-800/40 border border-white/5" />
                    ) : isAuthenticated && user && normalizedRole ? (
                        <UserMenu
                            user={user}
                            role={normalizedRole}
                            colors={currentColors}
                            roleLabels={roleLabels}
                            onLogout={handleLogout}
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
                        {!isLoading && isAuthenticated && user && normalizedRole && (
                            <div className={`p-4 rounded-xl bg-slate-800/50 border ${currentColors.border} mb-4`}>
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${currentColors.bg} flex items-center justify-center`}>
                                        <RoleIcon size={20} className="text-white" />
                                    </div>
                                    <div>
                                        <div className="text-sm font-medium text-white">
                                            {user.firstName || user.name || 'Utilisateur'} {user.lastName || ''}
                                        </div>
                                        <div className={`text-xs ${currentColors.text}`}>
                                            {roleLabels[normalizedRole]}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Nav Links Mobile */}
                        {navLinks.map((link) => {
                            const Icon = link.icon;
                            const isExactDashboard = link.href === '/student' || link.href === '/instructor';
                            const isActive = link.dropdown
                                ? link.dropdown.some(d => pathname === d.href || pathname.startsWith(d.href + '/'))
                                : isExactDashboard
                                    ? pathname === link.href
                                    : (pathname === link.href || pathname.startsWith(link.href + '/'));

                            if (link.dropdown) {
                                const isOpen = mobileOpenDropdown === link.name;
                                return (
                                    <div key={link.name}>
                                        <button
                                            onClick={() => setMobileOpenDropdown(isOpen ? null : link.name)}
                                            className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${isActive
                                                ? `${currentColors.badge}`
                                                : 'text-slate-300 hover:bg-white/5'
                                                }`}
                                        >
                                            <Icon size={20} />
                                            <span className="font-medium flex-1 text-left">{link.name}</span>
                                            <ChevronDown size={16} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                                        </button>
                                        {isOpen && (
                                            <div className="ml-4 mt-1 flex flex-col gap-1 border-l border-white/10 pl-3">
                                                {link.dropdown.map((item) => {
                                                    const ItemIcon = item.icon;
                                                    const itemActive = pathname === item.href || pathname.startsWith(item.href + '/');
                                                    return (
                                                        <Link
                                                            key={item.href}
                                                            href={item.href}
                                                            onClick={() => { setIsMobileMenuOpen(false); setMobileOpenDropdown(null); }}
                                                            className={`flex items-center gap-3 p-2.5 rounded-lg transition-colors ${itemActive
                                                                ? `${currentColors.badge}`
                                                                : 'text-slate-400 hover:text-white hover:bg-white/5'
                                                                }`}
                                                        >
                                                            <ItemIcon size={17} />
                                                            <span className="font-medium text-sm">{item.name}</span>
                                                        </Link>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                );
                            }

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
                            {!isLoading && isAuthenticated ? (
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
