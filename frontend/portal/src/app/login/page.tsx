'use client';

import Link from 'next/link';
import { Suspense, useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Eye,
  EyeOff,
  GraduationCap,
  Lock,
  Mail,
  Shield,
  Store,
  User as UserIcon,
  type LucideIcon,
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';

import { useAuth as usePortalAuth } from '../auth/useAuth';
import { useAuth as useSharedAuth } from '@shared/context/AuthContext';
import { Permission, User as AuthUser, UserRole } from '@shared/types/user';
import { getRoleRedirectUrl, resolveSafeRedirectTarget } from '@shared/lib/app-urls';
import { normalizeRole } from '@shared/utils/roleUtils';
import { loginWithRole, registerAccount } from '@/lib/auth-client';
import { BankSpinner } from '@shared/components/banking/primitives/BankSpinner';

interface RoleOption {
  role: UserRole;
  label: string;
  audience: string;
  description: string;
  sampleEmail: string;
  samplePassword: string;
  color: string;
  icon: LucideIcon;
  destinationHint: string;
  strongAuthHint: string;
}

const ROLE_OPTIONS: RoleOption[] = [
  {
    role: UserRole.ETUDIANT,
    label: 'Apprenant',
    audience: 'Etudiant',
    description: 'Modules, quiz, progression et parcours pedagogique.',
    sampleEmail: 'student01@pmp.edu',
    samplePassword: 'qa-pass-123',
    color: '#10b981',
    icon: GraduationCap,
    destinationHint: '/student',
    strongAuthHint: 'Mot de passe',
  },
  {
    role: UserRole.FORMATEUR,
    label: 'Formateur',
    audience: 'Encadrant',
    description: 'Pilotage de cohortes, exercices et supervision des labs.',
    sampleEmail: 'trainer@pmp.edu',
    samplePassword: 'qa-pass-123',
    color: '#3b82f6',
    icon: Shield,
    destinationHint: '/instructor',
    strongAuthHint: 'Mot de passe + 2FA',
  },
  {
    role: UserRole.MARCHAND,
    label: 'Marchand',
    audience: 'Operations',
    description: 'Transactions, rapports et simulation terminal POS.',
    sampleEmail: 'bakery@pmp.edu',
    samplePassword: 'qa-pass-123',
    color: '#2dd4bf',
    icon: Store,
    destinationHint: 'TPE web',
    strongAuthHint: 'Mot de passe',
  },
  {
    role: UserRole.CLIENT,
    label: 'Client',
    audience: 'Carte',
    description: 'Comptes cartes, securite et historique de paiements.',
    sampleEmail: 'client@pmp.edu',
    samplePassword: 'qa-pass-123',
    color: '#818cf8',
    icon: UserIcon,
    destinationHint: 'MoneBank',
    strongAuthHint: 'Mot de passe',
  },
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
  return normalizeRole(rawRole) || UserRole.ETUDIANT;
}

function getStrengthColor(score: number): string {
  if (score <= 1) return '#ef4444';
  if (score === 2) return '#f59e0b';
  if (score === 3) return '#eab308';
  return '#22c55e';
}

function getStrengthLabel(score: number): string {
  if (score <= 1) return 'Faible';
  if (score === 2) return 'Moyen';
  if (score === 3) return 'Bon';
  return 'Fort';
}

function AuthField({
  id,
  label,
  value,
  onChange,
  icon: Icon,
  placeholder,
  type = 'text',
  autoComplete,
  trailing,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  icon: LucideIcon;
  placeholder: string;
  type?: string;
  autoComplete?: string;
  trailing?: React.ReactNode;
}) {
  return (
    <div className="portal-auth-field">
      <label className="portal-auth-label" htmlFor={id}>
        {label}
      </label>
      <div className="portal-auth-input-wrap">
        <span className="portal-auth-leading" aria-hidden="true">
          <Icon size={15} strokeWidth={2} />
        </span>
        <input
          id={id}
          className="portal-auth-input"
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required
        />
        {trailing ? <span className="portal-auth-trailing">{trailing}</span> : null}
      </div>
    </div>
  );
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
    () => ROLE_OPTIONS.find((option) => option.role === role) || ROLE_OPTIONS[0],
    [role],
  );
  const passwordStrength = useMemo(() => getPasswordStrength(password), [password]);
  const isPasswordMismatch = useMemo(
    () => !isLogin && confirmPassword.trim().length > 0 && password !== confirmPassword,
    [confirmPassword, isLogin, password],
  );

  const canSubmit = useMemo(() => {
    if (isLoading) return false;
    if (!email.trim() || !password.trim()) return false;
    if (isLogin) return !use2fa || code2fa.trim().length > 0;
    return fullName.trim().length > 0 && confirmPassword.trim().length > 0 && !isPasswordMismatch;
  }, [code2fa, confirmPassword, email, fullName, isLoading, isLogin, isPasswordMismatch, password, use2fa]);

  const authRootVars = useMemo(
    () => ({ '--portal-accent': activeRole.color } as React.CSSProperties),
    [activeRole.color],
  );

  useEffect(() => {
    const nextIsLogin = modeParam !== 'register';
    setIsLogin((current) => (current === nextIsLogin ? current : nextIsLogin));
    const nextRole = normalizeRoleFromQuery(roleParam);
    setRole((current) => (current === nextRole ? current : nextRole));
  }, [modeParam, roleParam]);

  const syncAuthStateInUrl = (nextIsLogin: boolean, nextRole: UserRole) => {
    const params = new URLSearchParams(searchParams.toString());
    if (nextIsLogin) params.delete('mode');
    else params.set('mode', 'register');

    if (nextRole === UserRole.ETUDIANT) params.delete('role');
    else params.set('role', nextRole);

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
    const selected = ROLE_OPTIONS.find((option) => option.role === selectedRole);
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
      code2fa: use2fa ? code2fa : undefined,
    });

    if (!result.ok) {
      if (result.code === 'AUTH_2FA_REQUIRED') {
        setUse2fa(true);
        setInfoMessage("Un code d'authentification a deux facteurs est requis.");
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
        ? userFromApi.permissions.filter(
            (value): value is Permission => typeof value === 'string' && isPermission(value),
          )
        : [],
    };

    establishSession(result.data.accessToken, normalizedUser, result.data.refreshToken || null);

    const redirectParam = searchParams.get('redirect');
    const redirectTarget = resolveSafeRedirectTarget(redirectParam, normalizedRole, window.location.origin);

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

    const registration = await registerAccount({ email, password, fullName, role });
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
    setInfoMessage('Compte cree avec succes. Vous pouvez maintenant vous connecter.');
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrorMessage(null);
    setInfoMessage(null);
    setIsLoading(true);

    try {
      if (isLogin) await handleLogin();
      else await handleRegister();
    } catch (error) {
      console.error('Auth error:', error);
      setErrorMessage('Impossible de joindre le serveur. Veuillez reessayer.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isAuthCheckLoading) {
    return (
      <div className="portal-auth-root" style={authRootVars}>
        <div
          className="portal-auth-shell"
          style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center' }}
        >
          <div className="portal-auth-panel" style={{ maxWidth: 340, textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
              <BankSpinner size={32} />
            </div>
            <p style={{ margin: 0, fontSize: 13, color: '#cbd5e1' }}>Verification de la session...</p>
          </div>
        </div>
      </div>
    );
  }

  const strengthColor = getStrengthColor(passwordStrength);
  const strengthLabel = getStrengthLabel(passwordStrength);

  return (
    <div className="portal-auth-root" style={authRootVars}>
      <div className="portal-auth-shell">
        <div className="portal-auth-grid">
          <section className="portal-auth-panel">
            <header style={{ display: 'grid', gap: 16, marginBottom: 24 }}>
              <Link className="portal-auth-brand" href="/" prefetch={false}>
                <span className="portal-auth-logo" aria-hidden="true">
                  <Shield size={20} strokeWidth={2.2} color="white" />
                </span>
                <span style={{ display: 'grid', gap: 2 }}>
                  <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#67e8f9', fontWeight: 700 }}>
                    Plateforme monetique pedagogique
                  </span>
                  <strong style={{ fontSize: 20, color: '#f8fafc', letterSpacing: '-0.02em' }}>MoneTIC</strong>
                </span>
              </Link>

              <div className="portal-auth-tabs" role="tablist" aria-label="Mode authentification">
                <button
                  className="portal-auth-tab"
                  type="button"
                  aria-pressed={isLogin}
                  onClick={() => switchMode(true)}
                >
                  Connexion
                </button>
                <button
                  className="portal-auth-tab"
                  type="button"
                  aria-pressed={!isLogin}
                  onClick={() => switchMode(false)}
                >
                  Inscription
                </button>
              </div>

              <div>
                <h1 style={{ margin: 0, color: '#f8fafc', fontSize: 'clamp(1.5rem, 3vw, 2rem)', letterSpacing: '-0.02em' }}>
                  {isLogin ? 'Acceder a votre espace' : 'Creer un compte MoneTIC'}
                </h1>
                <p style={{ margin: '8px 0 0', color: '#94a3b8', fontSize: 14, lineHeight: 1.6 }}>
                  {isLogin
                    ? 'Authentifiez-vous puis entrez directement dans votre environnement de travail.'
                    : 'Selectionnez votre profil pour provisionner un compte avec les bons droits.'}
                </p>
              </div>
            </header>

            {!isLogin ? (
              <div style={{ marginBottom: 18 }}>
                <p className="portal-auth-label" style={{ marginBottom: 8 }}>
                  Profil cible
                </p>
                <div className="portal-auth-role-grid">
                  {ROLE_OPTIONS.map((option) => {
                    const Icon = option.icon;
                    return (
                      <button
                        key={option.role}
                        className="portal-auth-role-btn"
                        type="button"
                        aria-pressed={option.role === role}
                        style={{ '--portal-role': option.color } as React.CSSProperties}
                        onClick={() => handleRoleChange(option.role)}
                      >
                        <span className="portal-auth-role-icon" aria-hidden="true">
                          <Icon size={15} strokeWidth={2.2} />
                        </span>
                        <span style={{ display: 'grid', gap: 2 }}>
                          <strong style={{ fontSize: 13 }}>{option.label}</strong>
                          <span style={{ fontSize: 11, color: '#94a3b8' }}>{option.audience}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="portal-auth-preset-row" style={{ marginBottom: 18 }}>
                <span style={{ fontSize: 12, color: '#9caec9' }}>Mode test:</span>
                {ROLE_OPTIONS.map((option) => {
                  const Icon = option.icon;
                  return (
                    <button
                      key={option.role}
                      className="portal-auth-preset-btn"
                      type="button"
                      style={{ '--portal-role': option.color } as React.CSSProperties}
                      onClick={() => {
                        handleRoleChange(option.role);
                        applyRolePreset(option.role);
                      }}
                    >
                      <Icon size={12} aria-hidden="true" />
                      {option.label}
                    </button>
                  );
                })}
              </div>
            )}

            {errorMessage ? <div className="portal-auth-message portal-auth-message--error">{errorMessage}</div> : null}
            {infoMessage ? <div className="portal-auth-message portal-auth-message--success">{infoMessage}</div> : null}

            <form className="portal-auth-form" onSubmit={handleSubmit}>
              {!isLogin ? (
                <AuthField
                  id="fullName"
                  label="Nom complet"
                  value={fullName}
                  onChange={(value) => {
                    setFullName(value);
                    setErrorMessage(null);
                  }}
                  icon={UserIcon}
                  placeholder="Prenom Nom"
                  autoComplete="name"
                />
              ) : null}

              <AuthField
                id="email"
                label="Adresse e-mail"
                value={email}
                onChange={(value) => {
                  setEmail(value);
                  setErrorMessage(null);
                }}
                icon={Mail}
                placeholder="votre@email.com"
                autoComplete="email"
                type="email"
              />

              <AuthField
                id="password"
                label="Mot de passe"
                value={password}
                onChange={(value) => {
                  setPassword(value);
                  setErrorMessage(null);
                }}
                icon={Lock}
                placeholder="********"
                type={showPassword ? 'text' : 'password'}
                autoComplete={isLogin ? 'current-password' : 'new-password'}
                trailing={
                  <button
                    className="portal-auth-toggle"
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                }
              />

              {!isLogin ? (
                <>
                  <AuthField
                    id="confirm"
                    label="Confirmer le mot de passe"
                    value={confirmPassword}
                    onChange={(value) => {
                      setConfirmPassword(value);
                      setErrorMessage(null);
                    }}
                    icon={Lock}
                    placeholder="********"
                    type="password"
                    autoComplete="new-password"
                  />

                  {confirmPassword.trim().length > 0 ? (
                    <p style={{ margin: 0, fontSize: 12, color: isPasswordMismatch ? '#fda4af' : '#86efac' }}>
                      {isPasswordMismatch
                        ? 'Les mots de passe ne correspondent pas.'
                        : 'Les mots de passe correspondent.'}
                    </p>
                  ) : null}

                  <div style={{ display: 'grid', gap: 6 }}>
                    <div className="portal-auth-strength" aria-hidden="true">
                      <div
                        className="portal-auth-strength-fill"
                        style={{
                          width: `${Math.max(5, (passwordStrength / 4) * 100)}%`,
                          backgroundColor: strengthColor,
                        }}
                      />
                    </div>
                    <p style={{ margin: 0, fontSize: 12, color: '#9fb0ca' }}>
                      Robustesse mot de passe: <strong style={{ color: '#e2e8f0' }}>{strengthLabel}</strong>
                    </p>
                  </div>
                </>
              ) : null}

              {isLogin && use2fa ? (
                <AuthField
                  id="code2fa"
                  label="Code authentification 2FA"
                  value={code2fa}
                  onChange={(value) => {
                    setCode2fa(value);
                    setErrorMessage(null);
                  }}
                  icon={Shield}
                  placeholder="123456"
                  autoComplete="one-time-code"
                />
              ) : null}

              <button className="portal-auth-submit" type="submit" disabled={!canSubmit}>
                {isLoading ? (
                  <BankSpinner size={16} />
                ) : (
                  <>
                    {isLogin ? 'Se connecter' : 'Creer le compte'}
                    <ArrowRight size={15} aria-hidden="true" />
                  </>
                )}
              </button>
            </form>

            <p style={{ margin: '16px 0 0', textAlign: 'center', fontSize: 13, color: '#a3b5d0' }}>
              {isLogin ? 'Pas encore de compte ? ' : 'Deja inscrit ? '}
              <button className="portal-auth-link-toggle" type="button" onClick={() => switchMode(!isLogin)}>
                {isLogin ? "S'inscrire" : 'Se connecter'}
              </button>
            </p>
          </section>

          <aside className="portal-auth-aside" aria-label="Informations de securite et acces">
            <span className="portal-auth-kicker">
              <Shield size={12} aria-hidden="true" />
              Acces securise
            </span>
            <h2 style={{ margin: 0, color: '#f8fafc', fontSize: 'clamp(1.2rem, 2.2vw, 1.7rem)', letterSpacing: '-0.02em' }}>
              Un portail unique, des environnements specialises
            </h2>
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.65, color: '#9fb0ca' }}>
              L&apos;authentification dirige automatiquement chaque profil vers sa zone metier avec permissions dediees.
            </p>

            <div style={{ display: 'grid', gap: 10 }}>
              {ROLE_OPTIONS.map((option) => {
                const Icon = option.icon;
                return (
                  <article key={option.role} className="portal-auth-info-card">
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                      <span
                        className="portal-auth-role-icon"
                        style={{ '--portal-role': option.color, width: 30, height: 30, borderRadius: 9 } as React.CSSProperties}
                        aria-hidden="true"
                      >
                        <Icon size={14} />
                      </span>
                      <div style={{ display: 'grid', gap: 4 }}>
                        <strong style={{ color: '#f1f5f9', fontSize: 13 }}>{option.label}</strong>
                        <span style={{ color: '#a5b4cf', fontSize: 12, lineHeight: 1.45 }}>{option.description}</span>
                        <span
                          style={{
                            width: 'fit-content',
                            borderRadius: 999,
                            padding: '2px 8px',
                            fontSize: 10,
                            letterSpacing: '0.07em',
                            textTransform: 'uppercase',
                            color: option.color,
                            border: `1px solid color-mix(in srgb, ${option.color} 30%, transparent)`,
                            background: `color-mix(in srgb, ${option.color} 12%, rgba(15, 23, 42, 0.6))`,
                          }}
                        >
                          {option.strongAuthHint}
                        </span>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="portal-auth-info-card" style={{ marginTop: 'auto' }}>
              <p style={{ margin: 0, fontSize: 12, color: '#c8d3e7', lineHeight: 1.6 }}>
                Session JWT courte duree, rotation refresh token et redirection role-safe activee.
              </p>
              <p style={{ margin: '8px 0 0', fontSize: 11, color: '#8da0be' }}>
                Destination en cours: <strong style={{ color: activeRole.color }}>{activeRole.destinationHint}</strong>
              </p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

export default function UnifiedLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="portal-auth-root" style={{ display: 'grid', placeItems: 'center' }}>
          <BankSpinner size={30} />
        </div>
      }
    >
      <UnifiedLoginContent />
    </Suspense>
  );
}
