'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    BarChart3,
    RefreshCw,
    Timer,
    Users,
    Flame,
    RotateCcw,
} from 'lucide-react';
import { useAuth } from '../../auth/useAuth';
import { NotionProgress, NotionSkeleton } from '@shared/components/notion';

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

function Panel({ title, children }: { title: React.ReactNode; children: React.ReactNode }) {
    return (
        <div style={{ background: 'var(--n-bg-primary)', border: '1px solid var(--n-border)', borderRadius: '8px', overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--n-border)', fontSize: '13px', fontWeight: 600, color: 'var(--n-text-primary)' }}>
                {title}
            </div>
            <div style={{ padding: '12px 16px' }}>
                {children}
            </div>
        </div>
    );
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
        if (!token) return;

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
        if (isLoading) return;
        refresh();
    }, [isLoading, refresh]);

    const hardestChallenges = useMemo(() => {
        return [...challengeStats]
            .sort((a, b) => Number(a.resolution_rate) - Number(b.resolution_rate))
            .slice(0, 5);
    }, [challengeStats]);

    const handleResetStudent = useCallback(async (studentId: string) => {
        const token = localStorage.getItem('token');
        if (!token) return;

        try {
            const response = await fetch(`/api/ctf/admin/reset/${studentId}`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
            });
            const payload = await response.json();
            if (!response.ok) throw new Error(payload.error || 'Reset impossible');
            await refresh();
        } catch (resetError: unknown) {
            setError(resetError instanceof Error ? resetError.message : 'Erreur reset progression');
        }
    }, [refresh]);

    if (isLoading || loading) {
        return (
            <div style={{ minHeight: '100vh', background: 'var(--n-bg-secondary)', padding: '32px 24px' }}>
                <NotionSkeleton type="line" />
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px', marginTop: '24px' }}>
                    <NotionSkeleton type="card" />
                    <NotionSkeleton type="card" />
                </div>
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', background: 'var(--n-bg-secondary)' }}>
            {/* Page header */}
            <div style={{ background: 'var(--n-bg-primary)', borderBottom: '1px solid var(--n-border)', padding: '20px 24px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    <div>
                        <h1 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--n-text-primary)', margin: 0 }}>
                            CTF Instructor Console
                        </h1>
                        <p style={{ fontSize: '13px', color: 'var(--n-text-secondary)', marginTop: '4px' }}>
                            Suivi des résolutions, difficultés et étudiants bloqués.
                        </p>
                    </div>
                    <button
                        onClick={refresh}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '6px',
                            padding: '7px 14px', background: 'var(--n-bg-secondary)',
                            border: '1px solid var(--n-border)', borderRadius: '6px',
                            fontSize: '13px', color: 'var(--n-text-primary)', cursor: 'pointer',
                        }}
                    >
                        <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} /> Refresh
                    </button>
                </div>
                {error && (
                    <div style={{ marginTop: '12px', padding: '10px 14px', background: 'var(--n-danger-bg)', border: '1px solid var(--n-danger-border)', borderRadius: '6px', fontSize: '13px', color: 'var(--n-danger)' }}>
                        {error}
                    </div>
                )}
            </div>

            <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

                {/* Taux de résolution + Plus difficiles */}
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
                    <Panel title={<span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><BarChart3 size={14} style={{ color: 'var(--n-accent)' }} />Taux de résolution</span>}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {challengeStats.length === 0 && <p style={{ fontSize: '12px', color: 'var(--n-text-tertiary)' }}>Aucune donnée.</p>}
                            {challengeStats.map((stat) => {
                                const rate = Number(stat.resolution_rate || 0);
                                return (
                                    <div key={stat.challenge_code}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                            <span style={{ fontSize: '12px', color: 'var(--n-text-primary)' }}>{stat.challenge_code} — {stat.title}</span>
                                            <span style={{ fontSize: '11px', color: 'var(--n-text-tertiary)' }}>
                                                {rate}% ({stat.unique_solvers}) · Axis {stat.avg_axis_score} · Drop-off {stat.dropoff_rate}%
                                            </span>
                                        </div>
                                        <NotionProgress value={rate} variant={rate >= 70 ? 'success' : rate >= 40 ? 'warning' : 'danger'} size="thin" />
                                    </div>
                                );
                            })}
                        </div>
                    </Panel>

                    <Panel title={<span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Flame size={14} style={{ color: 'var(--n-danger)' }} />Plus difficiles</span>}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {hardestChallenges.map((stat) => (
                                <div key={stat.challenge_code} style={{ padding: '8px 10px', background: 'var(--n-bg-secondary)', border: '1px solid var(--n-border)', borderRadius: '6px' }}>
                                    <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--n-text-primary)', margin: 0 }}>{stat.challenge_code}</p>
                                    <p style={{ fontSize: '11px', color: 'var(--n-text-tertiary)', margin: '3px 0 0' }}>Taux: {stat.resolution_rate}%</p>
                                    <p style={{ fontSize: '11px', color: 'var(--n-text-tertiary)', margin: '2px 0 0' }}>Temps moy: {stat.avg_completion_minutes} min</p>
                                    <p style={{ fontSize: '11px', color: 'var(--n-text-tertiary)', margin: '2px 0 0' }}>Debrief: {stat.debrief_coverage_rate}%</p>
                                </div>
                            ))}
                        </div>
                    </Panel>
                </div>

                {/* Soumissions + Bloqués */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <Panel title={<span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Timer size={14} style={{ color: 'var(--n-warning)' }} />Soumissions récentes</span>}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '380px', overflowY: 'auto' }}>
                            {submissions.slice(0, 40).map((item) => {
                                const name = [item.first_name, item.last_name].filter(Boolean).join(' ') || item.username;
                                return (
                                    <div key={item.id} style={{
                                        padding: '8px 10px',
                                        background: 'var(--n-bg-secondary)',
                                        border: `1px solid ${item.is_correct ? 'var(--n-success-border)' : 'var(--n-danger-border)'}`,
                                        borderRadius: '6px',
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                                            <span style={{ fontSize: '12px', color: 'var(--n-text-primary)' }}>{name} — {item.challenge_code}</span>
                                            <span style={{ fontSize: '11px', fontWeight: 600, color: item.is_correct ? 'var(--n-success)' : 'var(--n-danger)' }}>
                                                {item.is_correct ? 'Correct' : 'Incorrect'}
                                            </span>
                                        </div>
                                        <p style={{ fontSize: '11px', color: 'var(--n-text-tertiary)', margin: 0 }}>
                                            {new Date(item.submitted_at).toLocaleString('fr-FR')} · {item.mode} · {item.points_awarded} pts · Axis {item.axis_total_score}
                                        </p>
                                        {Array.isArray(item.feedback_codes) && item.feedback_codes.length > 0 && (
                                            <p style={{ fontSize: '10px', color: 'var(--n-text-tertiary)', margin: '2px 0 0' }}>
                                                Feedback: {item.feedback_codes.slice(0, 3).join(', ')}
                                            </p>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </Panel>

                    <Panel title={<span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Users size={14} style={{ color: 'var(--n-danger)' }} />Étudiants bloqués (+2h)</span>}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '380px', overflowY: 'auto' }}>
                            {blockedStudents.length === 0 && (
                                <div style={{ padding: '10px 12px', background: 'var(--n-success-bg)', border: '1px solid var(--n-success-border)', borderRadius: '6px', fontSize: '12px', color: 'var(--n-success)' }}>
                                    Aucun étudiant bloqué détecté.
                                </div>
                            )}
                            {blockedStudents.map((student) => {
                                const name = [student.first_name, student.last_name].filter(Boolean).join(' ') || student.username;
                                return (
                                    <div key={`${student.student_id}-${student.challenge_code}`} style={{ padding: '10px 12px', background: 'var(--n-warning-bg)', border: '1px solid var(--n-warning-border)', borderRadius: '6px' }}>
                                        <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--n-text-primary)', margin: 0 }}>{name}</p>
                                        <p style={{ fontSize: '11px', color: 'var(--n-text-secondary)', margin: '3px 0 0' }}>{student.challenge_code} — {student.title}</p>
                                        <p style={{ fontSize: '11px', color: 'var(--n-warning)', fontWeight: 600, margin: '3px 0 0' }}>{student.hours_in_progress}h en cours</p>
                                        <p style={{ fontSize: '11px', color: 'var(--n-text-tertiary)', margin: '2px 0 4px' }}>
                                            Step {student.current_guided_step} · {student.failed_attempts} échecs · {student.learner_profile}
                                        </p>
                                        <button
                                            onClick={() => handleResetStudent(student.student_id)}
                                            style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 8px', background: 'var(--n-danger-bg)', border: '1px solid var(--n-danger-border)', borderRadius: '4px', fontSize: '11px', fontWeight: 600, color: 'var(--n-danger)', cursor: 'pointer' }}
                                        >
                                            <RotateCcw size={11} /> Reset progression
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </Panel>
                </div>

                {/* Drop-off · Debrief · Feedback */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                    <Panel title="Drop-off challenge">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '260px', overflowY: 'auto' }}>
                            {dropoffRows.slice(0, 12).map((row) => (
                                <div key={`${row.challenge_code}-${row.dropoff_rate}`} style={{ padding: '8px 10px', background: 'var(--n-bg-secondary)', border: '1px solid var(--n-border)', borderRadius: '6px' }}>
                                    <p style={{ fontSize: '12px', color: 'var(--n-text-primary)', margin: 0 }}>{row.challenge_code} — {row.title}</p>
                                    <p style={{ fontSize: '11px', color: 'var(--n-text-tertiary)', margin: '2px 0 0' }}>Started {row.started_count} / Completed {row.completed_count}</p>
                                    <p style={{ fontSize: '11px', fontWeight: 600, color: row.dropoff_rate > 50 ? 'var(--n-danger)' : 'var(--n-warning)', margin: '2px 0 0' }}>Drop-off {row.dropoff_rate}%</p>
                                </div>
                            ))}
                        </div>
                    </Panel>

                    <Panel title="Debrief coverage">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '260px', overflowY: 'auto' }}>
                            {debriefRows.slice(0, 12).map((row) => (
                                <div key={`${row.challenge_code}-${row.debrief_coverage_rate}`} style={{ padding: '8px 10px', background: 'var(--n-bg-secondary)', border: '1px solid var(--n-border)', borderRadius: '6px' }}>
                                    <p style={{ fontSize: '12px', color: 'var(--n-text-primary)', margin: 0 }}>{row.challenge_code} — {row.title}</p>
                                    <p style={{ fontSize: '11px', color: 'var(--n-text-tertiary)', margin: '2px 0 0' }}>Debriefs {row.debrief_count}/{row.completed_count}</p>
                                    <p style={{ fontSize: '11px', fontWeight: 600, color: 'var(--n-accent)', margin: '2px 0 0' }}>Coverage {row.debrief_coverage_rate}%</p>
                                </div>
                            ))}
                        </div>
                    </Panel>

                    <Panel title="Feedback hotspots">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '260px', overflowY: 'auto' }}>
                            {feedbackHotspots.slice(0, 12).map((item) => (
                                <div key={item.feedback_code} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', background: 'var(--n-bg-secondary)', border: '1px solid var(--n-border)', borderRadius: '6px' }}>
                                    <span style={{ fontSize: '12px', color: 'var(--n-text-primary)' }}>{item.feedback_code}</span>
                                    <span style={{ fontSize: '11px', color: 'var(--n-text-secondary)', fontFamily: 'var(--n-font-mono)' }}>{item.occurrences}×</span>
                                </div>
                            ))}
                        </div>
                    </Panel>
                </div>

                {/* Learner profiles · Step blockage · Telemetry */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                    <Panel title="Learner profiles">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {learnerProfiles.map((item) => (
                                <div key={item.learner_profile} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', background: 'var(--n-bg-secondary)', border: '1px solid var(--n-border)', borderRadius: '6px' }}>
                                    <span style={{ fontSize: '12px', color: 'var(--n-text-primary)' }}>{item.learner_profile}</span>
                                    <span style={{ fontSize: '12px', color: 'var(--n-accent)', fontFamily: 'var(--n-font-mono)', fontWeight: 600 }}>{item.learners}</span>
                                </div>
                            ))}
                        </div>
                    </Panel>

                    <Panel title="Blockage by step">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '240px', overflowY: 'auto' }}>
                            {stepBlockage.slice(0, 12).map((item) => (
                                <div key={`${item.challenge_code}-${item.current_guided_step}`} style={{ padding: '8px 10px', background: 'var(--n-bg-secondary)', border: '1px solid var(--n-border)', borderRadius: '6px' }}>
                                    <p style={{ fontSize: '12px', color: 'var(--n-text-primary)', margin: 0 }}>{item.challenge_code} · step {item.current_guided_step}</p>
                                    <p style={{ fontSize: '11px', color: 'var(--n-text-secondary)', margin: '2px 0 0' }}>{item.blocked_learners} étudiant{item.blocked_learners !== 1 ? 's' : ''} bloqué{item.blocked_learners !== 1 ? 's' : ''}</p>
                                </div>
                            ))}
                        </div>
                    </Panel>

                    <Panel title="Telemetry 24h">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '240px', overflowY: 'auto' }}>
                            {telemetryVolume.map((item) => (
                                <div key={item.event_name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', background: 'var(--n-bg-secondary)', border: '1px solid var(--n-border)', borderRadius: '6px' }}>
                                    <span style={{ fontSize: '11px', color: 'var(--n-text-primary)' }}>{item.event_name}</span>
                                    <span style={{ fontSize: '11px', color: 'var(--n-success)', fontFamily: 'var(--n-font-mono)', fontWeight: 600 }}>{item.events_24h}</span>
                                </div>
                            ))}
                        </div>
                    </Panel>
                </div>
            </div>
        </div>
    );
}
