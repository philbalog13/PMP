'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, ChevronRight } from 'lucide-react';

export type CourseCrumb = { label: string; href?: string };

export function CourseCard({
    children,
    className = '',
}: {
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <section className={`glass-panel rounded-2xl p-6 md:p-8 ${className}`.trim()}>
            {children}
        </section>
    );
}

export function CoursePill({
    children,
    tone = 'slate',
    className = '',
}: {
    children: React.ReactNode;
    tone?: 'slate' | 'emerald' | 'cyan' | 'amber' | 'rose' | 'violet';
    className?: string;
}) {
    const tones: Record<string, string> = {
        slate: 'bg-slate-800/60 border-white/10 text-slate-200',
        emerald: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300',
        cyan: 'bg-cyan-500/10 border-cyan-500/20 text-cyan-200',
        amber: 'bg-amber-500/10 border-amber-500/20 text-amber-200',
        rose: 'bg-rose-500/10 border-rose-500/20 text-rose-200',
        violet: 'bg-violet-500/10 border-violet-500/20 text-violet-200',
    };

    return (
        <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-[13px] md:text-sm font-medium ${tones[tone]} ${className}`.trim()}>
            {children}
        </span>
    );
}

function CourseBackground() {
    return (
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
            <div className="absolute inset-0 bg-slate-950" />
            <div className="absolute inset-0 bg-grid opacity-40" />
            <div className="absolute -top-32 left-1/2 h-[420px] w-[900px] -translate-x-1/2 rounded-full bg-gradient-to-r from-emerald-500/20 via-cyan-500/10 to-blue-500/20 blur-3xl" />
            <div className="absolute top-[45%] -left-40 h-[360px] w-[360px] rounded-full bg-gradient-to-br from-fuchsia-500/10 to-sky-500/10 blur-3xl" />
            <div className="absolute -bottom-36 -right-44 h-[420px] w-[420px] rounded-full bg-gradient-to-br from-amber-500/10 to-emerald-500/10 blur-3xl" />
            <div className="absolute inset-0 bg-noise opacity-30" />
        </div>
    );
}

export function CoursePageShell({
    title,
    description,
    icon,
    crumbs = [],
    backHref,
    backLabel = 'Retour',
    meta,
    headerFooter,
    actions,
    aside,
    children,
}: {
    title: string;
    description?: string;
    icon?: React.ReactNode;
    crumbs?: CourseCrumb[];
    backHref?: string;
    backLabel?: string;
    meta?: React.ReactNode;
    headerFooter?: React.ReactNode;
    actions?: React.ReactNode;
    aside?: React.ReactNode;
    children: React.ReactNode;
}) {
    return (
        <div className="relative min-h-screen text-white text-base md:text-lg">
            <CourseBackground />

            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 md:py-10">
                <div className="space-y-6">
                    {crumbs.length > 0 && (
                        <nav className="text-xs text-slate-500 flex items-center gap-1.5 flex-wrap">
                            {crumbs.map((crumb, index) => (
                                <React.Fragment key={`${crumb.label}-${index}`}>
                                    {crumb.href ? (
                                        <Link href={crumb.href} className="hover:text-emerald-400 transition-colors">
                                            {crumb.label}
                                        </Link>
                                    ) : (
                                        <span className={index === crumbs.length - 1 ? 'text-emerald-300' : 'text-slate-400'}>
                                            {crumb.label}
                                        </span>
                                    )}
                                    {index < crumbs.length - 1 && <ChevronRight size={12} className="text-slate-600" />}
                                </React.Fragment>
                            ))}
                        </nav>
                    )}

                    {backHref && (
                        <Link
                            href={backHref}
                            className="inline-flex items-center gap-2 text-base text-slate-400 hover:text-white transition"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            {backLabel}
                        </Link>
                    )}

                    <header className="glass-panel rounded-3xl p-6 md:p-8 relative overflow-hidden">
                        <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl" />
                        <div className="pointer-events-none absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl" />

                        <div className="relative flex flex-col md:flex-row md:items-start md:justify-between gap-6">
                            <div className="flex items-start gap-4 min-w-0">
                                {icon && (
                                    <div className="shrink-0 rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/15 to-cyan-500/10 p-4 shadow-[0_20px_45px_rgba(16,185,129,0.08)]">
                                        {icon}
                                    </div>
                                )}
                                <div className="min-w-0">
                                    <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white leading-tight">
                                        {title}
                                    </h1>
                                    {description && (
                                        <p className="text-slate-300/90 mt-2 leading-relaxed text-base md:text-lg">
                                            {description}
                                        </p>
                                    )}
                                    {meta && (
                                        <div className="mt-4 flex flex-wrap items-center gap-2">
                                            {meta}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {actions && (
                                <div className="flex flex-wrap items-center gap-2 justify-start md:justify-end">
                                    {actions}
                                </div>
                            )}
                        </div>

                        {headerFooter && (
                            <div className="relative mt-6">
                                {headerFooter}
                            </div>
                        )}
                    </header>

                    {aside ? (
                        <div className="grid gap-6 lg:gap-8 lg:grid-cols-[280px_1fr] items-start">
                            <div className="lg:hidden">
                                {aside}
                            </div>
                            <aside className="hidden lg:block sticky top-28">
                                {aside}
                            </aside>
                            <main className="min-w-0">
                                {children}
                            </main>
                        </div>
                    ) : (
                        <main>
                            {children}
                        </main>
                    )}
                </div>
            </div>
        </div>
    );
}
