'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
    BarChart3,
    ChevronRight,
    RefreshCw,
    Shield,
    Timer,
    Users,
    Flame,
    RotateCcw,
} from 'lucide-react';
import { useAuth } from '../../auth/useAuth';

interface ChallengeStat {
    challenge_code: string;
    title: string;
    category: string;
    difficulty: string;
    points: number;
    attempts: number;
    successful_submissions: number;
    unique_solvers: number;
    resolution_rate: number;
    avg_completion_minutes: number;
    avg_time_score: number;
    avg_proof_score: number;
    avg_patch_score: number;
    avg_axis_score: number;
    dropoff_rate: number;
    debrief_coverage_rate: number;
}

interface SubmissionFeedItem {
    id: string;
    submitted_flag: string;
    is_correct: boolean;
    mode: string;
    points_awarded: number;
    hints_used: number;
    is_first_blood: boolean;
    axis_time_score: number;
    axis_proof_score: number;
    axis_patch_score: number;
    axis_total_score: number;
    feedback_codes: string[] | null;
    submitted_at: string;
    challenge_code: string;
    title: string;
    student_id: string;
    username: string;
    first_name: string;
    last_name: string;
}

interface BlockedStudent {
    student_id: string;
    username: string;
    first_name: string;
    last_name: string;
    challenge_code: string;
    title: string;
    current_guided_step: number;
    failed_attempts: number;
    learner_profile: string;
    started_at: string;
    hours_in_progress: number;
}

interface DropoffRow {
    challenge_code: string;
    title: string;
    started_count: number;
    completed_count: number;
    in_progress_count: number;
    dropoff_rate: number;
}

interface DebriefCoverageRow {
    challenge_code: string;
    title: string;
    completed_count: number;
    debrief_count: number;
    debrief_coverage_rate: number;
}

interface FeedbackHotspotRow {
    feedback_code: string;
    occurrences: number;
}

interface LearnerProfileDistributionRow {
    learner_profile: string;
    learners: number;
}

interface StepBlockageRow {
    challenge_code: string;
    title: string;
    current_guided_step: number;
    blocked_learners: number;
}

interface TelemetryVolumeRow {
    event_name: string;
    events_24h: number;
}

export default function InstructorCtfDashboardPage() {
    const { isLoading } = useAuth(true);

    const [challengeStats, setChallengeStats] = useState<ChallengeStat[]>([]);
    const [submissions, setSubmissions] = useState<SubmissionFeedItem[]>([]);
    const [blockedStudents, setBlockedStudents] = useState<BlockedStudent[]>([]);
    const [dropoffRows, setDropoffRows] = useState<DropoffRow[]>([]);
    const [debriefRows, setDebriefRows] = useState<DebriefCoverageRow[]>([]);
    const [feedbackHotspots, setFeedbackHotspots] = useState<FeedbackHotspotRow[]>([]);
    const [learnerProfiles, setLearnerProfiles] = useState<LearnerProfileDistributionRow[]>([]);
    const [stepBlockage, setStepBlockage] = useState<StepBlockageRow[]>([]);
    const [telemetryVolume, setTelemetryVolume] = useState<TelemetryVolumeRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        const token = localStorage.getItem('token');
        if (!token) {
            return;
        }

        const headers = { Authorization: `Bearer ${token}` };

        const [analyticsRes, submissionsRes] = await Promise.all([
            fetch('/api/ctf/admin/analytics', { headers }).catch(() => null),
            fetch('/api/ctf/admin/submissions', { headers }).catch(() => null),
        ]);

        if (analyticsRes?.ok) {
            const payload = await analyticsRes.json();
            setChallengeStats(payload.analytics?.challengeStats || []);
            setBlockedStudents(payload.analytics?.blockedStudents || []);
            setDropoffRows(payload.analytics?.dropoffByChallenge || []);
            setDebriefRows(payload.analytics?.debriefCoverage || []);
            setFeedbackHotspots(payload.analytics?.feedbackHotspots || []);
            setLearnerProfiles(payload.analytics?.learnerProfileDistribution || []);
            setStepBlockage(payload.analytics?.stepBlockage || []);
            setTelemetryVolume(payload.analytics?.telemetryVolume || []);
        }

        if (submissionsRes?.ok) {
            const payload = await submissionsRes.json();
            setSubmissions(payload.submissions || []);
        }
    }, []);

    const refresh = useCallback(async () => {
        try {
            setRefreshing(true);
            setError(null);
            await fetchData();
        } catch (fetchError: unknown) {
            setError(fetchError instanceof Error ? fetchError.message : 'Impossible de charger le dashboard CTF formateur');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [fetchData]);

    useEffect(() => {
        if (isLoading) {
            return;
        }

        refresh();
    }, [isLoading, refresh]);

    const hardestChallenges = useMemo(() => {
        return [...challengeStats]
            .sort((a, b) => Number(a.resolution_rate) - Number(b.resolution_rate))
            .slice(0, 5);
    }, [challengeStats]);

    const handleResetStudent = useCallback(async (studentId: string) => {
        const token = localStorage.getItem('token');
        if (!token) {
            return;
        }

        try {
            const response = await fetch(`/api/ctf/admin/reset/${studentId}`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            const payload = await response.json();
            if (!response.ok) {
                throw new Error(payload.error || 'Reset impossible');
            }

            await refresh();
        } catch (resetError: unknown) {
            setError(resetError instanceof Error ? resetError.message : 'Erreur reset progression');
        }
    }, [refresh]);

    if (isLoading || loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
                <div className="flex flex-col items-center gap-4">
                    <Shield className="h-12 w-12 animate-bounce text-blue-400" />
                    <p className="text-sm text-slate-400">Chargement dashboard CTF instructeur...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 text-white pt-24 pb-12">
            <div className="max-w-7xl mx-auto px-6">
                <div className="text-xs text-slate-500 mb-6">
                    <Link href="/instructor" className="hover:text-blue-300">Dashboard</Link>
                    <ChevronRight size={12} className="inline mx-1" />
                    <span className="text-blue-300">CTF</span>
                </div>

                <div className="mb-6 flex items-center justify-between gap-3">
                    <div>
                        <h1 className="text-3xl font-black">CTF Instructor Console</h1>
                        <p className="text-sm text-slate-400 mt-1">Suivi des résolutions, difficultés et étudiants bloqués.</p>
                    </div>
                    <button
                        onClick={refresh}
                        className={`px-4 py-2 rounded-xl border border-white/20 bg-slate-900/60 text-sm flex items-center gap-2 ${refreshing ? 'animate-pulse' : ''}`}
                    >
                        <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} /> Refresh
                    </button>
                </div>

                {error && (
                    <div className="mb-6 rounded-xl border border-red-500/40 bg-red-500/10 text-red-200 text-sm p-4">
                        {error}
                    </div>
                )}

                <div className="grid lg:grid-cols-3 gap-6 mb-6">
                    <div className="lg:col-span-2 rounded-2xl border border-white/10 bg-slate-800/50 p-5">
                        <h2 className="font-bold mb-4 flex items-center gap-2"><BarChart3 size={18} className="text-blue-300" /> Taux de résolution</h2>
                        <div className="space-y-3">
                            {challengeStats.map((stat) => {
                                const rate = Number(stat.resolution_rate || 0);
                                return (
                                    <div key={stat.challenge_code}>
                                        <div className="flex items-center justify-between text-xs mb-1">
                                            <span className="text-slate-200">{stat.challenge_code} - {stat.title}</span>
                                            <span className="text-slate-400">
                                                {rate}% ({stat.unique_solvers} solveurs) - Axis {stat.avg_axis_score} - Drop-off {stat.dropoff_rate}%
                                            </span>
                                        </div>
                                        <div className="h-2 rounded-full bg-slate-700 overflow-hidden">
                                            <div
                                                className={`h-full ${rate >= 70 ? 'bg-emerald-500' : rate >= 40 ? 'bg-amber-500' : 'bg-red-500'}`}
                                                style={{ width: `${Math.max(2, Math.min(100, rate))}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-slate-800/50 p-5">
                        <h2 className="font-bold mb-4 flex items-center gap-2"><Flame size={18} className="text-orange-300" /> Plus difficiles</h2>
                        <div className="space-y-3 text-sm">
                            {hardestChallenges.map((stat) => (
                                <div key={stat.challenge_code} className="rounded-lg border border-white/10 bg-slate-900/60 p-3">
                                    <p className="font-semibold">{stat.challenge_code}</p>
                                    <p className="text-xs text-slate-400 mt-1">Taux: {stat.resolution_rate}%</p>
                                    <p className="text-xs text-slate-400">Temps moyen: {stat.avg_completion_minutes} min</p>
                                    <p className="text-xs text-slate-400">Debrief: {stat.debrief_coverage_rate}%</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="grid lg:grid-cols-2 gap-6">
                    <div className="rounded-2xl border border-white/10 bg-slate-800/50 p-5">
                        <h2 className="font-bold mb-4 flex items-center gap-2"><Timer size={18} className="text-amber-300" /> Soumissions récentes</h2>
                        <div className="space-y-2 max-h-[420px] overflow-auto">
                            {submissions.slice(0, 40).map((item) => {
                                const name = [item.first_name, item.last_name].filter(Boolean).join(' ') || item.username;
                                return (
                                    <div key={item.id} className="rounded-lg border border-white/10 bg-slate-900/70 px-3 py-2 text-xs">
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="text-slate-200">{name} - {item.challenge_code}</span>
                                            <span className={item.is_correct ? 'text-emerald-300' : 'text-red-300'}>
                                                {item.is_correct ? 'Correct' : 'Incorrect'}
                                            </span>
                                        </div>
                                        <div className="mt-1 text-slate-400">
                                            {new Date(item.submitted_at).toLocaleString('fr-FR')} - {item.mode} - {item.points_awarded} pts - Axis {item.axis_total_score}
                                        </div>
                                        {Array.isArray(item.feedback_codes) && item.feedback_codes.length > 0 && (
                                            <div className="mt-1 text-[11px] text-slate-500">
                                                Feedback: {item.feedback_codes.slice(0, 3).join(', ')}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-slate-800/50 p-5">
                        <h2 className="font-bold mb-4 flex items-center gap-2"><Users size={18} className="text-rose-300" /> Étudiants bloqués (+2h)</h2>
                        <div className="space-y-2 max-h-[420px] overflow-auto">
                            {blockedStudents.length === 0 && (
                                <div className="text-sm text-slate-400 rounded-lg border border-white/10 bg-slate-900/70 p-3">
                                    Aucun étudiant bloqué détecté.
                                </div>
                            )}

                            {blockedStudents.map((student) => {
                                const name = [student.first_name, student.last_name].filter(Boolean).join(' ') || student.username;
                                return (
                                    <div key={`${student.student_id}-${student.challenge_code}`} className="rounded-lg border border-white/10 bg-slate-900/70 p-3">
                                        <p className="text-sm font-semibold">{name}</p>
                                        <p className="text-xs text-slate-400 mt-1">{student.challenge_code} - {student.title}</p>
                                        <p className="text-xs text-amber-300 mt-1">{student.hours_in_progress} h en cours</p>
                                        <p className="text-xs text-slate-500 mt-1">
                                            Step {student.current_guided_step} - essais rates {student.failed_attempts} - profil {student.learner_profile}
                                        </p>
                                        <button
                                            onClick={() => handleResetStudent(student.student_id)}
                                            className="mt-2 px-2 py-1 rounded bg-red-600 hover:bg-red-500 text-xs flex items-center gap-1"
                                        >
                                            <RotateCcw size={12} /> Reset progression
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                <div className="mt-6 grid lg:grid-cols-3 gap-6">
                    <div className="rounded-2xl border border-white/10 bg-slate-800/50 p-5">
                        <h2 className="font-bold mb-4">Drop-off challenge</h2>
                        <div className="space-y-2 max-h-[320px] overflow-auto">
                            {dropoffRows.slice(0, 12).map((row) => (
                                <div key={`${row.challenge_code}-${row.dropoff_rate}`} className="rounded-lg border border-white/10 bg-slate-900/70 p-3 text-xs">
                                    <p className="text-slate-200">{row.challenge_code} - {row.title}</p>
                                    <p className="text-slate-400 mt-1">Started {row.started_count} / Completed {row.completed_count}</p>
                                    <p className="text-amber-300 mt-1">Drop-off {row.dropoff_rate}%</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-slate-800/50 p-5">
                        <h2 className="font-bold mb-4">Debrief coverage</h2>
                        <div className="space-y-2 max-h-[320px] overflow-auto">
                            {debriefRows.slice(0, 12).map((row) => (
                                <div key={`${row.challenge_code}-${row.debrief_coverage_rate}`} className="rounded-lg border border-white/10 bg-slate-900/70 p-3 text-xs">
                                    <p className="text-slate-200">{row.challenge_code} - {row.title}</p>
                                    <p className="text-slate-400 mt-1">Debriefs {row.debrief_count}/{row.completed_count}</p>
                                    <p className="text-cyan-300 mt-1">Coverage {row.debrief_coverage_rate}%</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-slate-800/50 p-5">
                        <h2 className="font-bold mb-4">Feedback hotspots</h2>
                        <div className="space-y-2 max-h-[320px] overflow-auto">
                            {feedbackHotspots.slice(0, 12).map((item) => (
                                <div key={item.feedback_code} className="rounded-lg border border-white/10 bg-slate-900/70 p-3 text-xs">
                                    <p className="text-slate-200">{item.feedback_code}</p>
                                    <p className="text-slate-400 mt-1">{item.occurrences} occurrences</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="mt-6 grid lg:grid-cols-3 gap-6">
                    <div className="rounded-2xl border border-white/10 bg-slate-800/50 p-5">
                        <h2 className="font-bold mb-4">Learner profiles</h2>
                        <div className="space-y-2 text-xs">
                            {learnerProfiles.map((item) => (
                                <div key={item.learner_profile} className="rounded-lg border border-white/10 bg-slate-900/70 px-3 py-2 flex items-center justify-between">
                                    <span>{item.learner_profile}</span>
                                    <span className="font-mono text-cyan-200">{item.learners}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-slate-800/50 p-5">
                        <h2 className="font-bold mb-4">Blockage by step</h2>
                        <div className="space-y-2 max-h-[260px] overflow-auto text-xs">
                            {stepBlockage.slice(0, 12).map((item) => (
                                <div key={`${item.challenge_code}-${item.current_guided_step}`} className="rounded-lg border border-white/10 bg-slate-900/70 p-3">
                                    <p className="text-slate-200">{item.challenge_code} step {item.current_guided_step}</p>
                                    <p className="text-slate-400 mt-1">{item.blocked_learners} etudiants bloques</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-slate-800/50 p-5">
                        <h2 className="font-bold mb-4">Telemetry 24h</h2>
                        <div className="space-y-2 max-h-[260px] overflow-auto text-xs">
                            {telemetryVolume.map((item) => (
                                <div key={item.event_name} className="rounded-lg border border-white/10 bg-slate-900/70 px-3 py-2 flex items-center justify-between">
                                    <span className="text-slate-200">{item.event_name}</span>
                                    <span className="font-mono text-emerald-300">{item.events_24h}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
