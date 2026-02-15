'use client';

import { use, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, BookOpen, CheckCircle2, RefreshCw } from 'lucide-react';
import { useAuth } from '../../../auth/useAuth';
import { CourseRichRenderer } from '../../../../components/cursus/CourseRichRenderer';
import { CourseCard, CoursePageShell, CoursePill } from '@/components/course/CoursePageShell';

interface WorkshopSection {
    id: string;
    title: string;
    content: string;
}

interface WorkshopContentPayload {
    workshop: {
        id: string;
        title: string;
        description: string;
        quizId: string | null;
    };
    content: {
        workshopId: string;
        title: string;
        description: string;
        sections: WorkshopSection[];
    };
}

export default function TheoryPage({ params }: { params: Promise<{ moduleId: string }> }) {
    const { moduleId } = use(params);
    const { isLoading: authLoading } = useAuth(true);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [payload, setPayload] = useState<WorkshopContentPayload | null>(null);

    const fetchContent = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('Session expirée. Merci de vous reconnecter.');
            }

            const response = await fetch(`/api/progress/workshops/${moduleId}/content`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (!response.ok) {
                const body = await response.json().catch(() => ({}));
                throw new Error(body.error || 'Impossible de charger le contenu du cours.');
            }

            const body = await response.json();
            if (!body.success) {
                throw new Error(body.error || 'Impossible de charger le contenu du cours.');
            }

            setPayload(body);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erreur de chargement du cours.');
        } finally {
            setLoading(false);
        }
    }, [moduleId]);

    useEffect(() => {
        if (authLoading) return;
        void fetchContent();
    }, [authLoading, fetchContent]);

    if (authLoading || loading) {
        return (
            <CoursePageShell
                title="Chargement du cours…"
                description="Préparation de votre contenu pédagogique."
                icon={<BookOpen className="h-8 w-8 text-emerald-300" />}
                crumbs={[
                    { label: 'Mon Parcours', href: '/student' },
                    { label: 'Ateliers', href: '/student' },
                    { label: 'Cours' },
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
                        <div className="h-3 w-2/3 rounded bg-slate-800/70" />
                        <div className="h-3 w-full rounded bg-slate-800/50" />
                        <div className="h-3 w-5/6 rounded bg-slate-800/40" />
                    </div>
                </CourseCard>
            </CoursePageShell>
        );
    }

    if (!payload) {
        return (
            <CoursePageShell
                title="Cours indisponible"
                description={error || 'Le contenu demandé est introuvable.'}
                icon={<BookOpen className="h-8 w-8 text-emerald-300" />}
                crumbs={[
                    { label: 'Mon Parcours', href: '/student' },
                    { label: 'Ateliers', href: '/student' },
                    { label: 'Erreur' },
                ]}
                backHref="/student"
                backLabel="Retour au parcours"
            >
                <CourseCard className="border border-red-500/20 bg-red-500/5">
                    <div className="flex items-start gap-3">
                        <AlertCircle className="mt-0.5 h-5 w-5 text-red-300" />
                        <div className="min-w-0">
                            <h2 className="text-lg font-semibold text-white">Impossible de charger le cours</h2>
                            <p className="mt-1 text-sm text-red-100/90">
                                {error || 'Le contenu demandé est introuvable.'}
                            </p>
                            <div className="mt-4 flex flex-wrap items-center gap-2">
                                <button
                                    onClick={fetchContent}
                                    className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold"
                                >
                                    Réessayer
                                </button>
                                <Link
                                    href="/student"
                                    className="px-4 py-2.5 rounded-xl border border-white/10 bg-slate-900/40 text-sm font-semibold hover:bg-slate-900/60"
                                >
                                    Retour au parcours
                                </Link>
                            </div>
                        </div>
                    </div>
                </CourseCard>
            </CoursePageShell>
        );
    }

    const title = payload.workshop?.title || payload.content?.title || moduleId;
    const description = payload.workshop?.description || payload.content?.description || '';
    const sections = payload.content?.sections || [];
    const quizAvailable = Boolean(payload.workshop?.quizId);

    return (
        <CoursePageShell
            title={title}
            description={description}
            icon={<BookOpen className="h-8 w-8 text-emerald-300" />}
            crumbs={[
                { label: 'Mon Parcours', href: '/student' },
                { label: 'Ateliers', href: '/student' },
                { label: title },
            ]}
            backHref="/student"
            backLabel="Retour au parcours"
            meta={
                <>
                    <CoursePill tone="slate">{sections.length} section{sections.length > 1 ? 's' : ''}</CoursePill>
                    <CoursePill tone={quizAvailable ? 'emerald' : 'slate'}>
                        <CheckCircle2 className="h-4 w-4" />
                        {quizAvailable ? 'Quiz disponible' : 'Quiz indisponible'}
                    </CoursePill>
                </>
            }
            actions={
                <>
                    {quizAvailable ? (
                        <Link
                            href={`/student/quiz/${moduleId}`}
                            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold shadow-lg shadow-emerald-500/20"
                        >
                            Passer le quiz
                        </Link>
                    ) : (
                        <span className="px-4 py-2.5 rounded-xl border border-white/10 bg-slate-900/40 text-slate-400 text-sm font-semibold">
                            Quiz indisponible
                        </span>
                    )}
                    <Link
                        href="/student"
                        className="px-4 py-2.5 rounded-xl border border-white/10 bg-slate-900/40 hover:bg-slate-900/60 text-white/90 text-sm font-semibold"
                    >
                        Retour
                    </Link>
                </>
            }
            aside={
                <CourseCard className="p-4">
                    <p className="text-[11px] text-slate-500 font-semibold uppercase tracking-[0.2em] mb-3">
                        Sommaire
                    </p>
                    {sections.length > 0 ? (
                        <div className="space-y-1">
                            {sections.map((section, index) => (
                                <a
                                    key={section.id || `${index}`}
                                    href={`#section-${index}`}
                                    className="block rounded-lg px-2.5 py-2 text-sm text-slate-300 hover:text-emerald-300 hover:bg-white/5 transition-colors"
                                >
                                    {section.title}
                                </a>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-slate-500">Aucune section pour le moment.</p>
                    )}
                </CourseCard>
            }
        >
            <CourseCard className="p-0 overflow-hidden">
                {sections.length > 0 ? (
                    <div className="px-6 md:px-8 py-2">
                        {sections.map((section, index) => (
                            <section
                                key={section.id || `${index}`}
                                id={`section-${index}`}
                                className="scroll-mt-28 py-8 border-b border-white/5 last:border-0"
                            >
                                <h2 className="text-2xl font-black tracking-tight text-emerald-300">
                                    {section.title}
                                </h2>
                                <div className="mt-4">
                                    <CourseRichRenderer content={section.content} showToc={false} />
                                </div>
                            </section>
                        ))}
                    </div>
                ) : (
                    <div className="p-6 md:p-8">
                        <p className="text-sm text-slate-400">
                            Aucune section disponible pour ce cours.
                        </p>
                    </div>
                )}
            </CourseCard>

            <div className="mt-6 flex flex-wrap items-center justify-end gap-2">
                {quizAvailable && (
                    <Link
                        href={`/student/quiz/${moduleId}`}
                        className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold shadow-lg shadow-emerald-500/20"
                    >
                        Passer le quiz
                    </Link>
                )}
                <Link
                    href="/student"
                    className="px-4 py-2.5 rounded-xl border border-white/10 bg-slate-900/40 hover:bg-slate-900/60 text-white/90 text-sm font-semibold"
                >
                    Retour au parcours
                </Link>
            </div>
        </CoursePageShell>
    );
}

