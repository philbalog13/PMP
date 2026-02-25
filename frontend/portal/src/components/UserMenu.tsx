'use client';

import {
    Activity,
    BarChart3,
    Beaker,
    BookOpen,
    ChevronDown,
    ClipboardList,
    ExternalLink,
    GraduationCap,
    Home,
    LogOut,
    PlusCircle,
    Receipt,
    Settings,
    Shield,
    ShieldCheck,
    Store,
    User,
    Users,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { APP_URLS, getRoleRedirectUrl } from '@shared/lib/app-urls';
import { UserRole } from '@shared/types/user';
import { normalizeRole } from '@shared/utils/roleUtils';

type UserMenuUser = {
    firstName?: string;
    lastName?: string;
    name?: string;
    email?: string;
};

interface UserMenuProps {
    user: UserMenuUser;
    role: UserRole;
    colors: { bg: string; text: string; border: string; badge: string };
    roleLabels: Record<string, string>;
    onLogout: () => void;
}

type MenuItem = {
    label: string;
    href: string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
    description?: string;
};

type MenuSection = {
    title: string;
    items: MenuItem[];
};

const roleIcons: Record<string, React.ComponentType<{ className?: string; size?: number }>> = {
    [UserRole.ETUDIANT]: GraduationCap,
    [UserRole.FORMATEUR]: Shield,
    [UserRole.CLIENT]: User,
    [UserRole.MARCHAND]: Store,
};

const roleMenuSections: Record<UserRole, MenuSection[]> = {
    [UserRole.ETUDIANT]: [
        {
            title: 'Apprentissage',
            items: [
                { label: 'Mon espace', href: '/student', icon: Home, description: 'Vue globale et objectifs' },
                { label: 'Cursus', href: '/student/cursus', icon: BookOpen, description: 'Modules et progression' },
                { label: 'Quiz', href: '/student/quizzes', icon: ClipboardList, description: 'Evaluation continue' },
                { label: 'Badges', href: '/student/badges', icon: Shield, description: 'Competences validees' },
            ],
        },
        {
            title: 'Pratique',
            items: [
                { label: 'Lab Attaque', href: '/student/ctf', icon: Beaker, description: 'Challenges offensifs' },
                { label: 'Lab Defense', href: '/student/defense', icon: ShieldCheck, description: 'Detection et correction' },
                { label: 'Transactions', href: '/student/transactions', icon: Receipt, description: 'Trajets ISO 8583' },
            ],
        },
    ],
    [UserRole.FORMATEUR]: [
        {
            title: 'Pilotage',
            items: [
                { label: 'Mon espace', href: '/instructor', icon: Home, description: 'Vue generale formateur' },
                { label: 'Analytics', href: '/instructor/analytics', icon: Activity, description: 'Suivi pedagogique global' },
                { label: 'Lab Control', href: '/instructor/lab-control', icon: Settings, description: 'Orchestration des labs' },
            ],
        },
        {
            title: 'Gestion etudiants',
            items: [
                { label: 'Etudiants', href: '/instructor/students', icon: Users, description: 'Cohortes et progression' },
                { label: 'Ajouter un etudiant', href: '/instructor/students/add', icon: PlusCircle, description: 'Creation rapide profil' },
                { label: 'Exercices', href: '/instructor/exercises', icon: ClipboardList, description: 'Catalogue pedagogique' },
                { label: 'Creer exercice', href: '/instructor/exercises/create', icon: PlusCircle, description: 'Nouveau scenario' },
                { label: 'CTF', href: '/instructor/ctf', icon: Shield, description: 'Challenges et leaderboard' },
            ],
        },
    ],
    [UserRole.CLIENT]: [
        {
            title: 'Compte',
            items: [
                { label: 'Mon espace', href: APP_URLS.userCards, icon: Home, description: 'Vue client principale' },
                { label: 'Mon profil', href: `${APP_URLS.userCards}/account`, icon: User, description: 'Infos personnelles' },
                { label: 'Parametres', href: `${APP_URLS.userCards}/settings`, icon: Settings, description: 'Preferences compte' },
                { label: 'Securite', href: `${APP_URLS.userCards}/security`, icon: ShieldCheck, description: 'Controles et protections' },
            ],
        },
        {
            title: 'Paiement',
            items: [
                { label: 'Mes cartes', href: `${APP_URLS.userCards}/cards`, icon: Store, description: 'Cartes virtuelles' },
                { label: 'Transactions', href: `${APP_URLS.userCards}/transactions`, icon: Receipt, description: 'Historique detaille' },
                { label: 'Payer', href: `${APP_URLS.userCards}/pay`, icon: BarChart3, description: 'Simulation paiement' },
            ],
        },
    ],
    [UserRole.MARCHAND]: [
        {
            title: 'Activite marchande',
            items: [
                { label: 'Mon espace', href: '/merchant', icon: Home, description: 'Synthese marchand' },
                { label: 'Transactions', href: '/merchant/transactions', icon: Receipt, description: 'Flux encaissements' },
                { label: 'Terminal POS', href: '/merchant/pos', icon: Store, description: 'Simulation terminal' },
                { label: 'Rapports', href: '/merchant/reports', icon: BarChart3, description: 'Analyse performances' },
            ],
        },
        {
            title: 'Parametrage',
            items: [
                { label: 'Profil terminal', href: `${APP_URLS.tpe}/account`, icon: User, description: 'Identite terminal' },
                { label: 'Parametres terminal', href: `${APP_URLS.tpe}/settings`, icon: Settings, description: 'Regles et securite' },
            ],
        },
    ],
};

export function UserMenu({ user, role, colors, roleLabels, onLogout }: UserMenuProps) {
    const pathname = usePathname();
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const menuId = useId();
    const menuButtonId = `${menuId}-button`;
    const menuPanelId = `${menuId}-panel`;

    const normalizedRole = normalizeRole(role);
    const RoleIcon = roleIcons[normalizedRole] || User;
    const roleLabel = roleLabels[normalizedRole] || 'Utilisateur';

    const sections = useMemo<MenuSection[]>(() => {
        if (normalizedRole && roleMenuSections[normalizedRole]) {
            return roleMenuSections[normalizedRole];
        }
        return [
            {
                title: 'Compte',
                items: [{ label: 'Mon espace', href: getRoleRedirectUrl(normalizedRole), icon: Home }],
            },
        ];
    }, [normalizedRole]);

    const displayName = useMemo(() => {
        const first = user.firstName?.trim() || '';
        const last = user.lastName?.trim() || '';
        const full = `${first} ${last}`.trim();
        if (full) return full;
        if (user.name?.trim()) return user.name.trim();
        return 'Utilisateur';
    }, [user.firstName, user.lastName, user.name]);

    const initials = useMemo(() => {
        const chars = displayName
            .split(' ')
            .filter(Boolean)
            .slice(0, 2)
            .map((chunk) => chunk[0]?.toUpperCase() || '');
        return chars.join('') || 'U';
    }, [displayName]);

    const closeMenu = useCallback(() => setIsOpen(false), []);
    const toggleMenu = useCallback(() => setIsOpen((prev) => !prev), []);

    useEffect(() => {
        if (!isOpen) return;

        const handleClickOutside = (event: MouseEvent | PointerEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setIsOpen(false);
            }
        };

        document.addEventListener('pointerdown', handleClickOutside);
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('pointerdown', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen]);

    useEffect(() => {
        setIsOpen(false);
    }, [pathname]);

    const renderNavItem = (item: MenuItem) => {
        const Icon = item.icon;
        const isExternal = item.href.startsWith('http://') || item.href.startsWith('https://');
        const itemClass =
            'group flex items-start justify-between gap-3 px-3 py-2.5 text-sm text-slate-300 hover:bg-white/5 rounded-lg transition-colors';

        const content = (
            <>
                <span className="flex items-start gap-3 min-w-0">
                    <span className="mt-0.5 text-slate-400 group-hover:text-white transition-colors">
                        <Icon size={16} />
                    </span>
                    <span className="min-w-0">
                        <span className="block font-medium text-white">{item.label}</span>
                        {item.description && (
                            <span className="block text-xs text-slate-500 truncate">{item.description}</span>
                        )}
                    </span>
                </span>
                {isExternal && <ExternalLink size={14} className="text-slate-500 mt-0.5" />}
            </>
        );

        if (isExternal) {
            return (
                <a href={item.href} onClick={closeMenu} className={itemClass} role="menuitem">
                    {content}
                </a>
            );
        }

        return (
            <Link href={item.href} onClick={closeMenu} className={itemClass} role="menuitem">
                {content}
            </Link>
        );
    };

    const handleLogout = () => {
        setIsOpen(false);
        onLogout();
    };

    return (
        <div className="relative" ref={menuRef}>
            <button
                id={menuButtonId}
                type="button"
                onClick={toggleMenu}
                aria-haspopup="menu"
                aria-expanded={isOpen}
                aria-controls={menuPanelId}
                className={`flex items-center gap-3 px-4 py-2 rounded-xl bg-slate-800/50 border ${colors.border} hover:bg-slate-800 transition-all focus:outline-none focus:ring-2 focus:ring-offset-0 focus:ring-white/30`}
            >
                <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${colors.bg} flex items-center justify-center`}>
                    <RoleIcon size={16} className="text-white" />
                </div>
                <div className="text-left hidden lg:block">
                    <div className="text-sm font-medium text-white">{displayName}</div>
                </div>
                <ChevronDown size={16} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div
                    id={menuPanelId}
                    role="menu"
                    aria-labelledby={menuButtonId}
                    className="absolute right-0 top-full mt-2 w-80 bg-slate-800 border border-white/10 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 z-50"
                >
                    <div className="p-4 border-b border-white/10">
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${colors.bg} flex items-center justify-center`}>
                                <span className="text-sm font-bold text-white">{initials}</span>
                            </div>
                            <div className="overflow-hidden">
                                <div className="text-sm font-medium text-white truncate">{displayName}</div>
                                <div className="text-xs text-slate-400 truncate">{user.email || 'email@non-renseigne'}</div>
                                <div className={`mt-2 px-2 py-1 rounded-md ${colors.badge} text-xs font-medium inline-flex items-center gap-1`}>
                                    <RoleIcon size={12} />
                                    {roleLabel}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="p-2 max-h-[55vh] overflow-y-auto">
                        {sections.map((section) => (
                            <div key={section.title} className="mb-3 last:mb-1">
                                <div className="px-2 py-1 text-[10px] uppercase tracking-widest text-slate-500 font-semibold">
                                    {section.title}
                                </div>
                                <div className="space-y-1">
                                    {section.items.map((item) => (
                                        <div key={`${section.title}-${item.label}`}>{renderNavItem(item)}</div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="p-2 border-t border-white/5">
                        <button
                            type="button"
                            onClick={handleLogout}
                            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                        >
                            <LogOut size={16} />
                            Se deconnecter
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
