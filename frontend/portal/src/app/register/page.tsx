'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
    CreditCard, Mail, Lock, User, ShieldCheck,
    ArrowRight, Loader2, Info, CheckCircle2
} from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function RegisterPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    // Form fields
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [role, setRole] = useState('ROLE_CLIENT');

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        const payload = {
            username: email.split('@')[0],
            email,
            password,
            firstName: fullName.split(' ')[0] || 'User',
            lastName: fullName.split(' ').slice(1).join(' ') || '.',
            role: role
        };

        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (data.success) {
                setIsSuccess(true);
                setTimeout(() => {
                    router.push('/login');
                }, 3000);
            } else {
                alert(`Erreur d'inscription : ${data.error || 'Inconnue'}`);
            }
        } catch (error) {
            console.error('Registration error:', error);
            alert('Erreur de connexion au serveur (API Gateway)');
        } finally {
            setIsLoading(false);
        }
    };

    if (isSuccess) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-950 p-6">
                <div className="max-w-md w-full text-center space-y-6 animate-in zoom-in-95 duration-500">
                    <div className="w-24 h-24 bg-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-2xl shadow-emerald-500/20">
                        <CheckCircle2 size={48} className="text-white" />
                    </div>
                    <h1 className="text-4xl font-black text-white italic">Succès !</h1>
                    <p className="text-slate-400 text-lg">
                        Votre compte a été créé avec succès. Vous allez être redirigé vers la page de connexion.
                    </p>
                    <div className="w-full h-1 bg-slate-900 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 animate-progress origin-left" />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col md:flex-row overflow-hidden text-white">
            {/* Form Section */}
            <div className="w-full md:w-1/2 p-8 md:p-16 lg:p-24 flex flex-col justify-center">
                <div className="max-w-md mx-auto w-full space-y-10 relative z-10">
                    <div>
                        <Link href="/" className="inline-flex items-center gap-3 mb-8 group">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                                <CreditCard size={20} />
                            </div>
                            <span className="font-bold text-xl tracking-tight">FINED-SIM</span>
                        </Link>
                        <h1 className="text-5xl font-black italic tracking-tighter mb-4">REJOINDRE<span className="text-blue-500 text-6xl">.</span></h1>
                        <p className="text-slate-400">Commencez votre formation aux protocoles de paiement dès aujourd'hui.</p>
                    </div>

                    <form onSubmit={handleRegister} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Nom Complet</label>
                            <div className="relative group">
                                <input
                                    type="text"
                                    required
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    className="w-full bg-slate-900 border border-white/5 rounded-2xl px-12 py-4 focus:outline-none focus:border-blue-500 transition-all font-medium"
                                    placeholder="Georges Dupont"
                                />
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-blue-500 transition-colors" size={20} />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">E-mail Professionnel</label>
                            <div className="relative group">
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-slate-900 border border-white/5 rounded-2xl px-12 py-4 focus:outline-none focus:border-blue-500 transition-all font-medium"
                                    placeholder="georges@pmp.edu"
                                />
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-blue-500 transition-colors" size={20} />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Mot de Passe</label>
                            <div className="relative group">
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-slate-900 border border-white/5 rounded-2xl px-12 py-4 focus:outline-none focus:border-blue-500 transition-all font-medium"
                                    placeholder="••••••••"
                                />
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-blue-500 transition-colors" size={20} />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Profil Utilisateur</label>
                            <select
                                value={role}
                                onChange={(e) => setRole(e.target.value)}
                                className="w-full bg-slate-900 border border-white/5 rounded-2xl px-6 py-4 focus:outline-none focus:border-blue-500 transition-all font-bold appearance-none cursor-pointer"
                            >
                                <option value="ROLE_CLIENT" className="font-bold">Client (Utilisateur Final)</option>
                                <option value="ROLE_MARCHAND" className="font-bold">Marchand (Acceptateur)</option>
                                <option value="ROLE_ETUDIANT" className="font-bold">Étudiant (Apprenant)</option>
                                <option value="ROLE_FORMATEUR" className="font-bold">Formateur (Expert)</option>
                            </select>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-blue-600 hover:bg-blue-500 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-xl shadow-blue-500/20 active:scale-95 transition-all disabled:opacity-50"
                        >
                            {isLoading ? <Loader2 className="animate-spin" /> : <>Créer mon compte <ArrowRight size={20} /></>}
                        </button>
                    </form>

                    <p className="text-center text-slate-500 font-medium">
                        Déjà inscrit ? <Link href="/login" className="text-white hover:underline">Se connecter</Link>
                    </p>
                </div>
            </div>

            {/* Visual Section */}
            <div className="hidden md:flex w-1/2 bg-blue-600 relative overflow-hidden flex-col items-center justify-center p-16 text-center">
                <div className="absolute inset-0 bg-grid-white/10 opacity-20" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-white rounded-full blur-[160px] opacity-10" />

                <div className="relative z-10 space-y-12">
                    <div className="w-32 h-32 bg-white/10 border border-white/20 backdrop-blur-xl rounded-[40px] flex items-center justify-center mx-auto shadow-2xl">
                        <ShieldCheck size={64} />
                    </div>
                    <div className="space-y-4">
                        <h2 className="text-5xl font-black italic uppercase leading-none">Sécurité par<br />le Design</h2>
                        <p className="text-blue-100/70 text-lg max-w-sm mx-auto">
                            Apprenez à construire des systèmes de paiement qui respectent les plus hauts standards de l'industrie.
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto">
                        <div className="p-4 bg-white/5 border border-white/10 rounded-2xl flex flex-col items-center gap-2">
                            <div className="text-2xl font-black font-mono">100%</div>
                            <div className="text-[10px] font-bold uppercase tracking-widest text-blue-200">Simulé</div>
                        </div>
                        <div className="p-4 bg-white/5 border border-white/10 rounded-2xl flex flex-col items-center gap-2">
                            <div className="text-2xl font-black font-mono">ISO</div>
                            <div className="text-[10px] font-bold uppercase tracking-widest text-blue-200">Conforme</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
