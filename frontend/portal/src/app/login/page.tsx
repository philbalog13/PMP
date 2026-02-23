'use client';

import Link from 'next/link';
import { Suspense, useEffect, useMemo, useState, type ReactNode } from 'react';
import Image from 'next/image';
import {
    ArrowRight,
    CheckCircle2,
    Eye,
    EyeOff,
    GraduationCap,
    Loader2,
    Lock,
    Mail,
    Shield,
    ShieldAlert,
    Store,
    User as UserIcon,
    type LucideIcon
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';

import { useAuth as usePortalAuth } from '../auth/useAuth';
import { useAuth as useSharedAuth } from '@shared/context/AuthContext';
import { Permission, User as AuthUser, UserRole } from '@shared/types/user';
import { getRoleRedirectUrl, resolveSafeRedirectTarget } from '@shared/lib/app-urls';
import { normalizeRole } from '@shared/utils/roleUtils';
import { loginWithRole, registerAccount } from '@/lib/auth-client';

interface RoleOption {
    role: UserRole;
    label: string;
    audience: string;
    description: string;
    sampleEmail: string;
    samplePassword: string;
    accentClass: string;
    icon: LucideIcon;
    destinationHint: string;
    strongAuthHint: string;
}

const ROLE_OPTIONS: RoleOption[] = [
    {
        role: UserRole.ETUDIANT,
        label: 'Apprenant',
        audience: 'Étudiant',
        description: 'Modules, quiz, progression et parcours pédagogique.',
        sampleEmail: 'student01@pmp.edu',
        samplePassword: 'qa-pass-123',
        accentClass: 'from-emerald-500 to-teal-500',
        icon: GraduationCap,
        destinationHint: '/student',
        strongAuthHint: 'Mot de passe'
    },
    {
        role: UserRole.FORMATEUR,
        label: 'Formateur',
        audience: 'Encadrant',
        description: 'Pilotage des cohortes, audits et contrôle du lab.',
        sampleEmail: 'trainer@pmp.edu',
        samplePassword: 'qa-pass-123',
        accentClass: 'from-blue-500 to-cyan-500',
        icon: Shield,
        destinationHint: '/instructor',
        strongAuthHint: 'Mot de passe + 2FA'
    },
    {
        role: UserRole.MARCHAND,
        label: 'Marchand',
        audience: 'Opérations',
        description: 'Flux de transactions, rapports et simulation POS.',
        sampleEmail: 'bakery@pmp.edu',
        samplePassword: 'qa-pass-123',
        accentClass: 'from-orange-500 to-amber-500',
        icon: Store,
        destinationHint: 'TPE web',
        strongAuthHint: 'Mot de passe'
    },
    {
        role: UserRole.CLIENT,
        label: 'Client',
        audience: 'Carte',
        description: 'Comptes cartes, historique et paramètres sécurité.',
        sampleEmail: 'client@pmp.edu',
        samplePassword: 'qa-pass-123',
        accentClass: 'from-violet-500 to-fuchsia-500',
        icon: UserIcon,
        destinationHint: 'User Cards web',
        strongAuthHint: 'Mot de passe'
    }
];

function isExternalUrl(url: string): boolean {
    return /^https?:\/\//i.test(url);
}

function getPasswordStrength(password: string): number {
    if (!password) return 0;
    let score = 0;
    if (password.length >= 8) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;
    return score;
}

function isPermission(value: string): value is Permission {
    return Object.values(Permission).includes(value as Permission);
}

function normalizeRoleFromQuery(rawRole: string | null): UserRole {
    const normalized = normalizeRole(rawRole);
    return normalized || UserRole.ETUDIANT;
}

function UnifiedLoginContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { isLoading: isAuthCheckLoading } = usePortalAuth(false);
    const { login: establishSession } = useSharedAuth();

    const modeParam = searchParams.get('mode');
    const roleParam = searchParams.get('role');
    const startsInRegisterMode = modeParam === 'register';
    const initialRoleFromQuery = normalizeRoleFromQuery(roleParam);

    const [isLogin, setIsLogin] = useState(!startsInRegisterMode);
    const [role, setRole] = useState<UserRole>(initialRoleFromQuery);
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [code2fa, setCode2fa] = useState('');
    const [use2fa, setUse2fa] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [infoMessage, setInfoMessage] = useState<string | null>(null);

    const activeRole = useMemo(
        () => ROLE_OPTIONS.find((item) => item.role === role) || ROLE_OPTIONS[0],
        [role]
    );
    const passwordStrength = useMemo(() => getPasswordStrength(password), [password]);
    const isPasswordMismatch = useMemo(
        () => !isLogin && confirmPassword.trim().length > 0 && password !== confirmPassword,
        [confirmPassword, isLogin, password]
    );
    const canSubmit = useMemo(() => {
        if (isLoading) return false;
        if (!email.trim() || !password.trim()) return false;
        if (isLogin) {
            return !use2fa || code2fa.trim().length > 0;
        }
        return fullName.trim().length > 0 && confirmPassword.trim().length > 0 && !isPasswordMismatch;
    }, [code2fa, confirmPassword, email, fullName, isLoading, isLogin, isPasswordMismatch, password, use2fa]);

    useEffect(() => {
        const nextIsLogin = modeParam !== 'register';
        setIsLogin((current) => (current === nextIsLogin ? current : nextIsLogin));

        const nextRole = normalizeRoleFromQuery(roleParam);
        setRole((current) => (current === nextRole ? current : nextRole));
    }, [modeParam, roleParam]);

    const syncAuthStateInUrl = (nextIsLogin: boolean, nextRole: UserRole) => {
        const params = new URLSearchParams(searchParams.toString());
        if (nextIsLogin) {
            params.delete('mode');
        } else {
            params.set('mode', 'register');
        }

        if (nextRole === UserRole.ETUDIANT) {
            params.delete('role');
        } else {
            params.set('role', nextRole);
        }

        const query = params.toString();
        router.replace(query ? `/login?${query}` : '/login', { scroll: false });
    };

    const switchMode = (nextIsLogin: boolean) => {
        if (nextIsLogin === isLogin) return;

        setIsLogin(nextIsLogin);
        setErrorMessage(null);
        setInfoMessage(null);
        setUse2fa(false);
        setCode2fa('');
        setConfirmPassword('');
        if (nextIsLogin) setFullName('');
        syncAuthStateInUrl(nextIsLogin, role);
    };

    const applyRolePreset = (selectedRole: UserRole) => {
        const selected = ROLE_OPTIONS.find((item) => item.role === selectedRole);
        if (!selected) return;
        setEmail(selected.sampleEmail);
        setPassword(selected.samplePassword);
        setCode2fa('');
        setUse2fa(false);
        setErrorMessage(null);
        setInfoMessage(null);
    };

    const handleRoleChange = (nextRole: UserRole) => {
        setRole(nextRole);
        syncAuthStateInUrl(isLogin, nextRole);
        setErrorMessage(null);
        setInfoMessage(null);
    };

    const handleLogin = async () => {
        const result = await loginWithRole({
            role,
            email,
            password,
            code2fa: use2fa ? code2fa : undefined
        });

        if (!result.ok) {
            if (result.code === 'AUTH_2FA_REQUIRED') {
                setUse2fa(true);
                setInfoMessage('Un code d\'authentification à deux facteurs est requis.');
                return;
            }
            setErrorMessage(result.error);
            return;
        }

        const userFromApi = result.data.user;
        const normalizedRole = normalizeRole(userFromApi.role || role) || role;
        const normalizedUser: AuthUser = {
            id: userFromApi.id || userFromApi.userId || '',
            email: userFromApi.email || email.trim(),
            firstName: userFromApi.firstName || userFromApi.first_name || 'User',
            lastName: userFromApi.lastName || userFromApi.last_name || '',
            name: userFromApi.username || undefined,
            role: normalizedRole,
            permissions: Array.isArray(userFromApi.permissions)
                ? userFromApi.permissions.filter((item): item is Permission => typeof item === 'string' && isPermission(item))
                : []
        };

        establishSession(result.data.accessToken, normalizedUser, result.data.refreshToken || null);

        const redirectParam = searchParams.get('redirect');
        const redirectTarget = resolveSafeRedirectTarget(
            redirectParam,
            normalizedRole,
            window.location.origin
        );

        if (isExternalUrl(redirectTarget)) {
            window.location.assign(redirectTarget);
            return;
        }

        router.replace(redirectTarget || getRoleRedirectUrl(normalizedRole));
    };

    const handleRegister = async () => {
        if (password !== confirmPassword) {
            setErrorMessage('Les mots de passe ne correspondent pas.');
            return;
        }

        const registration = await registerAccount({
            email,
            password,
            fullName,
            role
        });

        if (!registration.ok) {
            setErrorMessage(registration.error);
            return;
        }

        setIsLogin(true);
        syncAuthStateInUrl(true, role);
        setUse2fa(false);
        setCode2fa('');
        setConfirmPassword('');
        setFullName('');
        setPassword('');
        setInfoMessage('Compte créé avec succès. Vous pouvez maintenant vous connecter.');
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setErrorMessage(null);
        setInfoMessage(null);
        setIsLoading(true);

        try {
            if (isLogin) {
                await handleLogin();
            } else {
                await handleRegister();
            }
        } catch (error) {
            console.error('Auth error:', error);
            setErrorMessage('Impossible de joindre le serveur. Veuillez réessayer.');
        } finally {
            setIsLoading(false);
        }
    };

    if (isAuthCheckLoading) {
        return (
            <div className="min-h-screen bg-[#061220] flex items-center justify-center text-white">
                <div className="flex flex-col items-center gap-4 rounded-2xl border border-slate-700/60 bg-slate-950/80 px-10 py-8">
                    <Loader2 className="animate-spin w-8 h-8 text-cyan-400" />
                    <span className="text-xs font-medium uppercase tracking-widest text-slate-400">
                        Vérification de la session…
                    </span>
                </div>
            </div>
        );
    }

    return (
        <div className="relative min-h-screen overflow-hidden bg-[#061220] text-white">
            {/* Background */}
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(20,184,166,0.12),transparent_50%),radial-gradient(ellipse_at_bottom_right,rgba(59,130,246,0.10),transparent_50%),linear-gradient(180deg,#020617_0%,#0f172a_100%)]" />
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.05)_1px,transparent_1px)] bg-[size:56px_56px]" />

            <div className="relative z-10 mx-auto grid min-h-screen max-w-6xl gap-8 px-4 py-10 md:px-8 lg:grid-cols-[1fr_0.9fr] lg:py-16 lg:items-center">

                {/* ── Formulaire ── */}
                <section className="flex flex-col rounded-2xl border border-slate-700/50 bg-slate-950/80 p-8 shadow-2xl backdrop-blur-xl">

                    {/* Logo / Header */}
                    <header className="mb-8 flex items-center gap-4">
                        <Link href="/" className="flex items-center gap-3 group">
                            <Image
                                src="/monetic-logo.svg"
                                alt="MoneTIC Logo"
                                width={44}
                                height={44}
                                className="group-hover:scale-105 transition-transform duration-200"
                            />
                            <div>
                                <div className="text-[10px] font-semibold uppercase tracking-widest text-cyan-400">Plateforme Monétique Pédagogique</div>
                                <div className="text-lg font-bold italic tracking-tight leading-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
                                    MoneTIC
                                </div>
                            </div>
                        </Link>
                    </header>

                    {/* Tabs Connexion / Inscription */}
                    <div className="mb-7 grid grid-cols-2 gap-1 rounded-xl border border-slate-700/50 bg-slate-900/60 p-1">
                        <button
                            type="button"
                            onClick={() => switchMode(true)}
                            className={`rounded-lg px-4 py-2.5 text-xs font-semibold uppercase tracking-wider transition ${
                                isLogin
                                    ? 'bg-white text-slate-900 shadow-md'
                                    : 'text-slate-400 hover:text-slate-200'
                            }`}
                        >
                            Connexion
                        </button>
                        <button
                            type="button"
                            onClick={() => switchMode(false)}
                            className={`rounded-lg px-4 py-2.5 text-xs font-semibold uppercase tracking-wider transition ${
                                !isLogin
                                    ? 'bg-white text-slate-900 shadow-md'
                                    : 'text-slate-400 hover:text-slate-200'
                            }`}
                        >
                            Inscription
                        </button>
                    </div>

                    {/* Titre */}
                    <div className="mb-7">
                        <h1 className="text-2xl font-bold tracking-tight text-white">
                            {isLogin ? 'Connexion à votre espace' : 'Créer un compte'}
                        </h1>
                        <p className="mt-2 text-sm text-slate-400">
                            {isLogin
                                ? 'Renseignez vos identifiants pour accéder à la plateforme.'
                                : 'Choisissez votre profil et renseignez vos informations.'}
                        </p>
                    </div>

                    {/* Sélecteur de rôle — uniquement en mode Inscription */}
                    {!isLogin && (
                        <div className="mb-6">
                            <div className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-400">Profil</div>
                            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                                {ROLE_OPTIONS.map((option) => {
                                    const Icon = option.icon;
                                    const isActive = option.role === role;
                                    return (
                                        <button
                                            key={option.role}
                                            type="button"
                                            onClick={() => handleRoleChange(option.role)}
                                            className={`rounded-xl border p-3 text-left transition-all ${
                                                isActive
                                                    ? 'border-cyan-500/60 bg-cyan-500/10'
                                                    : 'border-slate-700/60 bg-slate-900/60 hover:border-slate-500/60'
                                            }`}
                                        >
                                            <div className={`mb-2 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br ${option.accentClass}`}>
                                                <Icon size={15} className="text-white" />
                                            </div>
                                            <div className="text-xs font-semibold text-white">{option.label}</div>
                                            <div className="text-[11px] text-slate-400 mt-0.5">{option.audience}</div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Messages d'erreur / info */}
                    {errorMessage && (
                        <div className="mb-5 rounded-xl border border-red-500/30 bg-red-500/8 px-4 py-3 text-sm text-red-300 flex items-start gap-2">
                            <ShieldAlert size={15} className="mt-0.5 shrink-0" />
                            <span>{errorMessage}</span>
                        </div>
                    )}
                    {infoMessage && (
                        <div className="mb-5 rounded-xl border border-emerald-500/30 bg-emerald-500/8 px-4 py-3 text-sm text-emerald-300 flex items-start gap-2">
                            <CheckCircle2 size={15} className="mt-0.5 shrink-0" />
                            <span>{infoMessage}</span>
                        </div>
                    )}

                    {/* Formulaire */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {!isLogin && (
                            <AuthInput
                                id="fullName"
                                label="Nom complet"
                                value={fullName}
                                onChange={(value) => { setFullName(value); setErrorMessage(null); }}
                                icon={<UserIcon size={16} />}
                                placeholder="Prénom Nom"
                                autoComplete="name"
                            />
                        )}

                        <AuthInput
                            id="email"
                            label="Adresse e-mail"
                            value={email}
                            onChange={(value) => { setEmail(value); setErrorMessage(null); }}
                            icon={<Mail size={16} />}
                            placeholder="votre@email.com"
                            autoComplete="email"
                        />

                        {/* Mot de passe */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                                Mot de passe
                            </label>
                            <div className="relative group">
                                <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-cyan-400 transition-colors" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(event) => { setPassword(event.target.value); setErrorMessage(null); }}
                                    className="w-full rounded-xl border border-slate-700/60 bg-slate-900/70 py-3 pl-11 pr-11 text-sm placeholder:text-slate-500 focus:border-cyan-500/60 focus:outline-none focus:ring-2 focus:ring-cyan-500/15 transition"
                                    placeholder="••••••••"
                                    autoComplete={isLogin ? 'current-password' : 'new-password'}
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword((v) => !v)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                                    tabIndex={-1}
                                >
                                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>

                        {/* Confirmation mot de passe (inscription) */}
                        {!isLogin && (
                            <div className="space-y-1.5">
                                <AuthInput
                                    id="confirm"
                                    label="Confirmer le mot de passe"
                                    value={confirmPassword}
                                    onChange={(value) => { setConfirmPassword(value); setErrorMessage(null); }}
                                    icon={<Lock size={16} />}
                                    placeholder="••••••••"
                                    type="password"
                                    autoComplete="new-password"
                                />
                                {confirmPassword.trim().length > 0 && (
                                    <p className={`text-xs ${isPasswordMismatch ? 'text-red-400' : 'text-emerald-400'}`}>
                                        {isPasswordMismatch ? 'Les mots de passe ne correspondent pas.' : 'Les mots de passe correspondent.'}
                                    </p>
                                )}
                                {/* Indicateur de robustesse */}
                                <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                                    <div
                                        className={`h-full rounded-full transition-all ${
                                            passwordStrength <= 1 ? 'bg-red-500' : passwordStrength <= 2 ? 'bg-amber-400' : passwordStrength <= 3 ? 'bg-yellow-300' : 'bg-emerald-400'
                                        }`}
                                        style={{ width: `${Math.max(5, (passwordStrength / 4) * 100)}%` }}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Code 2FA */}
                        {isLogin && use2fa && (
                            <AuthInput
                                id="code2fa"
                                label="Code d'authentification (2FA)"
                                value={code2fa}
                                onChange={(value) => { setCode2fa(value); setErrorMessage(null); }}
                                icon={<Shield size={16} />}
                                placeholder="123456"
                                autoComplete="one-time-code"
                            />
                        )}

                        <button
                            type="submit"
                            disabled={!canSubmit}
                            className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-3.5 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            {isLoading
                                ? <Loader2 className="animate-spin" size={17} />
                                : <>{isLogin ? 'Se connecter' : 'Créer le compte'} <ArrowRight size={16} /></>
                            }
                        </button>
                    </form>

                    <p className="mt-6 text-center text-xs text-slate-500">
                        {isLogin ? 'Pas encore de compte ?' : 'Déjà inscrit ?'}{' '}
                        <button
                            type="button"
                            onClick={() => switchMode(!isLogin)}
                            className="font-semibold text-cyan-400 hover:text-cyan-300 transition-colors"
                        >
                            {isLogin ? 'S\'inscrire' : 'Se connecter'}
                        </button>
                    </p>
                </section>

                {/* ── Panneau latéral ── */}
                <aside className="hidden lg:flex flex-col gap-6 rounded-2xl border border-slate-700/40 bg-slate-950/50 p-8 backdrop-blur-xl">
                    <div>
                        <div className="inline-flex items-center gap-2 rounded-full border border-slate-600/50 bg-slate-800/60 px-3 py-1 text-[11px] font-medium uppercase tracking-widest text-slate-400">
                            Accès sécurisé
                        </div>
                        <h2 className="mt-4 text-2xl font-bold tracking-tight text-white">
                            Un accès adapté à chaque profil
                        </h2>
                        <p className="mt-2 text-sm leading-relaxed text-slate-400">
                            La plateforme oriente automatiquement chaque utilisateur vers son espace métier après authentification.
                        </p>
                    </div>

                    {/* Profils */}
                    <div className="space-y-3">
                        {ROLE_OPTIONS.map((option) => {
                            const Icon = option.icon;
                            return (
                                <div
                                    key={option.role}
                                    className="flex items-start gap-3 rounded-xl border border-slate-700/50 bg-slate-900/50 p-4"
                                >
                                    <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${option.accentClass}`}>
                                        <Icon size={15} className="text-white" />
                                    </div>
                                    <div>
                                        <div className="text-sm font-semibold text-white">{option.label}</div>
                                        <p className="mt-0.5 text-xs text-slate-400">{option.description}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="mt-auto rounded-xl border border-slate-700/40 bg-slate-900/40 px-4 py-3 text-xs text-slate-500">
                        Les connexions sont protégées par JWT à courte durée de vie avec rotation automatique du jeton de rafraîchissement.
                    </div>
                </aside>

            </div>
        </div>
    );
}

export default function UnifiedLoginPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-[#061220] flex items-center justify-center text-white">
                <div className="flex flex-col items-center gap-4 rounded-2xl border border-slate-700/60 bg-slate-950/80 px-10 py-8">
                    <Loader2 className="animate-spin w-8 h-8 text-cyan-400" />
                    <span className="text-xs font-medium uppercase tracking-widest text-slate-400">
                        Chargement…
                    </span>
                </div>
            </div>
        }>
            <UnifiedLoginContent />
        </Suspense>
    );
}

function AuthInput({
    id,
    label,
    value,
    onChange,
    icon,
    placeholder,
    type = 'text',
    autoComplete
}: {
    id: string;
    label: string;
    value: string;
    onChange: (value: string) => void;
    icon: ReactNode;
    placeholder: string;
    type?: string;
    autoComplete?: string;
}) {
    return (
        <div className="space-y-1.5">
            <label htmlFor={id} className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                {label}
            </label>
            <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-cyan-400 transition-colors">
                    {icon}
                </div>
                <input
                    id={id}
                    type={type}
                    value={value}
                    onChange={(event) => onChange(event.target.value)}
                    className="w-full rounded-xl border border-slate-700/60 bg-slate-900/70 py-3 pl-11 pr-4 text-sm placeholder:text-slate-500 focus:border-cyan-500/60 focus:outline-none focus:ring-2 focus:ring-cyan-500/15 transition"
                    placeholder={placeholder}
                    autoComplete={autoComplete}
                    required
                />
            </div>
        </div>
    );
}
