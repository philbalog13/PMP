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
        <section
            className={`rounded-2xl p-6 md:p-8 ${className}`.trim()}
            style={{ background: 'var(--bg-surface)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
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
        emerald: 'bg-amber-500/10 border-amber-500/20 text-amber-300',
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
            <div className="absolute inset-0" style={{ background: 'var(--bg-deep)' }} />
            <div className="absolute -top-32 left-1/2 h-[420px] w-[900px] -translate-x-1/2 rounded-full blur-3xl"
                 style={{ background: 'radial-gradient(ellipse,rgba(245,158,11,0.12) 0%,rgba(6,182,212,0.06) 50%,transparent 70%)' }} />
            <div className="absolute top-[45%] -left-40 h-[360px] w-[360px] rounded-full blur-3xl"
                 style={{ background: 'radial-gradient(circle,rgba(168,85,247,0.06),transparent 70%)' }} />
            <div className="absolute -bottom-36 -right-44 h-[420px] w-[420px] rounded-full blur-3xl"
                 style={{ background: 'radial-gradient(circle,rgba(6,182,212,0.07),transparent 70%)' }} />
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
                        <nav className="text-xs flex items-center gap-1.5 flex-wrap" style={{ color: 'var(--text-muted)' }}>
                            {crumbs.map((crumb, index) => (
                                <React.Fragment key={`${crumb.label}-${index}`}>
                                    {crumb.href ? (
                                        <Link href={crumb.href} className="transition-colors hover:text-white">
                                            {crumb.label}
                                        </Link>
                                    ) : (
                                        <span style={index === crumbs.length - 1 ? { color: '#fbbf24' } : { color: 'var(--text-secondary)' }}>
                                            {crumb.label}
                                        </span>
                                    )}
                                    {index < crumbs.length - 1 && (
                                        <ChevronRight size={12} style={{ opacity: 0.35 }} />
                                    )}
                                </React.Fragment>
                            ))}
                        </nav>
                    )}

                    {backHref && (
                        <Link
                            href={backHref}
                            className="inline-flex items-center gap-2 text-sm transition-colors"
                            style={{ color: 'var(--text-secondary)' }}
                            onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#fff'}
                            onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)'}
                        >
                            <ArrowLeft className="h-4 w-4" />
                            {backLabel}
                        </Link>
                    )}

                    <header className="rounded-3xl p-6 md:p-8 relative overflow-hidden"
                            style={{
                                background: 'var(--bg-surface)',
                                border: '1px solid rgba(255,255,255,0.07)',
                            }}>
                        <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full blur-3xl"
                             style={{ background: 'radial-gradient(circle,rgba(245,158,11,0.1),transparent 70%)' }} />
                        <div className="pointer-events-none absolute -bottom-24 -left-24 h-64 w-64 rounded-full blur-3xl"
                             style={{ background: 'radial-gradient(circle,rgba(6,182,212,0.07),transparent 70%)' }} />

                        <div className="relative flex flex-col md:flex-row md:items-start md:justify-between gap-6">
                            <div className="flex items-start gap-4 min-w-0">
                                {icon && (
                                    <div className="shrink-0 rounded-2xl p-4"
                                         style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.28)',
                                                  boxShadow: '0 0 24px -6px rgba(245,158,11,0.35)' }}>
                                        {icon}
                                    </div>
                                )}
                                <div className="min-w-0">
                                    <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white leading-tight"
                                        style={{ letterSpacing: '-0.02em' }}>
                                        {title}
                                    </h1>
                                    {description && (
                                        <p className="mt-2 leading-relaxed text-sm md:text-base"
                                           style={{ color: 'var(--text-secondary)' }}>
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
