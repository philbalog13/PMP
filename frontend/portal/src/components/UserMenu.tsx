'use client';

import { LogOut, Settings, ChevronDown, User, Shield, Store, GraduationCap } from 'lucide-react';
import Link from 'next/link';
import { useState, useRef, useEffect } from 'react';
import { UserRole } from '@shared/types/user';
import { normalizeRole } from '@shared/utils/roleUtils';

type UserMenuUser = {
    firstName: string;
    lastName: string;
    email: string;
};

interface UserMenuProps {
    user: UserMenuUser;
    role: UserRole;
    colors: { bg: string; text: string; border: string; badge: string };
    roleLabels: Record<string, string>;
    onLogout: () => void;
}

const roleIcons: Record<string, React.ComponentType<{ className?: string; size?: number }>> = {
    [UserRole.ETUDIANT]: GraduationCap,
    [UserRole.FORMATEUR]: Shield,
    [UserRole.CLIENT]: User,
    [UserRole.MARCHAND]: Store,
};

export function UserMenu({ user, role, colors, roleLabels, onLogout }: UserMenuProps) {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const normalizedRole = normalizeRole(role);
    const RoleIcon = roleIcons[normalizedRole] || User;

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLogout = () => {
        setIsOpen(false);
        onLogout();
    };

    return (
        <div className="relative" ref={menuRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center gap-3 px-4 py-2 rounded-xl bg-slate-800/50 border ${colors.border} hover:bg-slate-800 transition-all`}
            >
                <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${colors.bg} flex items-center justify-center`}>
                    <RoleIcon size={16} className="text-white" />
                </div>
                <div className="text-left hidden lg:block">
                    <div className="text-sm font-medium text-white">
                        {user.firstName} {user.lastName}
                    </div>
                </div>
                <ChevronDown size={16} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* User Dropdown Menu */}
            {isOpen && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-slate-800 border border-white/10 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 z-50">
                    <div className="p-4 border-b border-white/10">
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${colors.bg} flex items-center justify-center`}>
                                <RoleIcon size={20} className="text-white" />
                            </div>
                            <div className="overflow-hidden">
                                <div className="text-sm font-medium text-white truncate">
                                    {user.firstName} {user.lastName}
                                </div>
                                <div className="text-xs text-slate-400 truncate">{user.email}</div>
                            </div>
                        </div>
                        <div className={`mt-3 px-2 py-1 rounded-md ${colors.badge} text-xs font-medium inline-flex items-center gap-1`}>
                            <RoleIcon size={12} />
                            {roleLabels[role]}
                        </div>
                    </div>

                    <div className="p-2">
                        {normalizedRole === UserRole.FORMATEUR && (
                            <>
                                <Link
                                    href="/instructor/settings"
                                    onClick={() => setIsOpen(false)}
                                    className="flex items-center gap-3 px-3 py-2 text-sm text-slate-300 hover:bg-white/5 rounded-lg transition-colors"
                                >
                                    <Settings size={16} />
                                    Paramètres
                                </Link>
                                <div className="my-2 border-t border-white/5"></div>
                            </>
                        )}
                        <button
                            onClick={handleLogout}
                            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                        >
                            <LogOut size={16} />
                            Se déconnecter
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
