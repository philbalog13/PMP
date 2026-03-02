'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '../../auth/useAuth';
import {
    Users, TrendingUp, CheckCircle, Activity,
    RefreshCw, Search, UserPlus,
    BookOpen, BarChart3, GraduationCap, Beaker
} from 'lucide-react';
import { NotionProgress } from '@shared/components/notion/NotionProgress';
import { NotionSkeleton } from '@shared/components/notion/NotionSkeleton';

interface Student {
    id: string;
    username: string;
    first_name: string;
    last_name: string;
    email: string;
    status: string;
    workshops_completed: number;
    total_xp: number;
    badge_count: number;
}

export default function InstructorStudentsPage() {
    const { isLoading } = useAuth(true);
    const [students, setStudents] = useState<Student[]>([]);
    const [dataLoading, setDataLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    const fetchStudents = useCallback(async () => {
        const token = localStorage.getItem('token');
        if (!token) return;
        try {
            setError(null);
            const res = await fetch('/api/users/students?limit=50', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setStudents(data.students || []);
            } else {
                throw new Error('Impossible de charger les étudiants');
            }
        } catch (e: any) {
            setError(e.message);
        } finally {
            setDataLoading(false);
        }
    }, []);

    useEffect(() => {
        if (isLoading) return;
        fetchStudents();
    }, [isLoading, fetchStudents]);

    const activeStudents = students.filter(s => s.status === 'ACTIVE').length;
    const avgCompletion = students.length > 0
        ? Math.round(students.reduce((acc, s) => acc + Math.min(100, Math.round((s.workshops_completed / 6) * 100)), 0) / students.length)
        : 0;
    const totalModulesValidated = students.reduce((acc, s) => acc + s.workshops_completed, 0);

    const filteredStudents = students.filter(s => {
        if (!searchQuery) return true;
        const name = `${s.first_name} ${s.last_name} ${s.username} ${s.email}`.toLowerCase();
        return name.includes(searchQuery.toLowerCase());
    });

    if (isLoading || dataLoading) {
        return (
            <div style={{ minHeight: '100vh', background: 'var(--n-bg-secondary)' }}>
                <div style={{ background: 'var(--n-bg-primary)', borderBottom: '1px solid var(--n-border)', padding: '24px 32px' }}>
                    <NotionSkeleton type="title" />
                </div>
                <div style={{ padding: '32px', maxWidth: 1200, margin: '0 auto' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
                        {[...Array(4)].map((_, i) => <NotionSkeleton key={i} type="stat" />)}
                    </div>
                    {[...Array(5)].map((_, i) => <div key={i} style={{ marginBottom: 8 }}><NotionSkeleton type="card" /></div>)}
                </div>
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', background: 'var(--n-bg-secondary)' }}>
            {/* Page Header */}
            <div style={{ background: 'var(--n-bg-primary)', borderBottom: '1px solid var(--n-border)', padding: '24px 32px' }}>
                <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--n-accent-bg)', border: '1px solid var(--n-accent-border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Users size={20} style={{ color: 'var(--n-accent)' }} />
                        </div>
                        <div>
                            <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--n-text-primary)', margin: 0 }}>Suivi Étudiants</h1>
                            <p style={{ fontSize: 13, color: 'var(--n-text-tertiary)', margin: '2px 0 0' }}>
                                {students.length} étudiant{students.length !== 1 ? 's' : ''} inscrit{students.length !== 1 ? 's' : ''}
                            </p>
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <button
                            onClick={() => { setDataLoading(true); fetchStudents(); }}
                            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, border: '1px solid var(--n-border)', background: 'var(--n-bg-secondary)', color: 'var(--n-text-secondary)', fontSize: 13, cursor: 'pointer' }}
                        >
                            <RefreshCw size={14} />
                            Actualiser
                        </button>
                        <Link
                            href="/instructor/students/add"
                            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, background: 'var(--n-accent)', color: '#fff', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}
                        >
                            <UserPlus size={14} />
                            Ajouter
                        </Link>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 20, background: 'var(--n-success-bg)', border: '1px solid var(--n-success-border)' }}>
                            <Activity size={12} style={{ color: 'var(--n-success)' }} />
                            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--n-success)' }}>Live</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div style={{ padding: '32px', maxWidth: 1200, margin: '0 auto' }}>
                {error && (
                    <div style={{ padding: '12px 16px', background: 'var(--n-danger-bg)', border: '1px solid var(--n-danger-border)', borderRadius: 8, color: 'var(--n-danger)', fontSize: 13, marginBottom: 24 }}>
                        {error}
                    </div>
                )}

                {/* Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
                    <StatCard label="Étudiants Actifs" value={String(activeStudents)} icon={<Users size={18} />} accent="var(--n-success)" accentBg="var(--n-success-bg)" />
                    <StatCard label="Complétion Moyenne" value={`${avgCompletion}%`} icon={<TrendingUp size={18} />} accent="var(--n-accent)" accentBg="var(--n-accent-bg)" />
                    <StatCard label="XP Total Cohorte" value={students.reduce((acc, s) => acc + s.total_xp, 0).toLocaleString()} icon={<GraduationCap size={18} />} accent="#8b5cf6" accentBg="#8b5cf610" />
                    <StatCard label="Modules Validés" value={String(totalModulesValidated)} icon={<CheckCircle size={18} />} accent="var(--n-success)" accentBg="var(--n-success-bg)" />
                </div>

                {/* Search */}
                <div style={{ position: 'relative', maxWidth: 400, marginBottom: 24 }}>
                    <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--n-text-tertiary)', pointerEvents: 'none' }} />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Rechercher un étudiant..."
                        style={{ width: '100%', paddingLeft: 38, paddingRight: 12, paddingTop: 9, paddingBottom: 9, borderRadius: 8, border: '1px solid var(--n-border)', background: 'var(--n-bg-primary)', color: 'var(--n-text-primary)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
                    />
                </div>

                {/* Table */}
                <div style={{ background: 'var(--n-bg-primary)', border: '1px solid var(--n-border)', borderRadius: 10, overflow: 'hidden', marginBottom: 32 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--n-border)', background: 'var(--n-bg-secondary)' }}>
                                {['Étudiant', 'Ateliers', 'XP', 'Badges', 'Progression', 'Statut', 'Actions'].map(h => (
                                    <th key={h} style={{ padding: '10px 16px', textAlign: h === 'Actions' ? 'right' : 'left', fontSize: 11, fontWeight: 600, color: 'var(--n-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {filteredStudents.length === 0 ? (
                                <tr>
                                    <td colSpan={7} style={{ padding: '48px 16px', textAlign: 'center', color: 'var(--n-text-tertiary)', fontSize: 14 }}>
                                        {searchQuery ? 'Aucun étudiant ne correspond à votre recherche' : 'Aucun étudiant inscrit'}
                                    </td>
                                </tr>
                            ) : (
                                filteredStudents.map((student) => {
                                    const name = [student.first_name, student.last_name].filter(Boolean).join(' ') || student.username;
                                    const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
                                    const progressPercent = Math.min(100, Math.round((student.workshops_completed / 6) * 100));
                                    const isStruggling = progressPercent < 20 && student.total_xp < 50;

                                    return (
                                        <tr key={student.id} style={{ borderBottom: '1px solid var(--n-border)' }}>
                                            <td style={{ padding: '12px 16px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                    <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--n-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 11, flexShrink: 0 }}>
                                                        {initials}
                                                    </div>
                                                    <div>
                                                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--n-text-primary)' }}>{name}</div>
                                                        <div style={{ fontSize: 11, color: 'var(--n-text-tertiary)' }}>{student.email}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600, color: 'var(--n-text-primary)' }}>{student.workshops_completed}/6</td>
                                            <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 700, color: 'var(--n-success)' }}>{student.total_xp}</td>
                                            <td style={{ padding: '12px 16px' }}>
                                                <span style={{ padding: '3px 8px', borderRadius: 6, background: 'var(--n-warning-bg)', border: '1px solid var(--n-warning-border)', fontSize: 11, fontWeight: 600, color: 'var(--n-warning)' }}>
                                                    {student.badge_count}
                                                </span>
                                            </td>
                                            <td style={{ padding: '12px 16px', width: 160 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                    <div style={{ flex: 1 }}>
                                                        <NotionProgress
                                                            value={progressPercent}
                                                            variant={isStruggling ? 'warning' : 'accent'}
                                                            size="thin"
                                                        />
                                                    </div>
                                                    <span style={{ fontSize: 11, color: 'var(--n-text-tertiary)', minWidth: '2.5rem', textAlign: 'right' }}>{progressPercent}%</span>
                                                </div>
                                            </td>
                                            <td style={{ padding: '12px 16px' }}>
                                                <span style={{
                                                    padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
                                                    background: student.status === 'ACTIVE' ? 'var(--n-success-bg)' : 'var(--n-bg-tertiary)',
                                                    color: student.status === 'ACTIVE' ? 'var(--n-success)' : 'var(--n-text-tertiary)',
                                                    border: `1px solid ${student.status === 'ACTIVE' ? 'var(--n-success-border)' : 'var(--n-border)'}`,
                                                }}>
                                                    {student.status === 'ACTIVE' ? 'Actif' : 'Inactif'}
                                                </span>
                                            </td>
                                            <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                                                <Link
                                                    href={`/instructor/students/${student.id}`}
                                                    style={{ fontSize: 12, fontWeight: 600, color: 'var(--n-accent)', textDecoration: 'none' }}
                                                >
                                                    Détails →
                                                </Link>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Quick Actions */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                    {[
                        { href: '/instructor/exercises', icon: <BookOpen size={18} />, label: 'Gestion Exercices', desc: 'Créer et modifier les exercices pédagogiques', accent: 'var(--n-accent)' },
                        { href: '/instructor/lab-control', icon: <Beaker size={18} />, label: 'Contrôle Lab', desc: "Injecter des conditions d'erreur pour les exercices", accent: 'var(--n-warning)' },
                        { href: '/instructor/analytics', icon: <BarChart3 size={18} />, label: 'Analytics', desc: 'Statistiques détaillées et classements', accent: 'var(--n-success)' },
                    ].map(({ href, icon, label, desc, accent }) => (
                        <Link
                            key={href}
                            href={href}
                            style={{ display: 'block', padding: 20, background: 'var(--n-bg-primary)', border: '1px solid var(--n-border)', borderRadius: 10, textDecoration: 'none' }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                                <span style={{ color: accent }}>{icon}</span>
                                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--n-text-primary)' }}>{label}</span>
                            </div>
                            <p style={{ fontSize: 12, color: 'var(--n-text-tertiary)', margin: 0 }}>{desc}</p>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}

function StatCard({ label, value, icon, accent, accentBg }: { label: string; value: string; icon: React.ReactNode; accent: string; accentBg: string }) {
    return (
        <div style={{ background: 'var(--n-bg-primary)', border: '1px solid var(--n-border)', borderRadius: 10, padding: 20 }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: accentBg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: accent, marginBottom: 12 }}>
                {icon}
            </div>
            <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--n-text-primary)', lineHeight: 1.2 }}>{value}</div>
            <div style={{ fontSize: 12, color: 'var(--n-text-tertiary)', marginTop: 4 }}>{label}</div>
        </div>
    );
}
