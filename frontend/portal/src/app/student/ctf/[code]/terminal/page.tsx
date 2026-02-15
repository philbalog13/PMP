'use client';

import { use, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Copy, ExternalLink, Terminal } from 'lucide-react';
import { CourseCard, CoursePageShell, CoursePill } from '@/components/course/CoursePageShell';
import { APP_URLS } from '@shared/lib/app-urls';

export default function CtfTerminalPage({ params }: { params: Promise<{ code: string }> }) {
    const { code } = use(params);
    const normalizedCode = useMemo(
        () => decodeURIComponent(String(code || '')).trim().toUpperCase(),
        [code]
    );

    const attackboxUrl = APP_URLS.ctfAttackbox;
    const helperCommand = `lab ${normalizedCode || '<CODE>'}`;
    const [copied, setCopied] = useState(false);

    const copyHelper = async () => {
        try {
            await navigator.clipboard.writeText(helperCommand);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1200);
        } catch {
            // ignore
        }
    };

    return (
        <CoursePageShell
            title="AttackBox Terminal"
            description="Terminal d'attaque dans le reseau PMP, inspire TryHackMe."
            icon={<Terminal className="h-8 w-8 text-emerald-300" />}
            crumbs={[
                { label: 'Mon Parcours', href: '/student' },
                { label: 'Security Labs', href: APP_URLS.studentCtf },
                { label: normalizedCode || 'Terminal' },
                { label: 'AttackBox' },
            ]}
            backHref={`${APP_URLS.studentCtf}/${encodeURIComponent(normalizedCode)}`}
            backLabel="Retour au challenge"
            meta={
                <>
                    <CoursePill tone="slate">{normalizedCode || 'CTF'}</CoursePill>
                    <CoursePill tone="cyan">{attackboxUrl}</CoursePill>
                </>
            }
            actions={
                <>
                    <a
                        href={attackboxUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-semibold inline-flex items-center gap-2"
                    >
                        <ExternalLink className="h-4 w-4" />
                        Ouvrir dans un onglet
                    </a>
                    <Link
                        href={`${APP_URLS.studentCtf}/${encodeURIComponent(normalizedCode)}`}
                        className="px-4 py-2.5 rounded-xl border border-white/10 bg-slate-900/40 hover:bg-slate-900/60 text-sm font-semibold inline-flex items-center gap-2"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Challenge
                    </Link>
                </>
            }
        >
            <div className="space-y-6">
                <CourseCard className="p-6 md:p-8">
                    <p className="text-sm text-slate-300 leading-relaxed">
                        Dans l'AttackBox, utilisez le helper ci-dessous pour afficher les objectifs et commandes utiles.
                    </p>
                    <div className="mt-4 flex flex-col sm:flex-row gap-2">
                        <pre className="flex-1 rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-emerald-200 overflow-auto">
                            {helperCommand}
                        </pre>
                        <button
                            onClick={() => void copyHelper()}
                            className="px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold inline-flex items-center justify-center gap-2"
                        >
                            <Copy className="h-4 w-4" />
                            {copied ? 'Copie' : 'Copier'}
                        </button>
                    </div>
                    <p className="mt-3 text-xs text-slate-500">
                        Exemple: <span className="font-mono">lab {normalizedCode}</span>
                    </p>
                </CourseCard>

                <CourseCard className="p-0 overflow-hidden">
                    <iframe
                        title="CTF AttackBox"
                        src={attackboxUrl}
                        className="w-full h-[70vh]"
                    />
                </CourseCard>
            </div>
        </CoursePageShell>
    );
}

