'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../../auth/useAuth';
import {
    ArrowLeft, ChevronRight, CheckCircle2, Flame, ShieldAlert,
    Lock, Play, Eye, EyeOff, Send, Lightbulb, Terminal,
    Clock, Target, AlertTriangle, RefreshCw, BookOpen
} from 'lucide-react';

interface ChallengeDetail {
    id: string;
    code: string;
    title: string;
    description: string;
    category: string;
    difficulty: string;
    points: number;
    prerequisiteChallengeCode: string | null;
    targetService: string;
    targetEndpoint: string;
    vulnerabilityType: string;
    attackVector: string;
    learningObjectives: string[];
    estimatedMinutes: number;
    status: 'LOCKED' | 'UNLOCKED' | 'IN_PROGRESS' | 'COMPLETED';
    solveCount: number;
}

interface GuidedStep {
    stepNumber: number;
    stepTitle: string;
    stepDescription: string;
    stepType: string;
    commandTemplate: string | null;
    hintText: string | null;
}

interface HintInfo {
    hintNumber: number;
    hintText: string | null;
    costPoints: number;
    unlocked: boolean;
}

const categoryLabels: Record<string, string> = {
    HSM_ATTACK: 'HSM Attack',
    REPLAY_ATTACK: 'Replay Attack',
    '3DS_BYPASS': '3DS Bypass',
    FRAUD_CNP: 'Fraud CNP',
    ISO8583_MANIPULATION: 'ISO 8583',
    PIN_CRACKING: 'PIN Cracking',
    MITM: 'MITM',
    PRIVILEGE_ESCALATION: 'Privilege Escalation',
    CRYPTO_WEAKNESS: 'Crypto Weakness',
};

const difficultyStyles: Record<string, string> = {
    BEGINNER: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    INTERMEDIATE: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    ADVANCED: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
    EXPERT: 'bg-red-500/20 text-red-300 border-red-500/40',
};

export default function CtfChallengeDetailPage() {
    const { user, isLoading: authLoading } = useAuth(true);
    const params = useParams();
    const router = useRouter();
    const challengeCode = params?.code as string;

    const [challenge, setChallenge] = useState<ChallengeDetail | null>(null);
    const [guidedSteps, setGuidedSteps] = useState<GuidedStep[]>([]);
    const [currentStep, setCurrentStep] = useState(0);
    const [hints, setHints] = useState<HintInfo[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [flagInput, setFlagInput] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [submitResult, setSubmitResult] = useState<{ success: boolean; message: string; pointsAwarded?: number } | null>(null);
    const [mode, setMode] = useState<'GUIDED' | 'FREE'>('GUIDED');

    const getHeaders = useCallback(() => {
        const token = localStorage.getItem('token');
        return token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : null;
    }, []);

    const fetchChallenge = useCallback(async () => {
        const headers = getHeaders();
        if (!headers || !challengeCode) return;

        try {
            setError(null);
            setLoading(true);
            const res = await fetch(`/api/ctf/challenges/${challengeCode}`, { headers });
            if (!res.ok) {
                const payload = await res.json().catch(() => null);
                throw new Error(payload?.error || 'Challenge introuvable');
            }
            const data = await res.json();
            setChallenge(data.challenge || null);
            setGuidedSteps(data.guidedSteps || []);
            setCurrentStep(data.currentStep || 0);
            setHints(data.hints || []);
            if (data.challenge?.status === 'IN_PROGRESS' || data.challenge?.status === 'COMPLETED') {
                setMode(data.modePreference || 'GUIDED');
            }
        } catch (err: any) {
            setError(err.message || 'Erreur de chargement');
        } finally {
            setLoading(false);
        }
    }, [challengeCode, getHeaders]);

    useEffect(() => {
        if (authLoading) return;
        fetchChallenge();
    }, [authLoading, fetchChallenge]);

    const startChallenge = async () => {
        const headers = getHeaders();
        if (!headers) return;
        try {
            const res = await fetch(`/api/ctf/challenges/${challengeCode}/start`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ mode }),
            });
            if (res.ok) {
                await fetchChallenge();
            }
        } catch {}
    };

    const advanceStep = async () => {
        const headers = getHeaders();
        if (!headers) return;
        try {
            const res = await fetch(`/api/ctf/challenges/${challengeCode}/step/next`, {
                method: 'POST',
                headers,
            });
            if (res.ok) {
                const data = await res.json();
                setCurrentStep(data.currentStep || currentStep + 1);
                await fetchChallenge();
            }
        } catch {}
    };

    const unlockHint = async (hintNumber: number) => {
        const headers = getHeaders();
        if (!headers) return;
        try {
            const res = await fetch(`/api/ctf/challenges/${challengeCode}/hint/${hintNumber}`, {
                method: 'POST',
                headers,
            });
            if (res.ok) {
                await fetchChallenge();
            }
        } catch {}
    };

    const submitFlag = async () => {
        const headers = getHeaders();
        if (!headers || !flagInput.trim()) return;
        try {
            setSubmitting(true);
            setSubmitResult(null);
            const res = await fetch(`/api/ctf/challenges/${challengeCode}/submit`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ flag: flagInput.trim() }),
            });
            const data = await res.json();
            if (data.correct) {
                setSubmitResult({ success: true, message: 'Flag correct ! Challenge résolu !', pointsAwarded: data.pointsAwarded });
                await fetchChallenge();
            } else {
                setSubmitResult({ success: false, message: data.message || 'Flag incorrect. Réessayez.' });
            }
        } catch (err: any) {
            setSubmitResult({ success: false, message: 'Erreur lors de la soumission' });
        } finally {
            setSubmitting(false);
        }
    };

    if (authLoading || loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
                <div className="flex flex-col items-center gap-4">
                    <ShieldAlert className="h-12 w-12 animate-bounce text-orange-400" />
                    <p className="text-sm text-slate-400">Chargement du challenge...</p>
                </div>
            </div>
        );
    }

    if (error || !challenge) {
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4 text-white">
                <AlertTriangle size={48} className="text-red-400" />
                <p className="text-slate-400">{error || 'Challenge introuvable'}</p>
                <div className="flex gap-3">
                    <button onClick={fetchChallenge} className="px-4 py-2 bg-slate-800 rounded-lg text-sm hover:bg-slate-700">
                        Réessayer
                    </button>
                    <Link href="/student/ctf" className="px-4 py-2 bg-orange-600 rounded-lg text-sm hover:bg-orange-500 flex items-center gap-2">
                        <ArrowLeft size={14} /> Retour aux challenges
                    </Link>
                </div>
            </div>
        );
    }

    const isCompleted = challenge.status === 'COMPLETED';
    const isInProgress = challenge.status === 'IN_PROGRESS';
    const isUnlocked = challenge.status === 'UNLOCKED';

    return (
        <div className="min-h-screen bg-slate-950 text-white pt-24 pb-12">
            <div className="max-w-4xl mx-auto px-6">
                {/* Breadcrumb */}
                <div className="text-xs text-slate-500 mb-6 flex items-center gap-1.5">
                    <Link href="/student" className="hover:text-emerald-400">Mon Parcours</Link>
                    <ChevronRight size={12} />
                    <Link href="/student/ctf" className="hover:text-orange-300">Security Labs</Link>
                    <ChevronRight size={12} />
                    <span className="text-orange-300 truncate max-w-[200px]">{challenge.title}</span>
                </div>

                <Link href="/student/ctf" className="inline-flex items-center gap-2 text-slate-400 hover:text-white text-sm mb-6">
                    <ArrowLeft size={16} /> Retour aux challenges
                </Link>

                {/* Header */}
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-red-700/20 via-orange-700/10 to-slate-900/50 border border-white/10 p-8 mb-8">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,120,80,0.15),transparent_50%)]" />
                    <div className="relative z-10">
                        <div className="flex items-start justify-between gap-4 mb-4">
                            <div>
                                <div className="flex items-center gap-3 mb-3 flex-wrap">
                                    <span className="font-mono text-xs text-slate-400">{challenge.code}</span>
                                    <span className={`text-[10px] px-2 py-1 rounded-full border ${difficultyStyles[challenge.difficulty] || 'bg-slate-700/60 border-white/20 text-slate-200'}`}>
                                        {challenge.difficulty}
                                    </span>
                                    <span className="text-[10px] px-2 py-1 rounded-full border bg-slate-700/60 border-white/20 text-slate-200">
                                        {categoryLabels[challenge.category] || challenge.category}
                                    </span>
                                    {isCompleted && (
                                        <span className="text-[10px] px-2 py-1 rounded-full border bg-emerald-500/20 border-emerald-500/30 text-emerald-300 flex items-center gap-1">
                                            <CheckCircle2 size={10} /> Résolu
                                        </span>
                                    )}
                                    {isInProgress && (
                                        <span className="text-[10px] px-2 py-1 rounded-full border bg-orange-500/20 border-orange-500/30 text-orange-300 flex items-center gap-1">
                                            <Flame size={10} /> En cours
                                        </span>
                                    )}
                                </div>
                                <h1 className="text-2xl md:text-3xl font-black">{challenge.title}</h1>
                                <p className="text-slate-300 mt-2 text-sm leading-relaxed max-w-2xl">{challenge.description}</p>
                            </div>
                            <div className="text-right flex-shrink-0">
                                <div className="text-2xl font-black text-orange-300">{challenge.points} pts</div>
                                <div className="text-xs text-slate-400 mt-1">{challenge.solveCount} résolutions</div>
                            </div>
                        </div>

                        <div className="flex items-center gap-6 mt-4 flex-wrap text-sm text-slate-400">
                            <div className="flex items-center gap-2">
                                <Clock size={14} className="text-slate-500" />
                                <span>{challenge.estimatedMinutes} min estimées</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Target size={14} className="text-slate-500" />
                                <span>{challenge.vulnerabilityType}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Terminal size={14} className="text-slate-500" />
                                <span>{challenge.targetService}</span>
                            </div>
                        </div>

                        {challenge.learningObjectives.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-white/5">
                                <p className="text-xs text-slate-500 mb-2">Objectifs pédagogiques</p>
                                <ul className="space-y-1">
                                    {challenge.learningObjectives.map((obj, i) => (
                                        <li key={i} className="text-xs text-slate-400 flex items-start gap-2">
                                            <BookOpen size={12} className="text-orange-400 mt-0.5 flex-shrink-0" />
                                            {obj}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                </div>

                {/* Start Challenge */}
                {isUnlocked && (
                    <div className="mb-8 p-6 rounded-2xl bg-slate-800/50 border border-white/10 text-center">
                        <h2 className="text-lg font-bold mb-3">Prêt à commencer ?</h2>
                        <p className="text-sm text-slate-400 mb-4">Choisissez votre mode et lancez le challenge.</p>
                        <div className="flex gap-3 justify-center mb-4">
                            <button
                                onClick={() => setMode('GUIDED')}
                                className={`px-4 py-2 rounded-lg text-sm border transition ${mode === 'GUIDED' ? 'bg-orange-500/20 border-orange-500/40 text-orange-200' : 'bg-slate-800 border-white/10 text-slate-400 hover:text-white'}`}
                            >
                                Mode Guidé
                            </button>
                            <button
                                onClick={() => setMode('FREE')}
                                className={`px-4 py-2 rounded-lg text-sm border transition ${mode === 'FREE' ? 'bg-orange-500/20 border-orange-500/40 text-orange-200' : 'bg-slate-800 border-white/10 text-slate-400 hover:text-white'}`}
                            >
                                Mode Libre
                            </button>
                        </div>
                        <button
                            onClick={startChallenge}
                            className="px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl font-bold hover:opacity-90 flex items-center gap-2 mx-auto"
                        >
                            <Play size={18} /> Lancer le challenge
                        </button>
                    </div>
                )}

                {/* Guided Steps */}
                {(isInProgress || isCompleted) && guidedSteps.length > 0 && mode === 'GUIDED' && (
                    <div className="mb-8">
                        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                            <Terminal size={18} className="text-orange-400" />
                            Étapes guidées ({currentStep}/{guidedSteps.length})
                        </h2>
                        <div className="space-y-3">
                            {guidedSteps.map((step, idx) => {
                                const isActive = idx === currentStep;
                                const isDone = idx < currentStep;
                                const isLocked = idx > currentStep && !isCompleted;

                                return (
                                    <div
                                        key={step.stepNumber}
                                        className={`p-5 rounded-xl border transition-all ${
                                            isDone ? 'bg-emerald-500/10 border-emerald-500/20' :
                                            isActive ? 'bg-orange-500/10 border-orange-500/30' :
                                            'bg-slate-900/50 border-white/5 opacity-60'
                                        }`}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                                                isDone ? 'bg-emerald-500 text-white' :
                                                isActive ? 'bg-orange-500 text-white' :
                                                'bg-slate-800 text-slate-500'
                                            }`}>
                                                {isDone ? <CheckCircle2 size={14} /> : step.stepNumber}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-semibold text-sm">{step.stepTitle}</h3>
                                                {(isActive || isDone || isCompleted) && (
                                                    <p className="text-xs text-slate-400 mt-1">{step.stepDescription}</p>
                                                )}
                                                {(isActive || isDone || isCompleted) && step.commandTemplate && (
                                                    <div className="mt-2 p-2 bg-slate-950 rounded-lg font-mono text-xs text-orange-300 overflow-x-auto">
                                                        {step.commandTemplate}
                                                    </div>
                                                )}
                                                {isActive && step.hintText && (
                                                    <p className="text-xs text-amber-400/80 mt-2 italic">
                                                        Indice : {step.hintText}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        {isActive && !isCompleted && (
                                            <div className="mt-3 flex justify-end">
                                                <button
                                                    onClick={advanceStep}
                                                    className="px-4 py-2 bg-orange-600 hover:bg-orange-500 rounded-lg text-xs font-bold flex items-center gap-1"
                                                >
                                                    Étape suivante <ChevronRight size={14} />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Hints */}
                {(isInProgress || isCompleted) && hints.length > 0 && (
                    <div className="mb-8">
                        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                            <Lightbulb size={18} className="text-amber-400" />
                            Indices
                        </h2>
                        <div className="space-y-2">
                            {hints.map((hint) => (
                                <div key={hint.hintNumber} className="p-4 rounded-xl bg-slate-800/50 border border-white/10">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium">Indice {hint.hintNumber}</span>
                                        {hint.unlocked ? (
                                            <span className="text-xs text-emerald-400">Débloqué</span>
                                        ) : (
                                            <button
                                                onClick={() => unlockHint(hint.hintNumber)}
                                                className="text-xs px-3 py-1 bg-amber-500/20 text-amber-300 rounded-lg hover:bg-amber-500/30 flex items-center gap-1"
                                            >
                                                <Eye size={12} /> Débloquer (-{hint.costPoints} pts)
                                            </button>
                                        )}
                                    </div>
                                    {hint.unlocked && hint.hintText && (
                                        <p className="text-sm text-slate-300 mt-2">{hint.hintText}</p>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Flag Submission */}
                {(isInProgress || isCompleted) && (
                    <div className="p-6 rounded-2xl bg-slate-800/50 border border-white/10">
                        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                            <Send size={18} className="text-orange-400" />
                            Soumettre le flag
                        </h2>

                        {submitResult && (
                            <div className={`mb-4 p-3 rounded-lg text-sm ${
                                submitResult.success
                                    ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
                                    : 'bg-red-500/15 border border-red-500/30 text-red-300'
                            }`}>
                                {submitResult.message}
                                {submitResult.pointsAwarded && (
                                    <span className="ml-2 font-bold">+{submitResult.pointsAwarded} pts</span>
                                )}
                            </div>
                        )}

                        {!isCompleted && (
                            <div className="flex gap-3">
                                <input
                                    type="text"
                                    value={flagInput}
                                    onChange={(e) => setFlagInput(e.target.value)}
                                    placeholder="PMP{...}"
                                    className="flex-1 px-4 py-3 bg-slate-900 border border-white/10 rounded-xl text-sm font-mono placeholder-slate-600 focus:outline-none focus:border-orange-500/40 focus:ring-1 focus:ring-orange-500/20"
                                    onKeyDown={(e) => { if (e.key === 'Enter') submitFlag(); }}
                                />
                                <button
                                    onClick={submitFlag}
                                    disabled={submitting || !flagInput.trim()}
                                    className="px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl font-bold text-sm hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    {submitting ? <RefreshCw size={16} className="animate-spin" /> : <Send size={16} />}
                                    Soumettre
                                </button>
                            </div>
                        )}

                        {isCompleted && (
                            <div className="text-center py-4">
                                <CheckCircle2 size={48} className="text-emerald-400 mx-auto mb-2" />
                                <p className="text-emerald-300 font-bold">Challenge résolu !</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
