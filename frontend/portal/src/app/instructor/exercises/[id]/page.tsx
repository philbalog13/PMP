'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, FileText, User, Clock, CheckCircle2, XCircle, AlertCircle, BarChart3, RefreshCw } from 'lucide-react';
import Link from 'next/link';

interface Submission {
    id: string;
    userId: string;
    username: string;
    firstName: string;
    lastName: string;
    score: number | null;
    status: string;
    submittedAt: string;
    duration: number | null;
}

interface ExerciseDetails {
    id: string;
    title: string;
    points: number;
    difficulty: string;
    type: string;
}

const toRecord = (v: unknown): Record<string, unknown> =>
    v !== null && typeof v === 'object' ? (v as Record<string, unknown>) : {};

export default function ExerciseSubmissionsPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const [exercise, setExercise] = useState<ExerciseDetails | null>(null);
    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetch_ = async () => {
        setLoading(true);
        setError(null);
        try {
            const token = localStorage.getItem('token');
            if (!token) throw new Error('Session introuvable');

            const [exRes, subRes] = await Promise.all([
                fetch(`/api/exercises/${id}`, { headers: { Authorization: `Bearer ${token}` } }),
                fetch(`/api/exercises/${id}/submissions`, { headers: { Authorization: `Bearer ${token}` } }),
            ]);

            if (!exRes.ok) throw new Error(`Exercice introuvable (${exRes.status})`);
            const exData = toRecord(await exRes.json());
            const ex = toRecord(exData.exercise ?? exData);
            setExercise({
                id: String(ex.id ?? id),
                title: String(ex.title ?? ''),
                points: Number(ex.points ?? 0),
                difficulty: String(ex.difficulty ?? ''),
                type: String(ex.type ?? ''),
            });

            if (subRes.ok) {
                const subData = toRecord(await subRes.json());
                const rawSubs = Array.isArray(subData.submissions) ? subData.submissions : [];
                setSubmissions(rawSubs.map((s: unknown) => {
                    const r = toRecord(s);
                    const user = toRecord(r.user);
                    return {
                        id: String(r.id ?? ''),
                        userId: String(r.userId ?? r.user_id ?? ''),
                        username: String(r.username ?? user.username ?? ''),
                        firstName: String(r.firstName ?? r.first_name ?? user.firstName ?? ''),
                        lastName: String(r.lastName ?? r.last_name ?? user.lastName ?? ''),
                        score: r.score !== undefined && r.score !== null ? Number(r.score) : null,
                        status: String(r.status ?? 'PENDING'),
                        submittedAt: String(r.submittedAt ?? r.submitted_at ?? ''),
                        duration: r.duration !== undefined && r.duration !== null ? Number(r.duration) : null,
                    };
                }));
            }
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Erreur');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { void fetch_(); }, [id]);

    const STATUS_STYLES: Record<string, { bg: string; color: string; icon: React.ReactElement }> = {
        COMPLETED: { bg: 'var(--n-success-bg)', color: 'var(--n-success)', icon: <CheckCircle2 size={13} /> },
        PASSED: { bg: 'var(--n-success-bg)', color: 'var(--n-success)', icon: <CheckCircle2 size={13} /> },
        FAILED: { bg: 'var(--n-danger-bg)', color: 'var(--n-danger)', icon: <XCircle size={13} /> },
        PENDING: { bg: 'var(--n-border)', color: 'var(--n-text-secondary)', icon: <AlertCircle size={13} /> },
    };

    const avgScore = submissions.length
        ? submissions.reduce((s, sub) => s + (sub.score ?? 0), 0) / submissions.length
        : null;

    if (loading) {
        return (
            <div style={{ minHeight: '100vh', background: 'var(--n-bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ width: '36px', height: '36px', border: '2px solid var(--n-border)', borderTopColor: 'var(--n-accent)', borderRadius: '50%', margin: '0 auto 12px' }} />
                    <p style={{ fontSize: '13px', color: 'var(--n-text-tertiary)' }}>Chargement des soumissions...</p>
                </div>
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', background: 'var(--n-bg-secondary)', padding: '32px 24px' }}>
            <div style={{ maxWidth: '900px', margin: '0 auto' }}>

                {/* Header */}
                <div style={{ marginBottom: '24px' }}>
                    <Link href="/instructor/exercises" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--n-text-secondary)', textDecoration: 'none', marginBottom: '14px' }}>
                        <ArrowLeft size={13} /> Retour aux exercices
                    </Link>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                        <div>
                            <h1 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--n-text-primary)', margin: 0 }}>
                                {exercise?.title ?? 'Exercice'}
                            </h1>
                            <p style={{ color: 'var(--n-text-secondary)', fontSize: '14px', marginTop: '4px' }}>
                                Soumissions des apprenants
                            </p>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            <button onClick={() => void fetch_()} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', background: 'var(--n-bg-primary)', border: '1px solid var(--n-border)', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', color: 'var(--n-text-primary)' }}>
                                <RefreshCw size={13} /> Actualiser
                            </button>
                            <Link href={`/instructor/exercises/${id}/edit`} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '7px 14px', background: 'var(--n-accent)', color: '#fff', borderRadius: '6px', textDecoration: 'none', fontSize: '13px', fontWeight: 500 }}>
                                Modifier l&apos;exercice
                            </Link>
                        </div>
                    </div>
                </div>

                {error && (
                    <div style={{ marginBottom: '16px', padding: '12px 16px', background: 'var(--n-danger-bg)', border: '1px solid var(--n-danger)', borderRadius: '6px', color: 'var(--n-danger)', fontSize: '13px' }}>{error}</div>
                )}

                {/* Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '24px' }}>
                    {[
                        { label: 'Total soumissions', value: submissions.length, icon: <BarChart3 size={15} style={{ color: 'var(--n-accent)' }} /> },
                        { label: 'Score moyen', value: avgScore !== null ? `${avgScore.toFixed(1)} pts` : '—', icon: <CheckCircle2 size={15} style={{ color: 'var(--n-success)' }} /> },
                        { label: 'Points max', value: `${exercise?.points ?? 0} pts`, icon: <FileText size={15} style={{ color: 'var(--n-warning)' }} /> },
                    ].map(({ label, value, icon }) => (
                        <div key={label} style={{ background: 'var(--n-bg-primary)', border: '1px solid var(--n-border)', borderRadius: '8px', padding: '14px 16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>{icon}<span style={{ fontSize: '12px', color: 'var(--n-text-secondary)' }}>{label}</span></div>
                            <p style={{ fontSize: '20px', fontWeight: 700, color: 'var(--n-text-primary)', margin: 0 }}>{value}</p>
                        </div>
                    ))}
                </div>

                {/* Table */}
                <div style={{ background: 'var(--n-bg-primary)', border: '1px solid var(--n-border)', borderRadius: '8px', overflow: 'hidden' }}>
                    {submissions.length === 0 ? (
                        <div style={{ padding: '48px', textAlign: 'center' }}>
                            <FileText style={{ width: '36px', height: '36px', color: 'var(--n-text-tertiary)', margin: '0 auto 12px' }} />
                            <p style={{ color: 'var(--n-text-secondary)', fontSize: '14px' }}>Aucune soumission pour le moment.</p>
                        </div>
                    ) : (
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--n-border)', background: 'var(--n-bg-secondary)' }}>
                                    {['Apprenant', 'Score', 'Statut', 'Durée', 'Date'].map(col => (
                                        <th key={col} style={{ padding: '10px 14px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: 'var(--n-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{col}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {submissions.map((sub, i) => {
                                    const st = STATUS_STYLES[sub.status] || STATUS_STYLES.PENDING;
                                    const fullName = [sub.firstName, sub.lastName].filter(Boolean).join(' ') || sub.username;
                                    return (
                                        <tr key={sub.id} style={{ borderBottom: i < submissions.length - 1 ? '1px solid var(--n-border)' : 'none' }}>
                                            <td style={{ padding: '12px 14px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <User size={14} style={{ color: 'var(--n-text-tertiary)' }} />
                                                    <div>
                                                        <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--n-text-primary)', margin: 0 }}>{fullName}</p>
                                                        <p style={{ fontSize: '12px', color: 'var(--n-text-tertiary)', margin: 0 }}>@{sub.username}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td style={{ padding: '12px 14px', fontSize: '14px', fontWeight: 600, color: 'var(--n-text-primary)' }}>
                                                {sub.score !== null ? `${sub.score} / ${exercise?.points ?? '?'}` : '—'}
                                            </td>
                                            <td style={{ padding: '12px 14px' }}>
                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '3px 9px', borderRadius: '20px', background: st.bg, color: st.color, fontSize: '12px', fontWeight: 500 }}>
                                                    {st.icon}{sub.status}
                                                </span>
                                            </td>
                                            <td style={{ padding: '12px 14px', fontSize: '13px', color: 'var(--n-text-secondary)' }}>
                                                {sub.duration !== null ? (
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                        <Clock size={13} />{sub.duration} min
                                                    </span>
                                                ) : '—'}
                                            </td>
                                            <td style={{ padding: '12px 14px', fontSize: '12px', color: 'var(--n-text-tertiary)' }}>
                                                {sub.submittedAt ? new Date(sub.submittedAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
}
