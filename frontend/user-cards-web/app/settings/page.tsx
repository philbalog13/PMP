'use client';

import GlassCard from '@shared/components/GlassCard';
import PremiumButton from '@shared/components/PremiumButton';
import { Settings, User, Bell, Palette, Globe, Moon, Sun, ChevronRight, LogOut, HelpCircle, Shield } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuth } from '@shared/context/AuthContext';

const NOTIF_KEY = 'pmp_notification_prefs';
const THEME_KEY = 'pmp_theme';

export default function SettingsPage() {
    const { logout } = useAuth();

    // Persist theme to localStorage
    const [darkMode, setDarkMode] = useState(() => {
        if (typeof window === 'undefined') return true;
        return localStorage.getItem(THEME_KEY) !== 'light';
    });

    const handleThemeChange = (dark: boolean) => {
        setDarkMode(dark);
        localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light');
    };

    // Persist notification prefs to localStorage
    const [notifications, setNotifications] = useState(() => {
        if (typeof window === 'undefined') return { email: true, push: true, sms: false };
        try {
            const stored = localStorage.getItem(NOTIF_KEY);
            return stored ? JSON.parse(stored) : { email: true, push: true, sms: false };
        } catch {
            return { email: true, push: true, sms: false };
        }
    });

    const handleNotifChange = (key: string, value: boolean) => {
        const updated = { ...notifications, [key]: value };
        setNotifications(updated);
        localStorage.setItem(NOTIF_KEY, JSON.stringify(updated));
    };

    const handleLogout = () => {
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
        window.location.replace(`${process.env.NEXT_PUBLIC_PORTAL_URL || 'http://localhost:3000'}/login`);
    };

    const menuSections = [
        {
            title: 'Compte',
            items: [
                { icon: User, label: 'Profil', description: 'Gérer vos informations personnelles', href: '#' },
                { icon: Shield, label: 'Sécurité', description: 'Mot de passe, 2FA, sessions', href: '/security' },
                { icon: Globe, label: 'Langue & Région', description: 'Français (France)', href: '#' },
            ]
        },
        {
            title: 'Préférences',
            items: [
                { icon: Bell, label: 'Notifications', description: 'Gérer les alertes', href: '#' },
                { icon: Palette, label: 'Apparence', description: 'Thème sombre activé', href: '#' },
            ]
        },
        {
            title: 'Support',
            items: [
                { icon: HelpCircle, label: 'Aide & FAQ', description: 'Obtenez de l\'aide', href: '#' },
            ]
        }
    ];

    return (
        <div className="min-h-screen p-6 md:p-10 max-w-[1200px] mx-auto space-y-10">
            {/* Header */}
            <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center shadow-lg border border-white/10">
                    <Settings size={32} className="text-white" />
                </div>
                <div>
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent font-heading">
                        Paramètres
                    </h1>
                    <p className="text-slate-400 mt-1">Personnalisez votre expérience PMP.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Settings Menu */}
                <div className="lg:col-span-2 space-y-6">
                    {menuSections.map((section) => (
                        <GlassCard key={section.title} className="p-6">
                            <h3 className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-4">{section.title}</h3>
                            <div className="space-y-2">
                                {section.items.map((item) => (
                                    <a
                                        key={item.label}
                                        href={item.href}
                                        className="flex items-center justify-between p-4 rounded-xl hover:bg-white/5 transition-colors group"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center group-hover:bg-blue-600 transition-colors">
                                                <item.icon size={20} className="text-slate-400 group-hover:text-white transition-colors" />
                                            </div>
                                            <div>
                                                <div className="font-semibold text-white">{item.label}</div>
                                                <div className="text-xs text-slate-500">{item.description}</div>
                                            </div>
                                        </div>
                                        <ChevronRight size={20} className="text-slate-600 group-hover:text-blue-400 transition-colors" />
                                    </a>
                                ))}
                            </div>
                        </GlassCard>
                    ))}
                </div>

                {/* Quick Settings Panel */}
                <div className="space-y-6">
                    {/* Theme Toggle */}
                    <GlassCard className="p-6">
                        <h3 className="text-sm font-semibold text-white mb-4">Thème</h3>
                        <div className="flex gap-3">
                            <button
                                onClick={() => handleThemeChange(true)}
                                className={`flex-1 p-4 rounded-xl flex flex-col items-center gap-2 transition-all ${darkMode ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                                    }`}
                            >
                                <Moon size={24} />
                                <span className="text-xs font-medium">Sombre</span>
                            </button>
                            <button
                                onClick={() => handleThemeChange(false)}
                                className={`flex-1 p-4 rounded-xl flex flex-col items-center gap-2 transition-all ${!darkMode ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                                    }`}
                            >
                                <Sun size={24} />
                                <span className="text-xs font-medium">Clair</span>
                            </button>
                        </div>
                    </GlassCard>

                    {/* Notifications Quick Toggle */}
                    <GlassCard className="p-6">
                        <h3 className="text-sm font-semibold text-white mb-4">Notifications Rapides</h3>
                        <div className="space-y-3">
                            {Object.entries(notifications).map(([key, value]) => (
                                <div key={key} className="flex items-center justify-between">
                                    <span className="text-sm text-slate-300 capitalize">{key === 'push' ? 'Push' : key === 'sms' ? 'SMS' : 'Email'}</span>
                                    <button
                                        onClick={() => handleNotifChange(key, !value)}
                                        className={`w-10 h-6 rounded-full p-1 transition-colors ${value ? 'bg-blue-600' : 'bg-slate-700'}`}
                                    >
                                        <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${value ? 'translate-x-4' : 'translate-x-0'}`} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </GlassCard>

                    {/* Logout */}
                    <PremiumButton variant="secondary" className="w-full border-red-500/30 text-red-400 hover:bg-red-950/30" onClick={handleLogout}>
                        <LogOut size={16} className="mr-2" /> Déconnexion
                    </PremiumButton>
                </div>
            </div>
        </div>
    );
}
