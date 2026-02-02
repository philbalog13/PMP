'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
    CreditCard, Mail, Lock, Eye, EyeOff, ArrowRight, Loader2,
    Store, GraduationCap, Presentation, ShieldCheck, KeyRound, User, Check, ShieldAlert
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../auth/useAuth';
import { UserRole } from '@shared/types/user';

export default function UnifiedLoginPage() {
    const router = useRouter();
    const { isLoading: isAuthCheckLoading } = useAuth(false);

    // ALL hooks must be called before any conditional returns
    const [isLogin, setIsLogin] = useState(true);
    const [role, setRole] = useState<UserRole>(UserRole.ETUDIANT); // Default to student for learning platform
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // Form fields - moved BEFORE conditional return to fix React Error #310
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [certificate, setCertificate] = useState('');
    const [code2fa, setCode2fa] = useState('');
    const [use2fa, setUse2fa] = useState(false);

    // Loading state check - AFTER all hooks are declared
    if (isAuthCheckLoading) {
        return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
            <div className="flex flex-col items-center gap-6">
                <Loader2 className="animate-spin w-12 h-12 text-blue-500" />
                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500">Checking Session...</span>
            </div>
        </div>;
    }

    const handleRoleChange = (newRole: UserRole) => {
        setRole(newRole);
        if (isLogin) {
            switch (newRole) {
                case UserRole.CLIENT: setEmail('client@pmp.edu'); setPassword('qa-pass-123'); break;
                case UserRole.MARCHAND: setEmail('bakery@pmp.edu'); setPassword('qa-pass-123'); setCertificate('SIMULATED_CERT_001'); break;
                case UserRole.ETUDIANT: setEmail('student01@pmp.edu'); setPassword('qa-pass-123'); break;
                case UserRole.FORMATEUR: setEmail('trainer@pmp.edu'); setPassword('qa-pass-123'); break;
            }
        }
    };

    const toggleMode = () => {
        setIsLogin(!isLogin);
        setEmail('');
        setPassword('');
        setConfirmPassword('');
        setFullName('');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            if (isLogin) {
                await handleLogin();
            } else {
                await handleRegister();
            }
        } catch (error) {
            console.error('Auth error:', error);
            alert('Erreur de connexion au serveur (API Gateway)');
        } finally {
            setIsLoading(false);
        }
    };

    const handleLogin = async () => {
        let endpoint = '';
        let payload: any = { email, password };
        let defaultRedirectUrl = '';

        switch (role) {
            case UserRole.CLIENT: endpoint = '/api/auth/client/login'; defaultRedirectUrl = '/client'; break;
            case UserRole.MARCHAND: endpoint = '/api/auth/marchand/login'; defaultRedirectUrl = '/merchant'; payload.certificate = certificate; break;
            case UserRole.ETUDIANT: endpoint = '/api/auth/etudiant/login'; defaultRedirectUrl = '/student'; break;
            case UserRole.FORMATEUR: endpoint = '/api/auth/formateur/login'; defaultRedirectUrl = '/instructor'; payload.code2fa = 'ADMIN_SECRET'; break;
        }

        console.log('[Login] Attempting login to:', endpoint, 'with email:', email);

        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        console.log('[Login] Response:', { success: data.success, hasToken: !!data.accessToken });

        if (data.success && data.accessToken) {
            // Store accessToken in localStorage
            localStorage.setItem('token', data.accessToken);
            localStorage.setItem('user', JSON.stringify(data.user));
            localStorage.setItem('role', role);

            // Also store token in cookie for middleware access (server-side)
            document.cookie = `token=${data.accessToken}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;

            console.log('[Login] Credentials stored, token length:', data.accessToken.length);

            // Check for redirect parameter in URL
            const urlParams = new URLSearchParams(window.location.search);
            const redirectParam = urlParams.get('redirect');
            const finalRedirect = redirectParam || defaultRedirectUrl;

            console.log('[Login] Redirecting to:', finalRedirect);

            // Force navigation with window.location for full page reload
            window.location.href = finalRedirect;
        } else {
            alert(`Erreur de connexion : ${data.error || 'Accès refusé'}`);
        }
    };

    const handleRegister = async () => {
        if (password !== confirmPassword) { alert('Les mots de passe ne correspondent pas'); return; }

        const payload = {
            username: email.split('@')[0],
            email, password,
            firstName: fullName.split(' ')[0] || 'User',
            lastName: fullName.split(' ').slice(1).join(' ') || '.',
            role: role // role is already ROLE_ETUDIANT etc.
        };
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await response.json();
        if (data.success) {
            alert('Compte créé !'); setIsLogin(true); setEmail(payload.email);
        } else {
            alert(`Erreur d'inscription : ${data.error || 'Inconnue'}`);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 text-white flex relative overflow-hidden">
            {/* Background Patterns */}
            <div className="absolute top-0 left-0 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 pointer-events-none" />

            {/* Form Section */}
            <div className="w-full lg:w-[40%] p-8 md:p-12 lg:p-20 flex flex-col justify-center relative z-10 bg-slate-950 shadow-[50px_0_100px_rgba(0,0,0,0.5)]">
                <div className="max-w-md mx-auto w-full space-y-12">
                    {/* Brand */}
                    <Link href="/" className="flex items-center gap-4 group">
                        <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center shadow-2xl shadow-blue-500/40 group-hover:rotate-12 transition-transform">
                            <CreditCard className="text-white w-6 h-6" />
                        </div>
                        <span className="text-2xl font-black italic tracking-tighter uppercase">PMP <span className="text-blue-500">LAB.</span></span>
                    </Link>

                    <div className="space-y-4">
                        <h1 className="text-4xl md:text-5xl font-black italic tracking-tighter uppercase whitespace-nowrap">
                            {isLogin ? 'Authentification' : 'Rejoindre Lab'}
                        </h1>
                        <p className="text-slate-500 font-medium">Accédez à votre environnement pédagogique industriel.</p>
                    </div>

                    {/* Role Pick */}
                    <div className="grid grid-cols-4 gap-2 bg-slate-900/50 p-2 rounded-2xl border border-white/5">
                        <RoleMiniBtn active={role === UserRole.ETUDIANT} onClick={() => handleRoleChange(UserRole.ETUDIANT)} icon={<GraduationCap size={16} />} />
                        <RoleMiniBtn active={role === UserRole.FORMATEUR} onClick={() => handleRoleChange(UserRole.FORMATEUR)} icon={<Presentation size={16} />} />
                        <RoleMiniBtn active={role === UserRole.MARCHAND} onClick={() => handleRoleChange(UserRole.MARCHAND)} icon={<Store size={16} />} />
                        <RoleMiniBtn active={role === UserRole.CLIENT} onClick={() => handleRoleChange(UserRole.CLIENT)} icon={<User size={16} />} />
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {!isLogin && (
                            <PremiumInput id="name" label="Nom Complet" value={fullName} onChange={setFullName} icon={<User size={18} />} placeholder="Nom Prenom" />
                        )}
                        <PremiumInput id="email" label="Email / ID" value={email} onChange={setEmail} icon={<Mail size={18} />} placeholder="name@pmp.edu" />

                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-1">Mot De Passe</label>
                            <div className="relative group">
                                <Lock size={18} className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-blue-500 transition-colors" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-slate-900 border border-white/5 rounded-3xl py-5 pl-16 pr-16 text-sm font-medium focus:outline-none focus:border-blue-500 transition-all placeholder:text-slate-700"
                                    placeholder="••••••••"
                                    required
                                />
                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-700 hover:text-white transition-colors">
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        {!isLogin && (
                            <PremiumInput id="confirm" label="Confirmation" value={confirmPassword} onChange={setConfirmPassword} icon={<ShieldCheck size={18} />} placeholder="••••••••" type="password" />
                        )}

                        <button
                            disabled={isLoading}
                            className="w-full py-5 bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-widest rounded-3xl transition-all shadow-2xl shadow-blue-500/40 flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50"
                        >
                            {isLoading ? <Loader2 className="animate-spin" /> : (
                                <> {isLogin ? 'Ouvrir la session' : 'Créer le compte'} <ArrowRight size={18} /></>
                            )}
                        </button>
                    </form>

                    <p className="text-center text-xs font-bold uppercase tracking-widest text-slate-500">
                        {isLogin ? "Pas de compte ?" : "Déjà membre ?"}
                        <button onClick={toggleMode} className="ml-2 text-white hover:text-blue-500 underline decoration-blue-500/30 underline-offset-4">{isLogin ? "Créer maintenant" : "Se connecter"}</button>
                    </p>
                </div>
            </div>

            {/* Visual Section */}
            <div className="hidden lg:flex flex-1 relative bg-slate-900 items-center justify-center p-20">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 to-transparent" />
                <div className="relative z-10 text-center space-y-8">
                    <div className="w-24 h-24 bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[32px] mx-auto flex items-center justify-center shadow-3xl group">
                        {role === UserRole.ETUDIANT && <GraduationCap size={48} className="text-emerald-500" />}
                        {role === UserRole.FORMATEUR && <Presentation size={48} className="text-blue-500" />}
                        {role === UserRole.MARCHAND && <Store size={48} className="text-purple-500" />}
                        {role === UserRole.CLIENT && <User size={48} className="text-amber-500" />}
                    </div>
                    <div className="space-y-4">
                        <h2 className="text-5xl font-black italic tracking-tighter uppercase">{roleLabels[role]}</h2>
                        <p className="text-slate-400 text-xl font-medium max-w-sm mx-auto leading-relaxed">
                            {roleDescriptions[role]}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

function RoleMiniBtn({ active, onClick, icon }: any) {
    return (
        <button onClick={onClick} className={`flex items-center justify-center p-4 rounded-xl transition-all ${active ? 'bg-blue-600 text-white shadow-xl' : 'text-slate-600 hover:bg-white/5 hover:text-white'}`}>
            {icon}
        </button>
    );
}

function PremiumInput({ id, label, value, onChange, icon, placeholder, type = "text" }: any) {
    return (
        <div className="space-y-2">
            <label htmlFor={id} className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-1">{label}</label>
            <div className="relative group">
                <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-blue-500 transition-colors">
                    {icon}
                </div>
                <input
                    id={id}
                    type={type}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="w-full bg-slate-900 border border-white/5 rounded-3xl py-5 pl-16 pr-6 text-sm font-medium focus:outline-none focus:border-blue-500 transition-all placeholder:text-slate-700"
                    placeholder={placeholder}
                    required
                />
            </div>
        </div>
    );
}

const roleLabels: any = { [UserRole.ETUDIANT]: 'Apprenant', [UserRole.FORMATEUR]: 'Expert Formateur', [UserRole.MARCHAND]: 'Portail Marchand', [UserRole.CLIENT]: 'Simulation Client' };
const roleDescriptions: any = {
    [UserRole.ETUDIANT]: 'Accédez à vos modules, passez vos certifications et maîtrisez les protocoles.',
    [UserRole.FORMATEUR]: 'Surveillez les cohortes, gérez les sessions et auditez les échecs.',
    [UserRole.MARCHAND]: 'Analysez les flux financiers, gérez vos certificats et simulez des ventes.',
    [UserRole.CLIENT]: 'Gérez vos cartes, visualisez vos paiements et testez les limites de débit.'
};
