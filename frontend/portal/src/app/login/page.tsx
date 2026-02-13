'use client';

import Link from 'next/link';
import { Suspense, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
    ArrowRight,
    BookOpenCheck,
    CheckCircle2,
    CreditCard,
    Eye,
    EyeOff,
    Fingerprint,
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

const FLOW_STEPS = [
    {
        title: 'Vérification identité',
        description: 'Validation des identifiants et contrôles anti brute force.',
        icon: Fingerprint
    },
    {
        title: 'Session intelligente',
        description: 'Access token court + rotation refresh automatique.',
        icon: Shield
    },
    {
        title: 'Redirection rôle',
        description: 'Navigation directe vers le bon espace métier.',
        icon: ArrowRight
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

        // Keep URLs clean: student is default.
        if (nextRole === UserRole.ETUDIANT) {
            params.delete('role');
        } else {
            params.set('role', nextRole);
        }

        const query = params.toString();
        router.replace(query ? `/login?${query}` : '/login', { scroll: false });
    };

    const switchMode = (nextIsLogin: boolean) => {
        if (nextIsLogin === isLogin) {
            return;
        }

        setIsLogin(nextIsLogin);
        setErrorMessage(null);
        setInfoMessage(null);
        setUse2fa(false);
        setCode2fa('');
        setConfirmPassword('');
        if (nextIsLogin) {
            setFullName('');
        }
        syncAuthStateInUrl(nextIsLogin, role);
    };

    const applyRolePreset = (selectedRole: UserRole) => {
        const selected = ROLE_OPTIONS.find((item) => item.role === selectedRole);
        if (!selected) {
            return;
        }
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
        if (isLogin) {
            applyRolePreset(nextRole);
        } else {
            setErrorMessage(null);
            setInfoMessage(null);
        }
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
                setInfoMessage('Code 2FA requis pour ce compte.');
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
        setInfoMessage('Compte créé. Vous pouvez vous connecter.');
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
            setErrorMessage('Connexion serveur impossible.');
        } finally {
            setIsLoading(false);
        }
    };

    if (isAuthCheckLoading) {
        return (
            <div className="min-h-screen bg-[#061220] flex items-center justify-center text-white">
                <div className="flex flex-col items-center gap-5 rounded-3xl border border-cyan-500/25 bg-slate-950/70 px-10 py-8">
                    <Loader2 className="animate-spin w-10 h-10 text-cyan-400" />
                    <span className="text-[11px] font-black uppercase tracking-[0.35em] text-slate-400">
                        Checking Session
                    </span>
                </div>
            </div>
        );
    }

    return (
        <div className="relative min-h-screen overflow-hidden bg-[#061220] text-white">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_20%,rgba(20,184,166,0.23),transparent_38%),radial-gradient(circle_at_85%_10%,rgba(59,130,246,0.24),transparent_42%),linear-gradient(180deg,#020617_0%,#0f172a_100%)]" />
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.08)_1px,transparent_1px)] bg-[size:44px_44px] opacity-20" />

            <div className="relative z-10 mx-auto grid min-h-screen max-w-7xl gap-6 px-4 py-6 md:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:py-10">
                <section className="flex flex-col rounded-[28px] border border-cyan-500/20 bg-slate-950/75 p-6 shadow-[0_30px_80px_rgba(2,6,23,0.68)] backdrop-blur-xl md:p-8">
                    <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
                        <Link href="/" className="flex items-center gap-3 group">
                            <div className={`h-12 w-12 rounded-2xl bg-gradient-to-br ${activeRole.accentClass} flex items-center justify-center shadow-2xl shadow-cyan-500/20 group-hover:rotate-6 transition-transform`}>
                                <CreditCard className="h-6 w-6 text-white" />
                            </div>
                            <div>
                                <div className="text-xs font-black uppercase tracking-[0.24em] text-cyan-300">PMP AUTH</div>
                                <div className="text-xl font-black tracking-tight">Control Center</div>
                            </div>
                        </Link>

                        {isLogin ? (
                            <button
                                type="button"
                                onClick={() => applyRolePreset(role)}
                                className="rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-cyan-200 hover:bg-cyan-500/20 transition-colors"
                            >
                                Auto Fill Demo
                            </button>
                        ) : (
                            <div className="rounded-xl border border-slate-600/60 bg-slate-900/70 px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-slate-300">
                                Role: {activeRole.label}
                            </div>
                        )}
                    </header>

                    <div className="mb-6 grid grid-cols-2 gap-2 rounded-2xl border border-slate-700/60 bg-slate-900/70 p-1">
                        <button
                            type="button"
                            onClick={() => switchMode(true)}
                            className={`rounded-xl px-4 py-3 text-xs font-black uppercase tracking-[0.16em] transition ${isLogin ? 'bg-white text-slate-950 shadow-xl' : 'text-slate-400 hover:text-white'}`}
                        >
                            Connexion
                        </button>
                        <button
                            type="button"
                            onClick={() => switchMode(false)}
                            className={`rounded-xl px-4 py-3 text-xs font-black uppercase tracking-[0.16em] transition ${!isLogin ? 'bg-white text-slate-950 shadow-xl' : 'text-slate-400 hover:text-white'}`}
                        >
                            Inscription
                        </button>
                    </div>

                    <div className="mb-7">
                        <h1 className="text-3xl md:text-4xl font-black tracking-tight">
                            {isLogin ? 'Accès sécurisé au portail' : 'Création de compte guidée'}
                        </h1>
                        <p className="mt-3 max-w-xl text-slate-400">
                            Sélectionnez un profil. Le flux adapte les contrôles et la redirection automatiquement.
                        </p>
                    </div>

                    <div className="mb-7 grid grid-cols-2 gap-3 sm:grid-cols-4">
                        {ROLE_OPTIONS.map((option) => {
                            const Icon = option.icon;
                            const isActive = option.role === role;

                            return (
                                <button
                                    key={option.role}
                                    type="button"
                                    onClick={() => handleRoleChange(option.role)}
                                    className={`group rounded-2xl border p-3 text-left transition-all ${isActive
                                        ? 'border-cyan-400/70 bg-cyan-500/15 shadow-[0_16px_40px_rgba(6,182,212,0.2)]'
                                        : 'border-slate-700/70 bg-slate-900/70 hover:border-slate-500/70 hover:bg-slate-900'}`}
                                >
                                    <div className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${option.accentClass} text-white`}>
                                        <Icon size={18} />
                                    </div>
                                    <div className="text-sm font-bold">{option.label}</div>
                                    <div className="mt-1 text-[11px] text-slate-400">{option.audience}</div>
                                </button>
                            );
                        })}
                    </div>

                    <div className="mb-6 rounded-2xl border border-slate-700/70 bg-slate-900/60 p-4">
                        <div className="flex items-start gap-3">
                            <BookOpenCheck className="mt-0.5 h-5 w-5 text-cyan-300" />
                            <div>
                                <div className="text-sm font-semibold text-white">{activeRole.label}</div>
                                <p className="mt-1 text-sm text-slate-400">{activeRole.description}</p>
                            </div>
                        </div>
                    </div>

                    {errorMessage && (
                        <div className="mb-4 rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200 flex items-start gap-2">
                            <ShieldAlert size={16} className="mt-0.5 shrink-0" />
                            <span>{errorMessage}</span>
                        </div>
                    )}

                    {infoMessage && (
                        <div className="mb-4 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200 flex items-start gap-2">
                            <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
                            <span>{infoMessage}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {!isLogin && (
                            <AuthInput
                                id="fullName"
                                label="Nom complet"
                                value={fullName}
                                onChange={(value) => {
                                    setFullName(value);
                                    setErrorMessage(null);
                                }}
                                icon={<UserIcon size={18} />}
                                placeholder="Ex: Georges Dupont"
                                autoComplete="name"
                            />
                        )}

                        <AuthInput
                            id="email"
                            label="Email"
                            value={email}
                            onChange={(value) => {
                                setEmail(value);
                                setErrorMessage(null);
                            }}
                            icon={<Mail size={18} />}
                            placeholder="name@pmp.edu"
                            autoComplete="email"
                        />

                        <div className="space-y-2">
                            <label className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Mot de passe</label>
                            <div className="relative group">
                                <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-cyan-300 transition-colors" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(event) => {
                                        setPassword(event.target.value);
                                        setErrorMessage(null);
                                    }}
                                    className="w-full rounded-2xl border border-slate-700/70 bg-slate-900/75 py-3.5 pl-12 pr-12 text-sm font-medium placeholder:text-slate-500 focus:border-cyan-400/70 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 transition"
                                    placeholder="********"
                                    autoComplete={isLogin ? 'current-password' : 'new-password'}
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword((current) => !current)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        {!isLogin && (
                            <div className="space-y-2">
                                <AuthInput
                                    id="confirm"
                                    label="Confirmation mot de passe"
                                    value={confirmPassword}
                                    onChange={(value) => {
                                        setConfirmPassword(value);
                                        setErrorMessage(null);
                                    }}
                                    icon={<Shield size={18} />}
                                    placeholder="********"
                                    type="password"
                                    autoComplete="new-password"
                                />
                                {confirmPassword.trim().length > 0 && (
                                    <div className={`text-xs ${isPasswordMismatch ? 'text-red-300' : 'text-emerald-300'}`}>
                                        {isPasswordMismatch ? 'Les mots de passe ne correspondent pas.' : 'Confirmation mot de passe valide.'}
                                    </div>
                                )}
                                <div className="rounded-xl border border-slate-700/60 bg-slate-900/70 px-3 py-2">
                                    <div className="mb-2 flex items-center justify-between text-[11px] uppercase tracking-[0.16em] text-slate-400">
                                        <span>Force du mot de passe</span>
                                        <span>{['Faible', 'Basique', 'Moyen', 'Fort', 'Solide'][passwordStrength]}</span>
                                    </div>
                                    <div className="h-2 rounded-full bg-slate-800">
                                        <div
                                            className={`h-2 rounded-full transition-all ${passwordStrength <= 1 ? 'bg-red-400' : passwordStrength <= 3 ? 'bg-amber-400' : 'bg-emerald-400'}`}
                                            style={{ width: `${Math.max(6, (passwordStrength / 4) * 100)}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {isLogin && use2fa && (
                            <AuthInput
                                id="code2fa"
                                label="Code 2FA"
                                value={code2fa}
                                onChange={(value) => {
                                    setCode2fa(value);
                                    setErrorMessage(null);
                                }}
                                icon={<Shield size={18} />}
                                placeholder="123456"
                                autoComplete="one-time-code"
                            />
                        )}
                        {isLogin && role === UserRole.FORMATEUR && !use2fa && (
                            <div className="rounded-xl border border-blue-400/25 bg-blue-500/10 px-3 py-2 text-xs text-blue-100">
                                Le profil formateur peut demander un code 2FA selon les règles du compte.
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={!canSubmit}
                            className="group flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-500 px-4 py-4 text-sm font-black uppercase tracking-[0.16em] text-slate-950 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-45"
                        >
                            {isLoading ? <Loader2 className="animate-spin" size={18} /> : <>{isLogin ? 'Se connecter' : 'Créer un compte'} <ArrowRight size={18} className="group-hover:translate-x-0.5 transition-transform" /></>}
                        </button>
                    </form>

                    <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-xs uppercase tracking-[0.16em] text-slate-400">
                        <span>Sécurité: {activeRole.strongAuthHint}</span>
                        <button
                            type="button"
                            onClick={() => switchMode(!isLogin)}
                            className="font-black text-cyan-300 hover:text-cyan-200 transition-colors"
                        >
                            {isLogin ? 'Pas encore inscrit' : 'Déjà membre'}
                        </button>
                    </div>
                </section>

                <aside className="hidden lg:flex flex-col rounded-[28px] border border-slate-700/70 bg-slate-950/55 p-8 backdrop-blur-xl">
                    <div className="mb-8">
                        <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-cyan-200">
                            Intelligent Auth Flow
                        </div>
                        <h2 className="mt-4 text-3xl font-black tracking-tight">
                            Session logique et fluide
                        </h2>
                        <p className="mt-3 text-sm text-slate-400">
                            Le portail orchestre vérification, rotation token et routage par rôle sans friction.
                        </p>
                    </div>

                    <div className="space-y-4">
                        {FLOW_STEPS.map((step, index) => {
                            const StepIcon = step.icon;
                            return (
                                <div key={step.title} className="rounded-2xl border border-slate-700/70 bg-slate-900/65 p-4">
                                    <div className="mb-2 flex items-center gap-3">
                                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan-500/15 text-cyan-300">
                                            {index + 1}
                                        </div>
                                        <StepIcon size={17} className="text-cyan-300" />
                                        <span className="font-bold text-white">{step.title}</span>
                                    </div>
                                    <p className="text-sm text-slate-400">{step.description}</p>
                                </div>
                            );
                        })}
                    </div>

                    <div className="mt-6 rounded-2xl border border-cyan-500/25 bg-cyan-500/10 p-4">
                        <div className="text-xs font-black uppercase tracking-[0.2em] text-cyan-200">Rôle actif</div>
                        <div className="mt-3 flex items-center gap-3">
                            <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${activeRole.accentClass} flex items-center justify-center`}>
                                <activeRole.icon size={18} className="text-white" />
                            </div>
                            <div>
                                <div className="font-semibold text-white">{activeRole.label}</div>
                                <div className="text-sm text-cyan-100/80">{activeRole.audience}</div>
                            </div>
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                            <div className="rounded-xl border border-cyan-500/20 bg-slate-950/40 p-3">
                                <div className="text-[11px] uppercase tracking-[0.16em] text-cyan-200/80">Destination</div>
                                <div className="mt-1 font-semibold text-white">{activeRole.destinationHint}</div>
                            </div>
                            <div className="rounded-xl border border-cyan-500/20 bg-slate-950/40 p-3">
                                <div className="text-[11px] uppercase tracking-[0.16em] text-cyan-200/80">Contrôle</div>
                                <div className="mt-1 font-semibold text-white">{activeRole.strongAuthHint}</div>
                            </div>
                        </div>
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
                <div className="flex flex-col items-center gap-5 rounded-3xl border border-cyan-500/25 bg-slate-950/70 px-10 py-8">
                    <Loader2 className="animate-spin w-10 h-10 text-cyan-400" />
                    <span className="text-[11px] font-black uppercase tracking-[0.35em] text-slate-400">
                        Loading Auth
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
        <div className="space-y-2">
            <label htmlFor={id} className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">{label}</label>
            <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-cyan-300 transition-colors">
                    {icon}
                </div>
                <input
                    id={id}
                    type={type}
                    value={value}
                    onChange={(event) => onChange(event.target.value)}
                    className="w-full rounded-2xl border border-slate-700/70 bg-slate-900/75 py-3.5 pl-12 pr-4 text-sm font-medium placeholder:text-slate-500 focus:border-cyan-400/70 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 transition"
                    placeholder={placeholder}
                    autoComplete={autoComplete}
                    required
                />
            </div>
        </div>
    );
}
