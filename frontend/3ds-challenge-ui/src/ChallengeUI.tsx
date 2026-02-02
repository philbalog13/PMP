/**
 * 3DS Challenge UI - Pedagogical Version
 * Designed to teach the 3DS verification flow.
 */

import { useState, useEffect } from 'react';
import axios from 'axios';
import { ShieldCheck, Info, ArrowRight, Lock, Smartphone, HelpCircle, CheckCircle2, AlertCircle } from 'lucide-react';

export function ChallengeUI() {
    const [otp, setOtp] = useState('');
    const [status, setStatus] = useState<'pending' | 'success' | 'failed'>('pending');
    const [message, setMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [step, setStep] = useState(0);

    // Get transaction ID from URL params
    const params = new URLSearchParams(window.location.search);
    const txId = params.get('txId') || 'TX_' + Math.floor(Math.random() * 1000000);

    const pedagogicalSteps = [
        { title: "Authentification Initiale", desc: "Le marchand a détecté un risque et a contacté le Directory Server (DS).", icon: <Lock className="w-4 h-4" /> },
        { title: "Redirection ACS", desc: "Votre banque (ACS) prend le relais pour vérifier votre identité dans un environnement sécurisé.", icon: <ArrowRight className="w-4 h-4" /> },
        { title: "Challenge Demandé", desc: "Un code OTP est requis pour confirmer que vous êtes bien le propriétaire de la carte.", icon: <Smartphone className="w-4 h-4" /> },
        { title: "Validation Finale", desc: "L'ACS signera la réponse pour prouver au marchand que vous avez réussi le challenge.", icon: <CheckCircle2 className="w-4 h-4" /> }
    ];

    useEffect(() => {
        // Just a small animation for the sidebar steps
        const timer = setInterval(() => {
            setStep(prev => (prev < 2 ? prev + 1 : prev));
        }, 1500);
        return () => clearInterval(timer);
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setStep(3);

        try {
            // Updated to the correct ACS Simulator port (8013)
            const response = await axios.post(`${import.meta.env.VITE_ACS_URL || 'http://localhost:8013'}/challenge/verify`, {
                otp,
                acsTransId: txId
            });

            if (response.data.transStatus === 'Y') {
                setStatus('success');
                setMessage('Authentification réussie ! L\'ACS a généré un token de preuve (CAVV/AAV).');
                setTimeout(() => {
                    // Redirect back or close (mimic real flow)
                    window.alert("Succès ! Vous allez être redirigé vers le marchand.");
                }, 2000);
            } else {
                setStatus('failed');
                setMessage('Code OTP invalide. Dans un vrai flow, la transaction serait bloquée (transStatus: N).');
            }
        } catch (error) {
            setStatus('failed');
            setMessage('Erreur de communication avec le serveur ACS. Vérifiez que le backend tourne sur le port 8013.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen bg-slate-950 font-sans text-slate-50 overflow-hidden">
            {/* Main Challenge Area (Bank Interface) */}
            <main className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-900 border-r border-white/10">
                <div className="w-full max-w-md space-y-8 animate-in fade-in slide-in-from-bottom duration-500">

                    {/* Bank Branding */}
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-blue-500/30">
                            <ShieldCheck size={36} />
                        </div>
                        <div className="text-center">
                            <h1 className="text-xl font-bold tracking-tight text-white">Banque du PMP</h1>
                            <p className="text-slate-400 text-xs font-semibold uppercase tracking-widest">Service de Vérification 3D Secure</p>
                        </div>
                    </div>

                    <div className="bg-slate-800/50 backdrop-blur-xl border border-white/10 rounded-3xl p-8 space-y-6">
                        {status === 'pending' ? (
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="space-y-2 text-center">
                                    <h2 className="text-lg font-bold text-white">Confirmez votre achat</h2>
                                    <p className="text-slate-400 text-sm">Nous avons envoyé un code de sécurité sur votre téléphone pour la transaction <strong className="text-blue-400">{txId.substring(0, 10)}...</strong></p>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-400 uppercase ml-1">Code de sécurité (OTP)</label>
                                    <div className="relative group">
                                        <input
                                            type="text"
                                            value={otp}
                                            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                                            maxLength={6}
                                            placeholder="123456"
                                            className="w-full bg-slate-900 border-2 border-white/10 rounded-2xl px-6 py-4 text-center text-2xl font-mono tracking-[0.5em] text-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all placeholder:text-slate-600"
                                            autoFocus
                                        />
                                        <Smartphone className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5 group-focus-within:text-blue-500 transition-colors" />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={otp.length < 6 || isLoading}
                                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold py-4 rounded-2xl shadow-lg shadow-blue-600/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                                >
                                    {isLoading ? "Vérification en cours..." : "Valider le paiement"}
                                </button>

                                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex items-start gap-3 backdrop-blur-sm">
                                    <HelpCircle className="text-amber-400 w-5 h-5 flex-shrink-0 mt-0.5" />
                                    <p className="text-[11px] text-amber-200 leading-relaxed font-medium transition-all">
                                        <span className="font-bold underline">ASTUCE PÉDAGOGIQUE :</span> Pour ce labo, utilisez le code <span className="text-amber-400 font-black">123456</span>. Ce code simule la validation du serveur ACS de votre banque.
                                    </p>
                                </div>
                            </form>
                        ) : (
                            <div className="py-8 space-y-6 animate-in zoom-in-95 duration-300">
                                <div className="flex flex-col items-center gap-4 text-center">
                                    <div className={`w-20 h-20 rounded-full flex items-center justify-center shadow-lg ${status === 'success' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'
                                        }`}>
                                        {status === 'success' ? <CheckCircle2 size={48} /> : <AlertCircle size={48} />}
                                    </div>
                                    <div className="space-y-2">
                                        <h2 className="text-2xl font-bold text-white">{status === 'success' ? 'Succès !' : 'Action Requise'}</h2>
                                        <p className="text-slate-400 text-sm leading-relaxed max-w-xs">{message}</p>
                                    </div>
                                </div>

                                {status === 'failed' && (
                                    <button
                                        onClick={() => { setStatus('pending'); setOtp(''); setStep(2); }}
                                        className="w-full bg-slate-800 text-white font-bold py-4 rounded-2xl active:scale-95 transition-all"
                                    >
                                        Réessayer le code
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Footer Info */}
                    <div className="text-center space-y-4">
                        <div className="flex items-center justify-center gap-6">
                            <img src="https://upload.wikimedia.org/wikipedia/commons/b/b5/PayPal.svg" alt="DS" className="h-4 opacity-20 filter grayscale" />
                            <img src="https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg" alt="Visa" className="h-3 opacity-30" />
                            <img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" alt="MC" className="h-5 opacity-30" />
                        </div>
                        <p className="text-[10px] text-slate-400 font-medium">Session sécurisée via AES-256 GCM • PMP Tech v2026</p>
                    </div>
                </div>
            </main>

            {/* Educational Sidebar */}
            <aside className="hidden lg:flex w-96 bg-slate-900 p-12 flex-col justify-between text-white">
                <div className="space-y-12">
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-blue-400 uppercase tracking-widest font-black text-[10px]">
                            <Info size={14} /> Guide de l'Apprenant
                        </div>
                        <h2 className="text-3xl font-black italic">Le Flow 3DS</h2>
                        <p className="text-slate-400 text-sm leading-relaxed font-medium">
                            Vous êtes actuellement au cœur du protocole <strong>Three-Domain Secure</strong>. Observez chaque étape côté serveur.
                        </p>
                    </div>

                    <div className="space-y-6 relative">
                        {/* Timeline Connector Line */}
                        <div className="absolute left-[15px] top-4 bottom-4 w-0.5 bg-slate-800" />

                        {pedagogicalSteps.map((s, i) => (
                            <div
                                key={i}
                                className={`flex gap-6 relative transition-all duration-700 ${i <= step ? 'opacity-100 translate-x-0' : 'opacity-20 translate-x-4'}`}
                            >
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 z-10 ${i === step ? 'bg-blue-600 ring-4 ring-blue-500/30' : i < step ? 'bg-slate-700' : 'bg-slate-800'
                                    }`}>
                                    {s.icon}
                                </div>
                                <div className="space-y-1">
                                    <h3 className={`text-sm font-bold ${i === step ? 'text-blue-400' : 'text-white'}`}>{s.title}</h3>
                                    <p className="text-[11px] text-slate-500 leading-normal">{s.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
                    <h4 className="text-xs font-bold uppercase text-slate-500">Log Temps Réel ACS</h4>
                    <div className="font-mono text-[9px] text-slate-400 space-y-2">
                        <div className="flex justify-between">
                            <span className="text-emerald-500">IN</span>
                            <span>AReq(CardInfo, Risk)</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-blue-500">PROC</span>
                            <span>Score Risk: {step > 0 ? "85 (ELEVÉ)" : "--"}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-orange-500">OUT</span>
                            <span>ARes(transStatus: C)</span>
                        </div>
                    </div>
                </div>
            </aside>
        </div>
    );
}
