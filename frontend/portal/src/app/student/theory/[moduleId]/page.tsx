'use client';

import { use, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Book, ArrowLeft, CheckCircle, ChevronRight, RefreshCw, AlertCircle } from 'lucide-react';
import { useAuth } from '../../../auth/useAuth';
import { CourseRichRenderer } from '../../../../components/cursus/CourseRichRenderer';

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
        fetchContent();
    }, [authLoading, fetchContent]);

    if (authLoading || loading) {
        return (
            <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <RefreshCw className="w-8 h-8 animate-spin text-emerald-400" />
                    <span className="text-sm text-slate-500">Chargement du cours...</span>
                </div>
            </div>
        );
    }

    if (!payload) {
        return (
            <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
                <div className="w-full max-w-2xl rounded-2xl border border-red-500/30 bg-red-500/10 p-6">
                    <div className="flex items-start gap-3">
                        <AlertCircle size={20} className="text-red-300 mt-0.5" />
                        <div>
                            <h1 className="text-2xl font-bold text-white mb-2">Cours indisponible</h1>
                            <p className="text-sm text-red-100/90 mb-4">
                                {error || 'Le contenu demandé est introuvable.'}
                            </p>
                            <div className="flex flex-wrap items-center gap-3">
                                <button
                                    onClick={fetchContent}
                                    className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-sm font-medium"
                                >
                                    Réessayer
                                </button>
                                <Link
                                    href="/student/cursus"
                                    className="px-4 py-2 rounded-lg border border-white/15 bg-slate-900/60 text-sm hover:bg-slate-800"
                                >
                                    Retour aux cursus
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const title = payload.workshop?.title || payload.content?.title || moduleId;
    const description = payload.workshop?.description || payload.content?.description || '';
    const sections = payload.content?.sections || [];
    const quizAvailable = Boolean(payload.workshop?.quizId);

    return (
        <div className="min-h-screen bg-slate-950 text-white p-6 md:p-12">
            <div className="max-w-4xl mx-auto space-y-8">
                <div className="space-y-4">
                    <div className="text-xs text-slate-500 flex items-center gap-1.5">
                        <Link href="/student" className="hover:text-emerald-400">Mon Parcours</Link>
                        <ChevronRight size={12} />
                        <Link href="/student/cursus" className="hover:text-emerald-400">Cursus</Link>
                        <ChevronRight size={12} />
                        <span className="text-emerald-400">{title}</span>
                    </div>

                    <Link
                        href="/student/cursus"
                        className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Retour aux cursus
                    </Link>

                    <div className="flex items-center gap-4">
                        <div className="p-4 bg-blue-500/20 rounded-2xl border border-blue-500/30">
                            <Book className="w-8 h-8 text-blue-400" />
                        </div>
                        <div>
                            <h1 className="text-3xl md:text-4xl font-black">{title}</h1>
                            <p className="text-slate-400 mt-2">{description}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-6">
                    <h2 className="text-xl font-bold mb-4">Sommaire</h2>
                    {sections.length > 0 ? (
                        <ul className="space-y-2">
                            {sections.map((section, index) => (
                                <li key={section.id || `${index}`}>
                                    <a
                                        href={`#section-${index}`}
                                        className="text-slate-400 hover:text-emerald-400 transition"
                                    >
                                        {section.title}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-slate-500 text-sm">Aucune section disponible pour le moment.</p>
                    )}
                </div>

                <div className="space-y-8">
                    {sections.map((section, index) => (
                        <div
                            key={section.id || `${index}`}
                            id={`section-${index}`}
                            className="bg-slate-900/60 border border-white/10 rounded-2xl p-8 space-y-4"
                        >
                            <h2 className="text-2xl font-black text-emerald-400">
                                {section.title}
                            </h2>
                            <CourseRichRenderer content={section.content} showToc={false} />
                        </div>
                    ))}
                </div>

                <div className="flex gap-4 justify-center pt-8">
                    {quizAvailable ? (
                        <Link
                            href={`/student/quiz/${moduleId}`}
                            className="px-8 py-4 bg-emerald-600 rounded-2xl font-bold hover:bg-emerald-500 transition flex items-center gap-2"
                        >
                            <CheckCircle className="w-5 h-5" />
                            Passer le quiz
                        </Link>
                    ) : (
                        <div className="px-8 py-4 bg-slate-800/70 border border-white/10 rounded-2xl text-slate-400 font-bold">
                            Quiz indisponible
                        </div>
                    )}
                    <Link
                        href="/student/cursus"
                        className="px-8 py-4 bg-slate-800 rounded-2xl font-bold hover:bg-slate-700 transition"
                    >
                        Retour au parcours
                    </Link>
                </div>
            </div>
        </div>
    );
}
