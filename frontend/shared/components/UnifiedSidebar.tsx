'use client';

import React, { ComponentType } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types/user';
import {
    Home as HomeIcon,
    CreditCard as CreditCardIcon,
    ShoppingBag as ShoppingBagIcon,
    BarChart3 as ChartBarIcon,
    GraduationCap as AcademicCapIcon,
    Beaker as BeakerIcon,
    ShieldCheck as ShieldCheckIcon,
    Monitor as ComputerDesktopIcon,
    Users as UsersIcon,
    Settings as Cog6ToothIcon,
    LogOut as ArrowRightOnRectangleIcon,
    Trophy as TrophyIcon,
    FileText as DocumentTextIcon,
    ClipboardList as ClipboardDocumentListIcon,
} from 'lucide-react';

interface MenuItem {
    label: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
    description?: string;
    external?: boolean;
}

interface RoleMenus {
    [key: string]: MenuItem[];
}

/**
 * UnifiedSidebar Component
 * Role-based navigation sidebar for the entire PMP platform
 */
export default function UnifiedSidebar() {
    const { user, isAuthenticated, logout, hasRole } = useAuth();
    const pathname = usePathname();

    // Menu configurations by role
    const roleMenus: RoleMenus = {
        [UserRole.CLIENT]: [
            {
                label: 'Accueil',
                href: 'http://localhost:3001/demo',
                icon: HomeIcon,
                description: 'Dashboard client',
                external: true,
            },
            {
                label: 'Mes Cartes',
                href: 'http://localhost:3006',
                icon: CreditCardIcon,
                description: 'Gestion des cartes',
                external: true,
            },
            {
                label: 'Simuler Paiement',
                href: 'http://localhost:3000',
                icon: ShoppingBagIcon,
                description: 'Terminal POS',
                external: true,
            },
            {
                label: 'Monitoring',
                href: 'http://localhost:3082',
                icon: ChartBarIcon,
                description: 'Vue lecture seule',
                external: true,
            },
            {
                label: 'Paramètres',
                href: '/settings',
                icon: Cog6ToothIcon,
            },
        ],
        [UserRole.MARCHAND]: [
            {
                label: 'Accueil',
                href: 'http://localhost:3001/analyze',
                icon: HomeIcon,
                description: 'Dashboard marchand',
                external: true,
            },
            {
                label: 'Logs & Analyses',
                href: 'http://localhost:3001/analyze',
                icon: ClipboardDocumentListIcon,
                description: 'Historique transactions',
                external: true,
            },
            {
                label: 'Terminal POS',
                href: 'http://localhost:3000',
                icon: ComputerDesktopIcon,
                description: 'TPE Web',
                external: true,
            },
            {
                label: 'Monitoring Temps Réel',
                href: 'http://localhost:3082',
                icon: ChartBarIcon,
                description: 'Dashboard live',
                external: true,
            },
            {
                label: 'Certificats',
                href: 'http://localhost:3081/certificates',
                icon: ShieldCheckIcon,
                description: 'HSM - Certs uniquement',
                external: true,
            },
            {
                label: 'Configuration',
                href: '/config',
                icon: Cog6ToothIcon,
            },
        ],
        [UserRole.ETUDIANT]: [
            {
                label: 'Accueil',
                href: 'http://localhost:3001/student',
                icon: HomeIcon,
                description: 'Dashboard étudiant',
                external: true,
            },
            {
                label: 'Parcours d\'Apprentissage',
                href: 'http://localhost:3001/student',
                icon: AcademicCapIcon,
                description: 'Modules pédagogiques',
                external: true,
            },
            {
                label: 'Laboratoire TPE',
                href: 'http://localhost:3000',
                icon: BeakerIcon,
                description: 'Exercices pratiques',
                external: true,
            },
            {
                label: 'Gestion Cartes Test',
                href: 'http://localhost:3006',
                icon: CreditCardIcon,
                description: 'Cartes de test',
                external: true,
            },
            {
                label: 'Lab Cryptographie',
                href: 'http://localhost:3081',
                icon: ShieldCheckIcon,
                description: 'HSM Simulator',
                external: true,
            },
            {
                label: 'Observation',
                href: 'http://localhost:3082',
                icon: ChartBarIcon,
                description: 'Monitoring',
                external: true,
            },
            {
                label: 'Mes Badges',
                href: '/badges',
                icon: TrophyIcon,
            },
            {
                label: 'Profil',
                href: '/profile',
                icon: Cog6ToothIcon,
            },
        ],
        [UserRole.FORMATEUR]: [
            {
                label: 'Hub Formateur',
                href: 'http://localhost:3001/instructor',
                icon: HomeIcon,
                description: 'Dashboard principal',
                external: true,
            },
            {
                label: 'Suivi Étudiants',
                href: 'http://localhost:3001/instructor/students',
                icon: UsersIcon,
                description: 'Progression cohorte',
                external: true,
            },
            {
                label: 'Gestion Exercices',
                href: 'http://localhost:3001/instructor/exercises',
                icon: DocumentTextIcon,
                description: 'Créer et modifier',
                external: true,
            },
            {
                label: 'Contrôle Lab',
                href: 'http://localhost:3001/instructor/lab-control',
                icon: BeakerIcon,
                description: 'Injection conditions',
                external: true,
            },
            {
                label: 'TPE (Tous accès)',
                href: 'http://localhost:3000',
                icon: ComputerDesktopIcon,
                description: 'Terminal complet',
                external: true,
            },
            {
                label: 'Cards (Admin)',
                href: 'http://localhost:3006',
                icon: CreditCardIcon,
                description: 'Gestion globale',
                external: true,
            },
            {
                label: 'HSM (Admin)',
                href: 'http://localhost:3081',
                icon: ShieldCheckIcon,
                description: 'Administration HSM',
                external: true,
            },
            {
                label: 'Monitoring Complet',
                href: 'http://localhost:3082',
                icon: ChartBarIcon,
                description: 'Vue administrateur',
                external: true,
            },
            {
                label: 'Configuration Système',
                href: '/system-config',
                icon: Cog6ToothIcon,
            },
        ],
    };

    // Get current user's menu
    const currentMenu = user ? roleMenus[user.role] || [] : [];

    // Check if a link is active
    const isActive = (href: string) => {
        if (href.startsWith('http')) {
            // For external links, check if current origin + pathname matches
            try {
                const url = new URL(href);
                return window.location.origin === url.origin && pathname === url.pathname;
            } catch {
                return false;
            }
        }
        return pathname === href;
    };

    // Get role badge color
    const getRoleBadgeColor = (role: UserRole) => {
        const colors = {
            [UserRole.CLIENT]: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
            [UserRole.MARCHAND]: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
            [UserRole.ETUDIANT]: 'bg-green-500/20 text-green-400 border-green-500/30',
            [UserRole.FORMATEUR]: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
        };
        return colors[role] || 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    };

    // Get role display name
    const getRoleDisplayName = (role: UserRole) => {
        const names = {
            [UserRole.CLIENT]: 'Client',
            [UserRole.MARCHAND]: 'Marchand',
            [UserRole.ETUDIANT]: 'Étudiant',
            [UserRole.FORMATEUR]: 'Formateur',
        };
        return names[role] || role;
    };

    if (!isAuthenticated || !user) {
        return null;
    }

    return (
        <aside className="fixed left-0 top-0 h-screen w-64 bg-slate-900/60 backdrop-blur-xl border-r border-white/10 overflow-y-auto z-50">
            {/* Header with user info */}
            <div className="p-6 border-b border-white/10">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
                        {user.email?.[0]?.toUpperCase() || 'U'}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-200 truncate">
                            {user.name || user.email}
                        </p>
                        <div
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border mt-1 ${getRoleBadgeColor(
                                user.role
                            )}`}
                        >
                            {getRoleDisplayName(user.role)}
                        </div>
                    </div>
                </div>
                <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    PMP Platform
                </h2>
            </div>

            {/* Navigation Menu */}
            <nav className="p-4">
                <ul className="space-y-1">
                    {currentMenu.map((item) => {
                        const Icon = item.icon;
                        const active = isActive(item.href);

                        return (
                            <li key={item.href}>
                                {item.external ? (
                                    <a
                                        href={item.href}
                                        target="_self"
                                        className={`
                                            flex items-center gap-3 px-3 py-2.5 rounded-lg
                                            transition-all duration-200 group
                                            ${active
                                                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                                : 'text-slate-300 hover:bg-white/5 hover:text-white border border-transparent'
                                            }
                                        `}
                                    >
                                        <Icon className="w-5 h-5 flex-shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium truncate">
                                                {item.label}
                                            </p>
                                            {item.description && (
                                                <p className="text-xs text-slate-500 truncate">
                                                    {item.description}
                                                </p>
                                            )}
                                        </div>
                                    </a>
                                ) : (
                                    <Link
                                        href={item.href}
                                        className={`
                                            flex items-center gap-3 px-3 py-2.5 rounded-lg
                                            transition-all duration-200 group
                                            ${active
                                                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                                : 'text-slate-300 hover:bg-white/5 hover:text-white border border-transparent'
                                            }
                                        `}
                                    >
                                        <Icon className="w-5 h-5 flex-shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium truncate">
                                                {item.label}
                                            </p>
                                            {item.description && (
                                                <p className="text-xs text-slate-500 truncate">
                                                    {item.description}
                                                </p>
                                            )}
                                        </div>
                                    </Link>
                                )}
                            </li>
                        );
                    })}
                </ul>
            </nav>

            {/* Logout button at bottom */}
            <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/10 bg-slate-900/60 backdrop-blur-xl">
                <button
                    onClick={logout}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg
                        text-red-400 hover:bg-red-500/10 hover:border-red-500/30
                        border border-transparent transition-all duration-200"
                >
                    <ArrowRightOnRectangleIcon className="w-5 h-5" />
                    <span className="text-sm font-medium">Déconnexion</span>
                </button>
            </div>
        </aside>
    );
}
