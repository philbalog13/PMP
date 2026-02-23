'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../auth/useAuth';
import {
    GraduationCap,
    Shield,
    BookOpen,
    Beaker,
    ChevronRight,
    Target,
    Zap,
    CheckCircle2,
} from 'lucide-react';
import { markOnboardingDoneLocally } from '../../../lib/onboarding';

const STEPS = ['Bienvenue', 'Ton profil', 'Comment ça marche', 'Premier défi'] as const;

const LEVELS = [
    { value: 'NOVICE', label: 'Débutant', desc: 'Première approche des systèmes de paiement' },
    { value: 'INTERMEDIATE', label: 'Intermédiaire', desc: 'Quelques notions de sécurité ou de monétique' },
    { value: 'ADVANCED', label: 'Avancé', desc: 'Expérience confirmée en sécurité ou systèmes bancaires' },
];

const OBJECTIVES = [
    { value: 'CERTIFICATION_PCI', label: 'Certification PCI DSS', Icon: Shield },
    { value: 'RED_TEAM', label: 'Red Team / Pentest paiements', Icon: Zap },
    { value: 'BUSINESS_UNDERSTANDING', label: 'Comprendre la monétique', Icon: BookOpen },
    { value: 'FINTECH_CAREER', label: 'Reconversion Fintech', Icon: Target },
];

const HOW_ITEMS = [
    {
        color: 'bg-blue-500',
        Icon: BookOpen,
        label: 'Cursus (Théorie)',
        desc: 'Des chapitres courts sur EMV, 3DS, HSM, PCI DSS — chaque module se termine par un quiz.',
    },
    {
        color: 'bg-emerald-500',
        Icon: Beaker,
        label: 'CTF Labs (Hacking)',
        desc: 'Exploite de vraies vulnérabilités sur un simulateur bancaire complet. Mode guidé ou libre.',
    },
    {
        color: 'bg-amber-500',
        Icon: Shield,
        label: 'Ateliers (Pratique)',
        desc: 'Construis des PIN blocks, analyse des messages ISO 8583, simule des chargebacks.',
    },
];

export default function OnboardingPage() {
    const router = useRouter();
    const { user } = useAuth(true);
    const [step, setStep] = useState(0);
    const [level, setLevel] = useState('');
    const [objective, setObjective] = useState('');
    const [saving, setSaving] = useState(false);

    const saveAndRedirect = async (destination: string) => {
        setSaving(true);
        try {
            const token = localStorage.getItem('token');
            if (token) {
                await fetch('/api/users/me/preferences', {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        learnerLevel: level || undefined,
                        objective: objective || undefined,
                        onboardingDone: true,
                    }),
                }).catch(() => {/* best effort */});
            }
            markOnboardingDoneLocally(user);
            router.push(destination);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center px-6 py-16">
            {/* Step dots */}
            <div className="flex items-center gap-2 mb-12">
                {STEPS.map((s, i) => (
                    <div key={s} className="flex items-center gap-2">
                        <div
                            className={`flex items-center justify-center rounded-full transition-all duration-300 font-bold text-xs
                                ${i === step ? 'h-8 w-8 bg-emerald-500 text-slate-950 ring-4 ring-emerald-500/20' :
                                i < step ? 'h-7 w-7 bg-emerald-700 text-emerald-100' :
                                'h-6 w-6 bg-slate-800 text-slate-500'}`}
                        >
                            {i < step ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
                        </div>
                        {i < STEPS.length - 1 && (
                            <div className={`h-px w-8 transition-colors ${i < step ? 'bg-emerald-600' : 'bg-slate-800'}`} />
                        )}
                    </div>
                ))}
            </div>

            <div className="w-full max-w-md">

                {/* ── STEP 0 — Bienvenue ─────────────────────────────────── */}
                {step === 0 && (
                    <div className="space-y-8 text-center">
                        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500 to-cyan-500 shadow-2xl shadow-emerald-900/40 mx-auto">
                            <GraduationCap className="w-10 h-10 text-white" />
                        </div>
                        <div>
                            <p className="text-xs text-emerald-400 font-semibold uppercase tracking-[0.2em] mb-3">PMP Platform</p>
                            <h1 className="text-4xl font-black text-white mb-4 leading-tight">
                                Learn by Hacking.
                            </h1>
                            <p className="text-slate-300 leading-relaxed text-lg">
                                Tu apprends la sécurité des paiements en{' '}
                                <strong className="text-white">attaquant de vrais simulateurs bancaires</strong>.
                                Chaque vulnérabilité exploitée, tu dois ensuite la corriger.
                            </p>
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                            {[
                                { Icon: BookOpen, label: 'Cursus', color: 'text-blue-300', bg: 'bg-blue-500/10 border-blue-500/20' },
                                { Icon: Beaker, label: 'CTF Labs', color: 'text-emerald-300', bg: 'bg-emerald-500/10 border-emerald-500/20' },
                                { Icon: Shield, label: 'Ateliers', color: 'text-amber-300', bg: 'bg-amber-500/10 border-amber-500/20' },
                            ].map(({ Icon, label, color, bg }) => (
                                <div key={label} className={`rounded-xl border p-3.5 text-center ${bg}`}>
                                    <Icon className={`h-5 w-5 mx-auto mb-1.5 ${color}`} />
                                    <p className="text-slate-200 font-semibold text-sm">{label}</p>
                                </div>
                            ))}
                        </div>

                        <div className="space-y-3">
                            <button
                                onClick={() => setStep(1)}
                                className="w-full py-4 rounded-xl bg-gradient-to-r from-emerald-600 to-cyan-600 text-white font-bold text-base hover:from-emerald-500 hover:to-cyan-500 transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/30"
                            >
                                Commencer <ChevronRight className="h-4 w-4" />
                            </button>
                            <button
                                onClick={() => void saveAndRedirect('/student')}
                                className="text-xs text-slate-500 hover:text-slate-400 transition w-full py-2"
                            >
                                Passer l'introduction →
                            </button>
                        </div>
                    </div>
                )}

                {/* ── STEP 1 — Profil ────────────────────────────────────── */}
                {step === 1 && (
                    <div className="space-y-6">
                        <div className="text-center">
                            <p className="text-xs text-emerald-400 font-semibold uppercase tracking-[0.2em] mb-2">Étape 2 / 4</p>
                            <h2 className="text-2xl font-black text-white mb-1">Ton profil</h2>
                            <p className="text-slate-400 text-sm">On adapte les labs et les indices à ton niveau.</p>
                        </div>

                        <div className="space-y-2">
                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Niveau actuel</p>
                            {LEVELS.map((l) => (
                                <button
                                    key={l.value}
                                    onClick={() => setLevel(l.value)}
                                    className={`w-full text-left rounded-xl border p-4 transition-all ${
                                        level === l.value
                                            ? 'border-emerald-500/50 bg-emerald-500/10 ring-1 ring-emerald-500/20'
                                            : 'border-white/10 bg-slate-900/40 hover:bg-white/5'
                                    }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="font-semibold text-white text-sm">{l.label}</p>
                                            <p className="text-xs text-slate-400 mt-0.5">{l.desc}</p>
                                        </div>
                                        {level === l.value && <CheckCircle2 className="h-5 w-5 text-emerald-400 flex-shrink-0" />}
                                    </div>
                                </button>
                            ))}
                        </div>

                        <div className="space-y-2">
                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Objectif principal</p>
                            <div className="grid grid-cols-2 gap-2">
                                {OBJECTIVES.map(({ value, label, Icon }) => (
                                    <button
                                        key={value}
                                        onClick={() => setObjective(value)}
                                        className={`text-left rounded-xl border p-3.5 transition-all ${
                                            objective === value
                                                ? 'border-cyan-500/50 bg-cyan-500/10 ring-1 ring-cyan-500/20'
                                                : 'border-white/10 bg-slate-900/40 hover:bg-white/5'
                                        }`}
                                    >
                                        <Icon className="h-4 w-4 text-cyan-300 mb-2" />
                                        <p className="text-xs font-semibold text-white leading-tight">{label}</p>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <button
                            onClick={() => setStep(2)}
                            disabled={!level || !objective}
                            className="w-full py-4 rounded-xl bg-gradient-to-r from-emerald-600 to-cyan-600 text-white font-bold text-base hover:from-emerald-500 hover:to-cyan-500 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
                        >
                            Continuer <ChevronRight className="h-4 w-4" />
                        </button>
                    </div>
                )}

                {/* ── STEP 2 — Comment ça marche ─────────────────────────── */}
                {step === 2 && (
                    <div className="space-y-6">
                        <div className="text-center">
                            <p className="text-xs text-emerald-400 font-semibold uppercase tracking-[0.2em] mb-2">Étape 3 / 4</p>
                            <h2 className="text-2xl font-black text-white mb-1">Comment ça marche</h2>
                            <p className="text-slate-400 text-sm">Trois modes d'apprentissage complémentaires.</p>
                        </div>

                        <div className="space-y-3">
                            {HOW_ITEMS.map(({ color, Icon, label, desc }, i) => (
                                <div key={label} className="flex gap-4 rounded-xl border border-white/10 bg-slate-900/40 p-4">
                                    <div className={`h-10 w-10 rounded-xl ${color} flex items-center justify-center flex-shrink-0`}>
                                        <Icon className="h-5 w-5 text-white" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Étape {i + 1}</span>
                                        </div>
                                        <p className="font-semibold text-white text-sm">{label}</p>
                                        <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4">
                            <p className="text-xs text-cyan-300 font-semibold uppercase tracking-wider mb-1">Le cycle Learn by Hacking</p>
                            <p className="text-sm text-slate-300 leading-relaxed">
                                Théorie → Exploitation → Débrief → Patch → Vérification.
                                Chaque challenge t'oblige à comprendre <em>pourquoi</em> la vulnérabilité existe.
                            </p>
                        </div>

                        <button
                            onClick={() => setStep(3)}
                            className="w-full py-4 rounded-xl bg-gradient-to-r from-emerald-600 to-cyan-600 text-white font-bold text-base hover:from-emerald-500 hover:to-cyan-500 transition flex items-center justify-center gap-2"
                        >
                            J'ai compris <ChevronRight className="h-4 w-4" />
                        </button>
                    </div>
                )}

                {/* ── STEP 3 — Premier défi ──────────────────────────────── */}
                {step === 3 && (
                    <div className="text-center space-y-7">
                        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-red-500 to-amber-500 shadow-2xl shadow-red-900/40 mx-auto">
                            <Beaker className="w-10 h-10 text-white" />
                        </div>

                        <div>
                            <p className="text-xs text-amber-400 font-semibold uppercase tracking-[0.2em] mb-2">Ton premier hack</p>
                            <h2 className="text-2xl font-black text-white mb-3">HSM-001 : Le Coffre Ouvert</h2>
                            <p className="text-slate-300 text-sm leading-relaxed">
                                Le simulateur HSM expose ses clés cryptographiques sans aucune authentification.
                                Ton objectif : <strong className="text-white">trouver le flag</strong> caché dans la réponse de l'API.
                            </p>
                        </div>

                        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-left space-y-2">
                            <p className="text-xs text-amber-300 font-semibold uppercase tracking-wider">Ta cible</p>
                            <p className="text-sm text-emerald-200 font-mono bg-slate-950/60 rounded-lg px-3 py-2">
                                GET http://hsm-simulator:8011/hsm/keys
                            </p>
                            <p className="text-xs text-slate-500">Aucune authentification requise — c'est exactement le bug.</p>
                        </div>

                        <div className="space-y-3">
                            <button
                                onClick={() => void saveAndRedirect('/student/ctf/HSM-001')}
                                disabled={saving}
                                className="w-full py-4 rounded-xl bg-gradient-to-r from-red-600 to-amber-600 text-white font-bold text-base hover:from-red-500 hover:to-amber-500 disabled:opacity-60 transition flex items-center justify-center gap-2 shadow-lg shadow-red-900/30"
                            >
                                {saving ? 'Démarrage…' : 'Lancer mon premier lab →'}
                            </button>
                            <button
                                onClick={() => void saveAndRedirect('/student')}
                                disabled={saving}
                                className="text-xs text-slate-500 hover:text-slate-400 transition w-full py-2"
                            >
                                Aller au dashboard d'abord →
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
