'use client';

import Link from 'next/link';
import { Suspense, useEffect, useMemo, useState } from 'react';
import {
  ArrowRight, CheckCircle2, Eye, EyeOff,
  GraduationCap, Lock, Mail, Shield, ShieldAlert, Store, User as UserIcon,
  type LucideIcon,
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';

import { useAuth as usePortalAuth }             from '../auth/useAuth';
import { useAuth as useSharedAuth }             from '@shared/context/AuthContext';
import { Permission, User as AuthUser, UserRole } from '@shared/types/user';
import { getRoleRedirectUrl, resolveSafeRedirectTarget } from '@shared/lib/app-urls';
import { normalizeRole }                         from '@shared/utils/roleUtils';
import { loginWithRole, registerAccount }        from '@/lib/auth-client';

/* ── Banking composants disponibles via globals.css ── */
import { BankSpinner } from '@shared/components/banking/primitives/BankSpinner';

/* ══════════════════════════════════════════════════════
   TYPES & DATA (inchangés)
   ══════════════════════════════════════════════════════ */
interface RoleOption {
  role:           UserRole;
  label:          string;
  audience:       string;
  description:    string;
  sampleEmail:    string;
  samplePassword: string;
  color:          string;       /* couleur CSS --bank-* ou hex */
  icon:           LucideIcon;
  destinationHint:  string;
  strongAuthHint:   string;
}

const ROLE_OPTIONS: RoleOption[] = [
  {
    role:           UserRole.ETUDIANT,
    label:          'Apprenant',
    audience:       'Étudiant',
    description:    'Modules, quiz, progression et parcours pédagogique.',
    sampleEmail:    'student01@pmp.edu',
    samplePassword: 'qa-pass-123',
    color:          '#10b981',
    icon:           GraduationCap,
    destinationHint:  '/student',
    strongAuthHint:   'Mot de passe',
  },
  {
    role:           UserRole.FORMATEUR,
    label:          'Formateur',
    audience:       'Encadrant',
    description:    'Pilotage des cohortes, audits et contrôle du lab.',
    sampleEmail:    'trainer@pmp.edu',
    samplePassword: 'qa-pass-123',
    color:          '#3b82f6',
    icon:           Shield,
    destinationHint:  '/instructor',
    strongAuthHint:   'Mot de passe + 2FA',
  },
  {
    role:           UserRole.MARCHAND,
    label:          'Marchand',
    audience:       'Opérations',
    description:    'Flux de transactions, rapports et simulation POS.',
    sampleEmail:    'bakery@pmp.edu',
    samplePassword: 'qa-pass-123',
    color:          '#2DD4BF',          /* teal merchant */
    icon:           Store,
    destinationHint:  'TPE web',
    strongAuthHint:   'Mot de passe',
  },
  {
    role:           UserRole.CLIENT,
    label:          'Client',
    audience:       'Carte',
    description:    'Comptes cartes, historique et paramètres sécurité.',
    sampleEmail:    'client@pmp.edu',
    samplePassword: 'qa-pass-123',
    color:          '#818CF8',          /* indigo client */
    icon:           UserIcon,
    destinationHint:  'MoneBank',
    strongAuthHint:   'Mot de passe',
  },
];

/* ══════════════════════════════════════════════════════
   HELPERS (inchangés)
   ══════════════════════════════════════════════════════ */
function isExternalUrl(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

function getPasswordStrength(password: string): number {
  if (!password) return 0;
  let score = 0;
  if (password.length >= 8)         score += 1;
  if (/[A-Z]/.test(password))       score += 1;
  if (/[0-9]/.test(password))       score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  return score;
}

function isPermission(value: string): value is Permission {
  return Object.values(Permission).includes(value as Permission);
}

function normalizeRoleFromQuery(rawRole: string | null): UserRole {
  return normalizeRole(rawRole) || UserRole.ETUDIANT;
}

/* ══════════════════════════════════════════════════════
   SOUS-COMPOSANT : INPUT AUTH
   ══════════════════════════════════════════════════════ */
function AuthField({
  id, label, value, onChange, icon: Icon, placeholder,
  type = 'text', autoComplete, trailing,
}: {
  id:            string;
  label:         string;
  value:         string;
  onChange:      (v: string) => void;
  icon:          LucideIcon;
  placeholder:   string;
  type?:         string;
  autoComplete?: string;
  trailing?:     React.ReactNode;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label htmlFor={id} style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--bank-text-tertiary)' }}>
        {label}
      </label>
      <div style={{ position: 'relative' }}>
        <Icon size={15} strokeWidth={2} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--bank-text-tertiary)', pointerEvents: 'none' }} aria-hidden="true" />
        <input
          id={id}
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required
          style={{
            width:        '100%',
            padding:      '11px 40px 11px 40px',
            borderRadius: 'var(--bank-radius-md)',
            border:       '1px solid var(--bank-border-default)',
            background:   'var(--bank-bg-elevated)',
            color:        'var(--bank-text-primary)',
            fontSize:     'var(--bank-text-sm)',
            outline:      'none',
            boxSizing:    'border-box',
            transition:   'border-color var(--bank-t-fast)',
          }}
          onFocus={e => { e.target.style.borderColor = 'var(--bank-accent)'; }}
          onBlur={e  => { e.target.style.borderColor = 'var(--bank-border-default)'; }}
        />
        {trailing && (
          <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)' }}>
            {trailing}
          </div>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   COMPOSANT PRINCIPAL (contenu)
   ══════════════════════════════════════════════════════ */
function UnifiedLoginContent() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const { isLoading: isAuthCheckLoading } = usePortalAuth(false);
  const { login: establishSession }       = useSharedAuth();

  const modeParam           = searchParams.get('mode');
  const roleParam           = searchParams.get('role');
  const startsInRegisterMode = modeParam === 'register';
  const initialRoleFromQuery = normalizeRoleFromQuery(roleParam);

  const [isLogin,          setIsLogin]          = useState(!startsInRegisterMode);
  const [role,             setRole]             = useState<UserRole>(initialRoleFromQuery);
  const [showPassword,     setShowPassword]     = useState(false);
  const [isLoading,        setIsLoading]        = useState(false);
  const [email,            setEmail]            = useState('');
  const [password,         setPassword]         = useState('');
  const [confirmPassword,  setConfirmPassword]  = useState('');
  const [fullName,         setFullName]         = useState('');
  const [code2fa,          setCode2fa]          = useState('');
  const [use2fa,           setUse2fa]           = useState(false);
  const [errorMessage,     setErrorMessage]     = useState<string | null>(null);
  const [infoMessage,      setInfoMessage]      = useState<string | null>(null);

  const activeRole       = useMemo(() => ROLE_OPTIONS.find(o => o.role === role) || ROLE_OPTIONS[0], [role]);
  const passwordStrength = useMemo(() => getPasswordStrength(password), [password]);
  const isPasswordMismatch = useMemo(() =>
    !isLogin && confirmPassword.trim().length > 0 && password !== confirmPassword,
  [confirmPassword, isLogin, password]);

  const canSubmit = useMemo(() => {
    if (isLoading) return false;
    if (!email.trim() || !password.trim()) return false;
    if (isLogin) return !use2fa || code2fa.trim().length > 0;
    return fullName.trim().length > 0 && confirmPassword.trim().length > 0 && !isPasswordMismatch;
  }, [code2fa, confirmPassword, email, fullName, isLoading, isLogin, isPasswordMismatch, password, use2fa]);

  useEffect(() => {
    const nextIsLogin = modeParam !== 'register';
    setIsLogin(c => c === nextIsLogin ? c : nextIsLogin);
    const nextRole = normalizeRoleFromQuery(roleParam);
    setRole(c => c === nextRole ? c : nextRole);
  }, [modeParam, roleParam]);

  /* ── URL sync (inchangé) ── */
  const syncAuthStateInUrl = (nextIsLogin: boolean, nextRole: UserRole) => {
    const params = new URLSearchParams(searchParams.toString());
    nextIsLogin ? params.delete('mode') : params.set('mode', 'register');
    nextRole === UserRole.ETUDIANT ? params.delete('role') : params.set('role', nextRole);
    const query = params.toString();
    router.replace(query ? `/login?${query}` : '/login', { scroll: false });
  };

  const switchMode = (nextIsLogin: boolean) => {
    if (nextIsLogin === isLogin) return;
    setIsLogin(nextIsLogin);
    setErrorMessage(null); setInfoMessage(null); setUse2fa(false); setCode2fa(''); setConfirmPassword('');
    if (nextIsLogin) setFullName('');
    syncAuthStateInUrl(nextIsLogin, role);
  };

  const applyRolePreset = (selectedRole: UserRole) => {
    const selected = ROLE_OPTIONS.find(o => o.role === selectedRole);
    if (!selected) return;
    setEmail(selected.sampleEmail); setPassword(selected.samplePassword);
    setCode2fa(''); setUse2fa(false); setErrorMessage(null); setInfoMessage(null);
  };

  const handleRoleChange = (nextRole: UserRole) => {
    setRole(nextRole);
    syncAuthStateInUrl(isLogin, nextRole);
    setErrorMessage(null); setInfoMessage(null);
  };

  /* ── Login / Register handlers (inchangés) ── */
  const handleLogin = async () => {
    const result = await loginWithRole({ role, email, password, code2fa: use2fa ? code2fa : undefined });
    if (!result.ok) {
      if (result.code === 'AUTH_2FA_REQUIRED') { setUse2fa(true); setInfoMessage("Un code d'authentification à deux facteurs est requis."); return; }
      setErrorMessage(result.error); return;
    }
    const userFromApi    = result.data.user;
    const normalizedRole = normalizeRole(userFromApi.role || role) || role;
    const normalizedUser: AuthUser = {
      id:          userFromApi.id || userFromApi.userId || '',
      email:       userFromApi.email || email.trim(),
      firstName:   userFromApi.firstName || userFromApi.first_name || 'User',
      lastName:    userFromApi.lastName || userFromApi.last_name || '',
      name:        userFromApi.username || undefined,
      role:        normalizedRole,
      permissions: Array.isArray(userFromApi.permissions)
        ? userFromApi.permissions.filter((x): x is Permission => typeof x === 'string' && isPermission(x))
        : [],
    };
    establishSession(result.data.accessToken, normalizedUser, result.data.refreshToken || null);
    const redirectParam  = searchParams.get('redirect');
    const redirectTarget = resolveSafeRedirectTarget(redirectParam, normalizedRole, window.location.origin);
    if (isExternalUrl(redirectTarget)) { window.location.assign(redirectTarget); return; }
    router.replace(redirectTarget || getRoleRedirectUrl(normalizedRole));
  };

  const handleRegister = async () => {
    if (password !== confirmPassword) { setErrorMessage('Les mots de passe ne correspondent pas.'); return; }
    const registration = await registerAccount({ email, password, fullName, role });
    if (!registration.ok) { setErrorMessage(registration.error); return; }
    setIsLogin(true); syncAuthStateInUrl(true, role);
    setUse2fa(false); setCode2fa(''); setConfirmPassword(''); setFullName(''); setPassword('');
    setInfoMessage('Compte créé avec succès. Vous pouvez maintenant vous connecter.');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null); setInfoMessage(null); setIsLoading(true);
    try { isLogin ? await handleLogin() : await handleRegister(); }
    catch (err) { console.error('Auth error:', err); setErrorMessage('Impossible de joindre le serveur. Veuillez réessayer.'); }
    finally { setIsLoading(false); }
  };

  /* ── Auth check loading ── */
  if (isAuthCheckLoading) {
    return (
      <div style={PAGE_STYLE}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '40px 48px', borderRadius: 'var(--bank-radius-2xl)', border: '1px solid var(--bank-border-subtle)', background: 'var(--bank-bg-surface)' }}>
          <BankSpinner size={32} />
          <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--bank-text-tertiary)' }}>
            Vérification de la session…
          </span>
        </div>
      </div>
    );
  }

  const strengthColors = ['transparent', '#ef4444', '#f59e0b', '#eab308', '#22c55e'];

  /* ══════════════════════════════════════════════════════
     RENDU PRINCIPAL
     ══════════════════════════════════════════════════════ */
  return (
    <div style={PAGE_STYLE}>
      {/* Grilles de fond */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', backgroundImage: `linear-gradient(rgba(129,140,248,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(129,140,248,0.04) 1px, transparent 1px)`, backgroundSize: '48px 48px' }} aria-hidden="true" />
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse 60% 50% at 10% 20%, rgba(79,70,229,0.12), transparent), radial-gradient(ellipse 50% 40% at 85% 80%, rgba(45,212,191,0.08), transparent)' }} aria-hidden="true" />

      <div style={{ position: 'relative', zIndex: 1, display: 'grid', gridTemplateColumns: '1fr', gap: 32, maxWidth: 1100, width: '100%', padding: '48px 24px' }}
        className="bk-login-grid">

        {/* ══════════════════════ FORMULAIRE ══════════════════════ */}
        <section style={{ borderRadius: 'var(--bank-radius-2xl)', border: '1px solid var(--bank-border-subtle)', background: 'color-mix(in srgb, var(--bank-bg-surface) 92%, transparent)', backdropFilter: 'blur(16px)', padding: '36px 40px', display: 'flex', flexDirection: 'column' }}>

          {/* Logo */}
          <header style={{ marginBottom: 32 }}>
            <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 12, textDecoration: 'none' }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg, #4F46E5, #2DD4BF)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Shield size={20} strokeWidth={2} color="white" aria-hidden="true" />
              </div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--bank-accent)' }}>Plateforme Monétique Pédagogique</div>
                <div style={{ fontSize: 18, fontWeight: 700, fontStyle: 'italic', letterSpacing: '-0.02em', color: 'var(--bank-text-primary)' }}>MoneTIC</div>
              </div>
            </Link>
          </header>

          {/* Tabs */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, padding: 4, borderRadius: 'var(--bank-radius-lg)', border: '1px solid var(--bank-border-subtle)', background: 'var(--bank-bg-elevated)', marginBottom: 28 }}>
            {[{ label: 'Connexion', val: true }, { label: 'Inscription', val: false }].map(({ label, val }) => (
              <button key={label} type="button" onClick={() => switchMode(val)}
                style={{ padding: '10px 16px', borderRadius: 'calc(var(--bank-radius-lg) - 4px)', border: 'none', background: isLogin === val ? 'var(--bank-bg-surface)' : 'transparent', color: isLogin === val ? 'var(--bank-text-primary)' : 'var(--bank-text-tertiary)', fontSize: 'var(--bank-text-xs)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', cursor: 'pointer', transition: 'all var(--bank-t-fast)', boxShadow: isLogin === val ? 'var(--bank-shadow-sm)' : 'none' }}>
                {label}
              </button>
            ))}
          </div>

          {/* Titre */}
          <div style={{ marginBottom: 24 }}>
            <h1 style={{ fontSize: 'var(--bank-text-2xl)', fontWeight: 'var(--bank-font-bold)', color: 'var(--bank-text-primary)', marginBottom: 6 }}>
              {isLogin ? 'Connexion à votre espace' : 'Créer un compte'}
            </h1>
            <p style={{ fontSize: 'var(--bank-text-sm)', color: 'var(--bank-text-tertiary)' }}>
              {isLogin ? 'Renseignez vos identifiants pour accéder à la plateforme.' : 'Choisissez votre profil et renseignez vos informations.'}
            </p>
          </div>

          {/* Sélecteur de rôle (inscription) */}
          {!isLogin && (
            <div style={{ marginBottom: 24 }}>
              <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--bank-text-tertiary)', marginBottom: 10 }}>Profil</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                {ROLE_OPTIONS.map(opt => {
                  const Icon    = opt.icon;
                  const isActive = opt.role === role;
                  return (
                    <button key={opt.role} type="button" onClick={() => handleRoleChange(opt.role)}
                      style={{ padding: '12px', borderRadius: 'var(--bank-radius-md)', border: `1px solid ${isActive ? `color-mix(in srgb, ${opt.color} 50%, transparent)` : 'var(--bank-border-default)'}`, background: isActive ? `color-mix(in srgb, ${opt.color} 10%, transparent)` : 'var(--bank-bg-elevated)', cursor: 'pointer', textAlign: 'left', transition: 'all var(--bank-t-fast)' }}>
                      <div style={{ width: 30, height: 30, borderRadius: 8, background: opt.color, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                        <Icon size={14} strokeWidth={2} color="white" aria-hidden="true" />
                      </div>
                      <div style={{ fontSize: 'var(--bank-text-xs)', fontWeight: 600, color: 'var(--bank-text-primary)' }}>{opt.label}</div>
                      <div style={{ fontSize: 11, color: 'var(--bank-text-tertiary)', marginTop: 2 }}>{opt.audience}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Preset rapide (connexion) */}
          {isLogin && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20 }}>
              <span style={{ fontSize: 11, color: 'var(--bank-text-tertiary)', marginRight: 4, display: 'flex', alignItems: 'center' }}>Tester :</span>
              {ROLE_OPTIONS.map(opt => {
                const Icon = opt.icon;
                return (
                  <button key={opt.role} type="button" onClick={() => { handleRoleChange(opt.role); applyRolePreset(opt.role); }}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 'var(--bank-radius-full)', border: `1px solid color-mix(in srgb, ${opt.color} 35%, transparent)`, background: `color-mix(in srgb, ${opt.color} 8%, transparent)`, color: opt.color, fontSize: 11, fontWeight: 600, cursor: 'pointer', transition: 'all var(--bank-t-fast)' }}>
                    <Icon size={11} strokeWidth={2.5} aria-hidden="true" />
                    {opt.label}
                  </button>
                );
              })}
            </div>
          )}

          {/* Messages */}
          {errorMessage && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 16px', borderRadius: 'var(--bank-radius-md)', border: '1px solid color-mix(in srgb, var(--bank-danger) 30%, transparent)', background: 'color-mix(in srgb, var(--bank-danger) 8%, transparent)', marginBottom: 20 }}>
              <ShieldAlert size={15} strokeWidth={2} style={{ color: 'var(--bank-danger)', flexShrink: 0, marginTop: 1 }} aria-hidden="true" />
              <span style={{ fontSize: 'var(--bank-text-sm)', color: 'var(--bank-danger)' }}>{errorMessage}</span>
            </div>
          )}
          {infoMessage && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 16px', borderRadius: 'var(--bank-radius-md)', border: '1px solid color-mix(in srgb, var(--bank-success) 30%, transparent)', background: 'color-mix(in srgb, var(--bank-success) 8%, transparent)', marginBottom: 20 }}>
              <CheckCircle2 size={15} strokeWidth={2} style={{ color: 'var(--bank-success)', flexShrink: 0, marginTop: 1 }} aria-hidden="true" />
              <span style={{ fontSize: 'var(--bank-text-sm)', color: 'var(--bank-success)' }}>{infoMessage}</span>
            </div>
          )}

          {/* Formulaire */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {!isLogin && (
              <AuthField id="fullName" label="Nom complet" value={fullName} onChange={v => { setFullName(v); setErrorMessage(null); }} icon={UserIcon} placeholder="Prénom Nom" autoComplete="name" />
            )}

            <AuthField id="email" label="Adresse e-mail" value={email} onChange={v => { setEmail(v); setErrorMessage(null); }} icon={Mail} placeholder="votre@email.com" autoComplete="email" type="email" />

            <AuthField
              id="password"
              label="Mot de passe"
              value={password}
              onChange={v => { setPassword(v); setErrorMessage(null); }}
              icon={Lock}
              placeholder="••••••••"
              type={showPassword ? 'text' : 'password'}
              autoComplete={isLogin ? 'current-password' : 'new-password'}
              trailing={
                <button type="button" onClick={() => setShowPassword(v => !v)} tabIndex={-1}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--bank-text-tertiary)', display: 'flex', alignItems: 'center' }}>
                  {showPassword ? <EyeOff size={15} aria-label="Cacher" /> : <Eye size={15} aria-label="Afficher" />}
                </button>
              }
            />

            {!isLogin && (
              <div>
                <AuthField id="confirm" label="Confirmer le mot de passe" value={confirmPassword} onChange={v => { setConfirmPassword(v); setErrorMessage(null); }} icon={Lock} placeholder="••••••••" type="password" autoComplete="new-password" />
                {confirmPassword.trim().length > 0 && (
                  <p style={{ fontSize: 12, color: isPasswordMismatch ? 'var(--bank-danger)' : 'var(--bank-success)', marginTop: 4 }}>
                    {isPasswordMismatch ? 'Les mots de passe ne correspondent pas.' : 'Les mots de passe correspondent.'}
                  </p>
                )}
                {/* Jauge robustesse */}
                <div style={{ height: 4, borderRadius: 'var(--bank-radius-full)', background: 'var(--bank-bg-elevated)', overflow: 'hidden', marginTop: 8 }}>
                  <div style={{ height: '100%', borderRadius: 'var(--bank-radius-full)', background: strengthColors[passwordStrength] || 'transparent', width: `${Math.max(5, (passwordStrength / 4) * 100)}%`, transition: 'width 0.3s ease, background 0.3s ease' }} />
                </div>
              </div>
            )}

            {isLogin && use2fa && (
              <AuthField id="code2fa" label="Code d'authentification (2FA)" value={code2fa} onChange={v => { setCode2fa(v); setErrorMessage(null); }} icon={Shield} placeholder="123456" autoComplete="one-time-code" />
            )}

            <button type="submit" disabled={!canSubmit}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '14px 20px', borderRadius: 'var(--bank-radius-md)', border: 'none', background: canSubmit ? 'var(--bank-accent)' : 'var(--bank-bg-elevated)', color: canSubmit ? 'white' : 'var(--bank-text-tertiary)', fontSize: 'var(--bank-text-sm)', fontWeight: 600, cursor: canSubmit ? 'pointer' : 'not-allowed', opacity: isLoading ? 0.7 : 1, transition: 'all var(--bank-t-normal)', marginTop: 4 }}>
              {isLoading
                ? <BankSpinner size={18} />
                : <>{isLogin ? 'Se connecter' : 'Créer le compte'}<ArrowRight size={16} aria-hidden="true" /></>
              }
            </button>
          </form>

          <p style={{ marginTop: 24, textAlign: 'center', fontSize: 'var(--bank-text-xs)', color: 'var(--bank-text-tertiary)' }}>
            {isLogin ? 'Pas encore de compte ?' : 'Déjà inscrit ?'}{' '}
            <button type="button" onClick={() => switchMode(!isLogin)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--bank-accent)', fontWeight: 600, fontSize: 'inherit', padding: 0 }}>
              {isLogin ? "S'inscrire" : 'Se connecter'}
            </button>
          </p>
        </section>

        {/* ══════════════════════ PANNEAU LATÉRAL ══════════════════════ */}
        <aside style={{ borderRadius: 'var(--bank-radius-2xl)', border: '1px solid var(--bank-border-subtle)', background: 'color-mix(in srgb, var(--bank-bg-surface) 60%, transparent)', backdropFilter: 'blur(12px)', padding: '36px 40px', display: 'flex', flexDirection: 'column', gap: 24 }}
          className="bk-login-aside">
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '4px 12px', borderRadius: 'var(--bank-radius-full)', border: '1px solid var(--bank-border-default)', background: 'var(--bank-bg-elevated)', fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--bank-text-tertiary)', marginBottom: 16 }}>
              <Shield size={12} aria-hidden="true" />
              Accès sécurisé
            </div>
            <h2 style={{ fontSize: 'var(--bank-text-xl)', fontWeight: 'var(--bank-font-bold)', color: 'var(--bank-text-primary)', marginBottom: 8 }}>
              Un accès adapté à chaque profil
            </h2>
            <p style={{ fontSize: 'var(--bank-text-sm)', color: 'var(--bank-text-tertiary)', lineHeight: 1.6 }}>
              La plateforme oriente automatiquement chaque utilisateur vers son espace métier après authentification.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {ROLE_OPTIONS.map(opt => {
              const Icon = opt.icon;
              return (
                <div key={opt.role} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '16px', borderRadius: 'var(--bank-radius-lg)', border: '1px solid var(--bank-border-subtle)', background: 'var(--bank-bg-elevated)' }}>
                  <div style={{ width: 34, height: 34, borderRadius: 8, background: opt.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                    <Icon size={16} strokeWidth={2} color="white" aria-hidden="true" />
                  </div>
                  <div>
                    <div style={{ fontSize: 'var(--bank-text-sm)', fontWeight: 600, color: 'var(--bank-text-primary)', marginBottom: 2 }}>{opt.label}</div>
                    <p style={{ fontSize: 'var(--bank-text-xs)', color: 'var(--bank-text-tertiary)', lineHeight: 1.5 }}>{opt.description}</p>
                    <span style={{ display: 'inline-block', marginTop: 6, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: opt.color, background: `color-mix(in srgb, ${opt.color} 10%, transparent)`, padding: '2px 8px', borderRadius: 'var(--bank-radius-full)', border: `1px solid color-mix(in srgb, ${opt.color} 25%, transparent)` }}>
                      {opt.strongAuthHint}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: 'auto', padding: '12px 16px', borderRadius: 'var(--bank-radius-md)', border: '1px solid var(--bank-border-subtle)', background: 'var(--bank-bg-elevated)', fontSize: 'var(--bank-text-xs)', color: 'var(--bank-text-tertiary)', lineHeight: 1.6 }}>
            Les connexions sont protégées par JWT à courte durée de vie avec rotation automatique du jeton de rafraîchissement.
          </div>
        </aside>
      </div>

      {/* Responsive */}
      <style>{`
        [data-bank-theme] .bk-login-grid { grid-template-columns: 1fr; }
        @media (min-width: 1024px) {
          [data-bank-theme] .bk-login-grid { grid-template-columns: 1fr 0.85fr; }
        }
        [data-bank-theme] .bk-login-aside { display: none; }
        @media (min-width: 1024px) {
          [data-bank-theme] .bk-login-aside { display: flex; }
        }
        /* Fallback sans BankShell (login hors layout) */
        .bk-login-grid { grid-template-columns: 1fr; min-height: 100vh; align-items: center; }
        @media (min-width: 1024px) { .bk-login-grid { grid-template-columns: 1fr 0.85fr; } }
        .bk-login-aside { display: none; }
        @media (min-width: 1024px) { .bk-login-aside { display: flex; } }
      `}</style>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   CONSTANTES DE STYLE
   ══════════════════════════════════════════════════════ */
const PAGE_STYLE: React.CSSProperties = {
  position:       'relative',
  minHeight:      '100vh',
  overflow:       'hidden',
  background:     '#0C0E1A',
  display:        'flex',
  alignItems:     'center',
  justifyContent: 'center',
  padding:        '24px 16px',
  /* tokens disponibles via portal globals.css bank-theme.css */
  '--bank-bg-base':     '#0C0E1A',
  '--bank-bg-surface':  '#131525',
  '--bank-bg-elevated': '#1a1d2e',
  '--bank-text-primary':'#f1f5f9',
  '--bank-text-secondary':'#94a3b8',
  '--bank-text-tertiary':'#64748b',
  '--bank-border-subtle':'rgba(255,255,255,0.06)',
  '--bank-border-default':'rgba(255,255,255,0.10)',
  '--bank-accent':      '#818CF8',
  '--bank-danger':      '#ef4444',
  '--bank-success':     '#22c55e',
  '--bank-radius-full': '9999px',
  '--bank-radius-md':   '10px',
  '--bank-radius-lg':   '12px',
  '--bank-radius-2xl':  '20px',
  '--bank-t-fast':      '120ms ease',
  '--bank-t-normal':    '200ms ease',
  '--bank-shadow-sm':   '0 1px 3px rgba(0,0,0,0.3)',
  '--bank-text-xs':     '12px',
  '--bank-text-sm':     '14px',
  '--bank-text-xl':     '20px',
  '--bank-text-2xl':    '24px',
  '--bank-font-bold':   '700',
} as React.CSSProperties;

/* ══════════════════════════════════════════════════════
   EXPORT
   ══════════════════════════════════════════════════════ */
export default function UnifiedLoginPage() {
  return (
    <Suspense fallback={
      <div style={PAGE_STYLE}>
        <BankSpinner size={32} />
      </div>
    }>
      <UnifiedLoginContent />
    </Suspense>
  );
}
