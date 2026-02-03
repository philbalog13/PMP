'use client';

import { useEffect } from 'react';
import { Loader2, ShieldCheck } from 'lucide-react';

function resolveTarget(rawRedirect: string | null): string {
    if (typeof window === 'undefined') {
        return '/';
    }

    const fallback = `${window.location.origin}/`;
    if (!rawRedirect) {
        return fallback;
    }

    try {
        return new URL(rawRedirect, window.location.origin).toString();
    } catch {
        return fallback;
    }
}

export default function LoginBridgePage() {
    useEffect(() => {
        const redirectParam = new URLSearchParams(window.location.search).get('redirect');
        const portalBase = process.env.NEXT_PUBLIC_PORTAL_URL || 'http://localhost:3000';
        const loginUrl = new URL('/login', portalBase);
        loginUrl.searchParams.set('redirect', resolveTarget(redirectParam));
        window.location.replace(loginUrl.toString());
    }, []);

    return (
        <div className="min-h-[70vh] flex items-center justify-center px-6">
            <div className="max-w-md w-full rounded-3xl border border-white/10 bg-slate-900/70 p-8 text-center space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-green-500/10 border border-green-500/20 mx-auto flex items-center justify-center">
                    <ShieldCheck className="text-green-400" />
                </div>
                <h1 className="text-xl font-bold text-white">Redirection vers le portail</h1>
                <p className="text-slate-400 text-sm">
                    Verification de session en cours...
                </p>
                <div className="inline-flex items-center gap-2 text-slate-300 text-sm">
                    <Loader2 size={16} className="animate-spin" />
                    Ouverture du login
                </div>
            </div>
        </div>
    );
}
