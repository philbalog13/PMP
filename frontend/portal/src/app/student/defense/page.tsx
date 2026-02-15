'use client';

import { useCallback, useEffect, useState } from 'react';
import {
    Shield, CheckCircle, AlertTriangle, Lock, Unlock,
    HelpCircle, Activity, Flag, KeyRound, RotateCcw, RefreshCw
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '../../auth/useAuth';
import { CourseCard, CoursePageShell, CoursePill } from '@/components/course/CoursePageShell';

type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

interface Vulnerability {
    vuln_code: string;
    title: string;
    description: string;
    severity: Severity;
    bloc_number: number;
    module_number: number | null;
    attack_type: string | null;
    is_vulnerable: boolean;
    defense_unlocked: boolean;
    exploited_at?: string | null;
    fixed_at?: string | null;
    question?: string;
    options?: string[];
}

interface DefenseStatus {
    total: number;
    fixed: number;
    exploited: number;
    progress: number;
    vulnerabilities: Record<string, boolean>;
    states?: Record<string, {
        exploitedAt: string | null;
        fixedAt: string | null;
        defenseUnlocked: boolean;
        isVulnerable: boolean;
    }>;
}

interface FlagFeedback {
    type: 'success' | 'error';
    message: string;
}

export default function DefenseDashboard() {
    const { isLoading } = useAuth(true);
    const [status, setStatus] = useState<DefenseStatus | null>(null);
    const [catalog, setCatalog] = useState<Vulnerability[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [selectedVuln, setSelectedVuln] = useState<Vulnerability | null>(null);
    const [quizAnswer, setQuizAnswer] = useState<number | null>(null);
    const [quizResult, setQuizResult] = useState<{ correct: boolean; explanation?: string } | null>(null);
    const [submittingQuiz, setSubmittingQuiz] = useState(false);

    const [flagInputs, setFlagInputs] = useState<Record<string, string>>({});
    const [flagSubmitting, setFlagSubmitting] = useState<Record<string, boolean>>({});
    const [flagFeedbacks, setFlagFeedbacks] = useState<Record<string, FlagFeedback>>({});
    const [resetSubmitting, setResetSubmitting] = useState<Record<string, boolean>>({});

    const fetchData = useCallback(async () => {
        const token = localStorage.getItem('token');
        if (!token) return;

        try {
            setLoading(true);
            setError(null);
            const headers = { Authorization: `Bearer ${token}` };

            const [statusRes, catalogRes] = await Promise.all([
                fetch('/api/defense/status', { headers }),
                fetch('/api/defense/catalog', { headers })
            ]);

            if (!statusRes.ok || !catalogRes.ok) {
                const statusBody = await statusRes.json().catch(() => ({}));
                const catalogBody = await catalogRes.json().catch(() => ({}));
                throw new Error(statusBody.error || catalogBody.error || 'Impossible de charger la sandbox defense.');
            }

            const statusData = await statusRes.json();
            const catalogData = await catalogRes.json();

            const nextStatus: DefenseStatus = statusData.status;
            setStatus(nextStatus);

            const states = nextStatus.states || {};

            const mergedCatalog: Vulnerability[] = (catalogData.catalog || []).map((v: Vulnerability) => {
                const st = states[v.vuln_code];
                return {
                    ...v,
                    is_vulnerable: st ? st.isVulnerable : (v.is_vulnerable ?? true),
                    defense_unlocked: st ? st.defenseUnlocked : (v.defense_unlocked ?? false),
                    exploited_at: st ? st.exploitedAt : (v.exploited_at ?? null),
                    fixed_at: st ? st.fixedAt : (v.fixed_at ?? null)
                };
            });

            setCatalog(mergedCatalog);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erreur reseau.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!isLoading) {
            fetchData();
        }
    }, [isLoading, fetchData]);

    const handleSubmitFlag = async (vulnCode: string) => {
        const token = localStorage.getItem('token');
        const flag = (flagInputs[vulnCode] || '').trim();

        if (!token) {
            setError('Session expiree. Merci de vous reconnecter.');
            return;
        }

        if (!flag) {
            setFlagFeedbacks((prev) => ({
                ...prev,
                [vulnCode]: { type: 'error', message: 'Entrez un flag avant validation.' }
            }));
            return;
        }

        try {
            setFlagSubmitting((prev) => ({ ...prev, [vulnCode]: true }));
            setFlagFeedbacks((prev) => ({ ...prev, [vulnCode]: { type: 'error', message: '' } }));

            const res = await fetch('/api/defense/submit-flag', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ vulnCode, flag })
            });

            const data = await res.json().catch(() => ({}));

            if (!res.ok || !data.success) {
                setFlagFeedbacks((prev) => ({
                    ...prev,
                    [vulnCode]: { type: 'error', message: data.error || 'Flag invalide.' }
                }));
                return;
            }

            setFlagFeedbacks((prev) => ({
                ...prev,
                [vulnCode]: { type: 'success', message: data.result?.message || 'Flag valide. Defense debloquee.' }
            }));

            await fetchData();
        } catch (err) {
            setFlagFeedbacks((prev) => ({
                ...prev,
                [vulnCode]: { type: 'error', message: err instanceof Error ? err.message : 'Erreur reseau.' }
            }));
        } finally {
            setFlagSubmitting((prev) => ({ ...prev, [vulnCode]: false }));
        }
    };

    const handleResetVuln = async (vulnCode: string) => {
        const token = localStorage.getItem('token');

        if (!token) {
            setError('Session expiree. Merci de vous reconnecter.');
            return;
        }

        try {
            setResetSubmitting((prev) => ({ ...prev, [vulnCode]: true }));

            const res = await fetch('/api/defense/reset', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ vulnCode })
            });

            const data = await res.json().catch(() => ({}));

            if (!res.ok || !data.success) {
                setError(data.error || 'Erreur lors du reset de la faille.');
                return;
            }

            await fetchData();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erreur lors du reset de la faille.');
        } finally {
            setResetSubmitting((prev) => ({ ...prev, [vulnCode]: false }));
        }
    };

    const openQuiz = (vuln: Vulnerability) => {
        if (!vuln.defense_unlocked || !vuln.is_vulnerable) {
            return;
        }

        setSelectedVuln(vuln);
        setQuizAnswer(null);
        setQuizResult(null);
    };

    const handleQuizSubmit = async () => {
        if (!selectedVuln || quizAnswer === null) return;

        const token = localStorage.getItem('token');
        if (!token) {
            setError('Session expiree. Merci de vous reconnecter.');
            return;
        }

        try {
            setSubmittingQuiz(true);
            const res = await fetch('/api/defense/fix', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    vulnCode: selectedVuln.vuln_code,
                    selectedOptionIndex: quizAnswer
                })
            });

            const data = await res.json().catch(() => ({}));

            if (!res.ok || !data.success) {
                setError(data.error || 'Erreur lors de la soumission du quiz defense.');
                return;
            }

            setQuizResult({
                correct: Boolean(data.correction?.correct),
                explanation: data.correction?.explanation
            });

            if (data.correction?.correct) {
                setTimeout(() => {
                    setSelectedVuln(null);
                    void fetchData();
                }, 1200);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erreur lors de la soumission du quiz defense.');
        } finally {
            setSubmittingQuiz(false);
        }
    };

    if (loading && !status) {
        return (
            <CoursePageShell
                title="Sandbox Defense"
                description="Chargement de votre environnement de défense."
                icon={<Shield className="h-8 w-8 text-emerald-300" />}
                crumbs={[
                    { label: 'Mon Parcours', href: '/student' },
                    { label: 'Sandbox Defense' },
                ]}
                backHref="/student"
                backLabel="Retour au parcours"
            >
                <CourseCard className="p-8">
                    <div className="flex items-center gap-3 text-slate-300">
                        <RefreshCw className="h-5 w-5 animate-spin text-emerald-400" />
                        <span className="text-sm">Chargement…</span>
                    </div>
                    <div className="mt-6 space-y-3 animate-pulse">
                        <div className="h-3 w-1/2 rounded bg-slate-800/70" />
                        <div className="h-3 w-full rounded bg-slate-800/50" />
                        <div className="h-3 w-5/6 rounded bg-slate-800/40" />
                    </div>
                </CourseCard>
            </CoursePageShell>
        );
    }

    return (
        <CoursePageShell
            title="Sandbox Defense"
            description="Workflow: exploitez la faille, soumettez le flag, puis appliquez le correctif defense."
            icon={<Shield className="h-8 w-8 text-emerald-300" />}
            crumbs={[
                { label: 'Mon Parcours', href: '/student' },
                { label: 'Sandbox Defense' },
            ]}
            backHref="/student"
            backLabel="Retour au parcours"
            meta={
                <>
                    <CoursePill tone="emerald">{status?.progress ?? 0}%</CoursePill>
                    <CoursePill tone="slate">{status?.total ?? 0} vulnérabilités</CoursePill>
                    <CoursePill tone="slate">{status?.exploited ?? 0} flags</CoursePill>
                    <CoursePill tone="slate">{status?.fixed ?? 0} corrigées</CoursePill>
                </>
            }
            headerFooter={
                <div className="flex items-center gap-3">
                    <div className="h-2 flex-1 bg-slate-800/70 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-red-500 via-amber-500 to-emerald-500 transition-all duration-1000"
                            style={{ width: `${status?.progress ?? 0}%` }}
                        />
                    </div>
                    <span className="text-xs font-mono text-emerald-200">{status?.progress ?? 0}%</span>
                </div>
            }
            actions={
                <button
                    onClick={() => void fetchData()}
                    disabled={loading}
                    className="px-4 py-2.5 rounded-xl border border-white/10 bg-slate-900/40 hover:bg-slate-900/60 disabled:opacity-60 text-sm font-semibold inline-flex items-center gap-2"
                >
                    <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    Actualiser
                </button>
            }
        >
            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <StatCard label="Vulnérabilités" value={String(status?.total ?? 0)} />
                    <StatCard label="Flags trouvés" value={String(status?.exploited ?? 0)} />
                    <StatCard label="Failles corrigées" value={String(status?.fixed ?? 0)} />
                </div>

                {error && (
                    <CourseCard className="border border-red-500/20 bg-red-500/5 p-4 md:p-5">
                        <div className="flex items-start gap-3">
                            <AlertTriangle className="mt-0.5 h-5 w-5 text-red-300" />
                            <p className="text-sm text-red-100/90">{error}</p>
                        </div>
                    </CourseCard>
                )}

                <div className="grid gap-6">
                    {catalog.map((vuln) => {
                        const isFixed = !vuln.is_vulnerable;
                        const isLocked = vuln.is_vulnerable && !vuln.defense_unlocked;
                        const isReadyForDefense = vuln.is_vulnerable && vuln.defense_unlocked;
                        const feedback = flagFeedbacks[vuln.vuln_code];
                        const submittingFlag = Boolean(flagSubmitting[vuln.vuln_code]);
                        const resettingVuln = Boolean(resetSubmitting[vuln.vuln_code]);

                        return (
                            <CourseCard
                                key={vuln.vuln_code}
                                className={`p-6 md:p-6 transition-all ${isFixed
                                    ? 'opacity-80 !border-emerald-500/20'
                                    : '!border-amber-500/20 hover:!border-amber-500/40'
                                    }`}
                            >
                                <div className="flex items-start justify-between gap-6">
                                    <div className="flex-1">
                                        <div className="flex flex-wrap items-center gap-2 mb-2">
                                            <Badge severity={vuln.severity} />
                                            <span className="text-xs font-mono text-slate-500">BLOC {vuln.bloc_number}</span>
                                            {typeof vuln.module_number === 'number' && (
                                                <span className="text-xs font-mono text-slate-500">MODULE {vuln.module_number}</span>
                                            )}
                                            {isFixed && (
                                                <span className="flex items-center gap-1 text-xs text-emerald-400 font-bold px-2 py-0.5 bg-emerald-500/10 rounded-full">
                                                    <CheckCircle size={12} /> SECURISE
                                                </span>
                                            )}
                                            {isLocked && (
                                                <span className="flex items-center gap-1 text-xs text-amber-300 font-bold px-2 py-0.5 bg-amber-500/10 rounded-full">
                                                    <Lock size={12} /> DEFENSE VERROUILLEE
                                                </span>
                                            )}
                                            {isReadyForDefense && (
                                                <span className="flex items-center gap-1 text-xs text-cyan-300 font-bold px-2 py-0.5 bg-cyan-500/10 rounded-full">
                                                    <Unlock size={12} /> QUIZ DEBLOQUE
                                                </span>
                                            )}
                                        </div>

                                        <h3 className="text-xl font-bold mb-2">{vuln.title}</h3>
                                        <p className="text-slate-400 text-sm mb-4">{vuln.description}</p>

                                        <div className="flex flex-wrap gap-2 mb-4">
                                            <Link
                                                href={`/student/defense/lab/${encodeURIComponent(vuln.vuln_code)}`}
                                                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-950/60 border border-white/10 text-slate-200 text-xs hover:bg-slate-950 hover:border-white/20 transition"
                                            >
                                                <Flag size={14} />
                                                Ouvrir le lab (flag)
                                            </Link>
                                        </div>

                                        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 mb-4">
                                            <span className="flex items-center gap-1">
                                                <Activity size={14} /> Type: {vuln.attack_type || 'N/A'}
                                            </span>
                                            {vuln.exploited_at && (
                                                <span className="text-cyan-300">Flag valide</span>
                                            )}
                                            {vuln.fixed_at && (
                                                <span className="text-emerald-300">Correctif applique</span>
                                            )}
                                        </div>

                                        {isLocked && (
                                            <div className="rounded-xl border border-white/10 bg-slate-950/50 p-4">
                                                <div className="text-xs uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-2">
                                                    <Flag size={14} /> Etape offensive requise
                                                </div>
                                                <div className="flex flex-col md:flex-row gap-3">
                                                    <div className="flex-1">
                                                        <input
                                                            value={flagInputs[vuln.vuln_code] || ''}
                                                            onChange={(event) => setFlagInputs((prev) => ({
                                                                ...prev,
                                                                [vuln.vuln_code]: event.target.value
                                                            }))}
                                                            placeholder="FLAG{...}"
                                                            className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                                        />
                                                        {feedback?.message && (
                                                            <p className={`mt-2 text-xs ${feedback.type === 'success' ? 'text-emerald-300' : 'text-red-300'}`}>
                                                                {feedback.message}
                                                            </p>
                                                        )}
                                                    </div>
                                                    <button
                                                        onClick={() => void handleSubmitFlag(vuln.vuln_code)}
                                                        disabled={submittingFlag}
                                                        className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-60 text-white text-sm font-semibold inline-flex items-center gap-2"
                                                    >
                                                        <KeyRound size={15} />
                                                        {submittingFlag ? 'Validation...' : 'Valider le flag'}
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div>
                                        {isReadyForDefense ? (
                                            <button
                                                onClick={() => openQuiz(vuln)}
                                                className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold transition-colors shadow-lg shadow-emerald-900/20"
                                            >
                                                <Unlock size={18} />
                                                Corriger la faille
                                            </button>
                                        ) : isFixed ? (
                                            <button
                                                onClick={() => void handleResetVuln(vuln.vuln_code)}
                                                disabled={resettingVuln}
                                                className="flex items-center gap-2 px-6 py-3 bg-slate-700 hover:bg-slate-600 disabled:opacity-60 text-white rounded-xl font-bold transition-colors"
                                            >
                                                <RotateCcw size={18} />
                                                {resettingVuln ? 'Reset...' : 'Reinitialiser'}
                                            </button>
                                        ) : (
                                            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-slate-500">
                                                <Lock size={24} />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </CourseCard>
                        );
                    })}
                </div>
            </div>

            {selectedVuln && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full p-8 relative shadow-2xl">
                        <button
                            onClick={() => setSelectedVuln(null)}
                            className="absolute top-4 right-4 text-slate-500 hover:text-white"
                        >
                            x
                        </button>

                        <h2 className="text-2xl font-bold mb-2 text-emerald-400">Patch de securite</h2>
                        <h3 className="text-xl font-bold mb-6">{selectedVuln.title}</h3>

                        {!quizResult ? (
                            <>
                                <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700 mb-6">
                                    <p className="font-medium text-lg mb-4 flex gap-3">
                                        <HelpCircle className="text-amber-400 shrink-0" />
                                        {selectedVuln.question || 'Comment corriger cette vulnerabilite ?'}
                                    </p>
                                    <div className="space-y-3">
                                        {(selectedVuln.options || []).map((opt, idx) => (
                                            <label
                                                key={idx}
                                                className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-all ${quizAnswer === idx
                                                    ? 'bg-emerald-500/10 border-emerald-500'
                                                    : 'bg-slate-950 border-slate-800 hover:border-slate-600'
                                                    }`}
                                            >
                                                <input
                                                    type="radio"
                                                    name="quiz"
                                                    className="accent-emerald-500 w-4 h-4"
                                                    checked={quizAnswer === idx}
                                                    onChange={() => setQuizAnswer(idx)}
                                                />
                                                <span>{opt}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex justify-end gap-3">
                                    <button
                                        onClick={() => setSelectedVuln(null)}
                                        className="px-4 py-2 text-slate-400 hover:text-white"
                                    >
                                        Annuler
                                    </button>
                                    <button
                                        onClick={() => void handleQuizSubmit()}
                                        disabled={quizAnswer === null || submittingQuiz}
                                        className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-bold"
                                    >
                                        {submittingQuiz ? 'Validation...' : 'Appliquer le correctif'}
                                    </button>
                                </div>
                            </>
                        ) : (
                            <div className="text-center py-8">
                                {quizResult.correct ? (
                                    <>
                                        <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <CheckCircle size={32} className="text-white" />
                                        </div>
                                        <h3 className="text-2xl font-bold text-emerald-400 mb-2">Faille corrigee</h3>
                                        <p className="text-slate-300 mb-6">{quizResult.explanation}</p>
                                    </>
                                ) : (
                                    <>
                                        <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <AlertTriangle size={32} className="text-white" />
                                        </div>
                                        <h3 className="text-2xl font-bold text-red-400 mb-2">Correction incorrecte</h3>
                                        <p className="text-slate-300 mb-6">{quizResult.explanation || 'Ce n est pas la bonne solution. Reessayez.'}</p>
                                        <button
                                            onClick={() => setQuizResult(null)}
                                            className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg"
                                        >
                                            Reessayer
                                        </button>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </CoursePageShell>
    );
}

function StatCard({ label, value }: { label: string; value: string }) {
    return (
        <CourseCard className="p-4 md:p-5">
            <div className="text-xs uppercase tracking-wider text-slate-500">{label}</div>
            <div className="text-2xl font-bold mt-1">{value}</div>
        </CourseCard>
    );
}

function Badge({ severity }: { severity: Severity }) {
    const colors: Record<Severity, string> = {
        CRITICAL: 'bg-red-500 text-white',
        HIGH: 'bg-orange-500 text-white',
        MEDIUM: 'bg-amber-500 text-slate-900',
        LOW: 'bg-blue-500 text-white'
    };

    return (
        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${colors[severity]}`}>
            {severity}
        </span>
    );
}
