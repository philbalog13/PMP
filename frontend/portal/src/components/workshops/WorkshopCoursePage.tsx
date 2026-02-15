'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react';
import { CourseCard, CoursePageShell, CoursePill } from '@/components/course/CoursePageShell';
import { CourseRichRenderer } from '@/components/cursus/CourseRichRenderer';

export type WorkshopCourseSection = {
    id: number | string;
    title: string;
    content: string;
    diagram?: string;
    example?: string;
};

export function WorkshopCoursePage({
    workshopLabel,
    title,
    description,
    icon,
    sections,
    backHref = '/workshops',
    backLabel = 'Retour aux ateliers',
    doneHref = '/workshops',
    doneLabel = "Terminer l'atelier",
}: {
    workshopLabel: string;
    title: string;
    description?: string;
    icon: React.ReactNode;
    sections: WorkshopCourseSection[];
    backHref?: string;
    backLabel?: string;
    doneHref?: string;
    doneLabel?: string;
}) {
    const [activeSection, setActiveSection] = useState(0);
    const [completedSections, setCompletedSections] = useState<number[]>([]);

    const safeSections = sections || [];
    const current = safeSections[activeSection];
    const totalSections = safeSections.length;

    const progressPercent = totalSections > 0
        ? Math.round((completedSections.length / totalSections) * 100)
        : 0;

    const renderedContent = useMemo(() => {
        if (!current) return '';
        const artifact = String(current.diagram || current.example || '').trim();
        if (!artifact) return current.content;
        return `${current.content}\n\n\`\`\`text\n${artifact}\n\`\`\``;
    }, [current]);

    const markCompleteAndAdvance = () => {
        if (!completedSections.includes(activeSection)) {
            setCompletedSections((prev) => [...prev, activeSection]);
        }
        if (activeSection < totalSections - 1) {
            setActiveSection((prev) => prev + 1);
        }
    };

    const aside = (
        <div className="space-y-4">
            <CourseCard className="p-4">
                <p className="text-[11px] text-slate-500 font-semibold uppercase tracking-[0.2em] mb-3">
                    Sommaire
                </p>
                <div className="space-y-1">
                    {safeSections.map((section, index) => {
                        const isActive = index === activeSection;
                        const isDone = completedSections.includes(index);

                        return (
                            <button
                                key={String(section.id ?? index)}
                                type="button"
                                onClick={() => setActiveSection(index)}
                                className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-left border transition-colors ${
                                    isActive
                                        ? 'bg-emerald-500/10 text-emerald-200 border-emerald-500/20'
                                        : 'bg-transparent text-slate-300 border-transparent hover:bg-white/5 hover:border-white/10'
                                }`}
                            >
                                {isDone ? (
                                    <CheckCircle2 className="h-4 w-4 text-emerald-300 flex-shrink-0" />
                                ) : (
                                    <span className="h-3.5 w-3.5 rounded-full border border-slate-600 flex-shrink-0" />
                                )}
                                <span className="truncate text-sm">{section.title}</span>
                            </button>
                        );
                    })}
                </div>
            </CourseCard>

            <CourseCard className="p-4">
                <p className="text-[11px] text-slate-500 font-semibold uppercase tracking-[0.2em] mb-3">
                    Progression
                </p>
                <div className="flex items-center gap-3">
                    <div className="h-2 flex-1 bg-slate-800/70 rounded-full overflow-hidden">
                        <div
                            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-400 transition-all duration-700"
                            style={{ width: `${progressPercent}%` }}
                        />
                    </div>
                    <span className="text-xs font-mono text-emerald-200">{progressPercent}%</span>
                </div>
                <p className="mt-3 text-sm text-slate-400">
                    {completedSections.length}/{totalSections} sections terminées
                </p>
            </CourseCard>
        </div>
    );

    return (
        <CoursePageShell
            title={title}
            description={description}
            icon={icon}
            crumbs={[
                { label: 'Ateliers', href: '/workshops' },
                { label: workshopLabel },
            ]}
            backHref={backHref}
            backLabel={backLabel}
            meta={
                <>
                    <CoursePill tone="slate">{workshopLabel}</CoursePill>
                    {totalSections > 0 && (
                        <CoursePill tone="slate">
                            Section {Math.min(activeSection + 1, totalSections)}/{totalSections}
                        </CoursePill>
                    )}
                    <CoursePill tone={progressPercent >= 100 ? 'emerald' : 'cyan'}>
                        {progressPercent}%
                    </CoursePill>
                </>
            }
            headerFooter={
                totalSections > 0 ? (
                    <div className="flex items-center gap-3">
                        <div className="h-2 flex-1 bg-slate-800/70 rounded-full overflow-hidden">
                            <div
                                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-400 transition-all duration-700"
                                style={{ width: `${progressPercent}%` }}
                            />
                        </div>
                        <span className="text-xs font-mono text-emerald-200">{progressPercent}%</span>
                    </div>
                ) : null
            }
            aside={aside}
        >
            {current ? (
                <div className="space-y-6">
                    <CourseCard className="p-6 md:p-8">
                        <div className="flex items-start justify-between gap-4 flex-wrap">
                            <div className="min-w-0">
                                <p className="text-[11px] text-slate-500 font-semibold uppercase tracking-[0.2em]">
                                    Contenu
                                </p>
                                <h2 className="mt-2 text-2xl md:text-3xl font-black tracking-tight text-white leading-tight">
                                    {current.title}
                                </h2>
                            </div>
                            <CoursePill tone={completedSections.includes(activeSection) ? 'emerald' : 'amber'}>
                                {completedSections.includes(activeSection) ? (
                                    <>
                                        <CheckCircle2 className="h-4 w-4" />
                                        Terminé
                                    </>
                                ) : (
                                    'En cours'
                                )}
                            </CoursePill>
                        </div>

                        <div className="mt-6">
                            <CourseRichRenderer content={renderedContent} />
                        </div>
                    </CourseCard>

                    <div className="flex items-center justify-between gap-3 flex-wrap">
                        <button
                            type="button"
                            disabled={activeSection === 0}
                            onClick={() => setActiveSection((prev) => Math.max(0, prev - 1))}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-colors ${
                                activeSection === 0
                                    ? 'border-white/5 text-slate-600 cursor-not-allowed'
                                    : 'border-white/10 text-slate-300 hover:text-white hover:border-white/20 bg-slate-900/40 hover:bg-slate-900/60'
                            }`}
                        >
                            <ChevronLeft className="h-4 w-4" />
                            Précédent
                        </button>

                        {activeSection >= totalSections - 1 ? (
                            <Link
                                href={doneHref}
                                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold inline-flex items-center gap-2 shadow-lg shadow-emerald-500/20"
                            >
                                <CheckCircle2 className="h-4 w-4" />
                                {doneLabel}
                            </Link>
                        ) : (
                            <button
                                type="button"
                                onClick={markCompleteAndAdvance}
                                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold inline-flex items-center gap-2 shadow-lg shadow-emerald-500/20"
                            >
                                Continuer
                                <ChevronRight className="h-4 w-4" />
                            </button>
                        )}
                    </div>
                </div>
            ) : (
                <CourseCard className="p-6 md:p-8">
                    <p className="text-slate-300">Aucune section disponible pour cet atelier.</p>
                </CourseCard>
            )}
        </CoursePageShell>
    );
}
