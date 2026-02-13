'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { ArrowLeft, Activity, Clock, Store, CreditCard, ChevronDown, ChevronUp, Code, User, type LucideIcon } from 'lucide-react';
import type { TimelineStep } from '@shared/components/TransactionTimeline';

const TransactionTimeline = dynamic(
    () => import('@shared/components/TransactionTimeline'),
    {
        ssr: false,
        loading: () => (
            <div className="flex items-center justify-center py-20">
                <div className="h-8 w-8 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" />
            </div>
        )
    }
);

type TransactionSummary = {
    transaction_id: string;
    status: string;
    amount: number;
    merchant_name: string;
    masked_pan: string;
    client_first_name: string;
    client_last_name: string;
    client_username: string;
    processing_steps: unknown;
};

const asObject = (value: unknown): Record<string, unknown> =>
    value !== null && typeof value === 'object' ? (value as Record<string, unknown>) : {};

const toNumber = (value: unknown): number => {
    const parsed = Number.parseFloat(String(value ?? '0'));
    return Number.isFinite(parsed) ? parsed : 0;
};

const toCategory = (value: unknown): TimelineStep['category'] => {
    const category = String(value ?? '').toLowerCase();
    if (category === 'security' || category === 'decision' || category === 'data') {
        return category;
    }
    return 'process';
};

const getErrorMessage = (error: unknown, fallback: string): string => {
    if (error instanceof Error && error.message) return error.message;
    return fallback;
};

const normalizeTransaction = (raw: unknown): TransactionSummary | null => {
    const source = asObject(raw);
    if (Object.keys(source).length === 0) return null;

    return {
        transaction_id: String(source.transaction_id || source.transactionId || ''),
        status: String(source.status || ''),
        amount: toNumber(source.amount),
        merchant_name: String(source.merchant_name || source.merchantName || ''),
        masked_pan: String(source.masked_pan || source.maskedPan || ''),
        client_first_name: String(source.client_first_name || source.clientFirstName || ''),
        client_last_name: String(source.client_last_name || source.clientLastName || ''),
        client_username: String(source.client_username || source.clientUsername || ''),
        processing_steps: source.processing_steps,
    };
};

const normalizeTimeline = (raw: unknown, fallback: unknown): TimelineStep[] => {
    const source = Array.isArray(raw) ? raw : Array.isArray(fallback) ? fallback : [];
    return source.map((step, index) => {
        const row = asObject(step);
        const stepNumber = Number.parseInt(String(row.step ?? index + 1), 10);
        const details = asObject(row.details);

        return {
            step: Number.isFinite(stepNumber) ? stepNumber : index + 1,
            name: String(row.name || row.step_name || `Step ${index + 1}`),
            category: toCategory(row.category),
            status: String(row.status || 'pending'),
            timestamp: String(row.timestamp || ''),
            duration_ms: toNumber(row.duration_ms),
            details,
        };
    });
};

export default function InstructorTimelinePage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;

    const [txn, setTxn] = useState<TransactionSummary | null>(null);
    const [timeline, setTimeline] = useState<TimelineStep[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showRaw, setShowRaw] = useState(false);

    useEffect(() => {
        if (!id) return;

        const token = typeof window !== 'undefined' ? (localStorage.getItem('token') || '') : '';
        void fetch(`/api/platform/transactions/${id}/timeline`, {
            headers: { Authorization: `Bearer ${token}` }
        })
            .then((res) => res.json() as Promise<unknown>)
            .then((payload) => {
                const data = asObject(payload);
                if (data.success === false) {
                    throw new Error(String(data.error || 'Failed'));
                }

                const transaction = normalizeTransaction(data.transaction);
                setTxn(transaction);
                setTimeline(normalizeTimeline(data.timeline, transaction?.processing_steps));
            })
            .catch((loadError: unknown) => setError(getErrorMessage(loadError, 'Impossible de charger la timeline')))
            .finally(() => setLoading(false));
    }, [id]);

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="text-center">
                    <div className="h-10 w-10 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-sm text-slate-400">Chargement de la timeline...</p>
                </div>
            </div>
        );
    }

    if (error || !txn) {
        return (
            <div className="min-h-screen bg-slate-950 p-8">
                <div className="max-w-2xl mx-auto text-center py-20">
                    <p className="text-amber-400 mb-4">{error}</p>
                    <button onClick={() => router.back()} className="text-blue-400 text-sm">Retour</button>
                </div>
            </div>
        );
    }

    const isApproved = txn.status === 'APPROVED';
    const amount = txn.amount;
    const totalDuration = timeline.reduce((sum, step) => sum + step.duration_ms, 0);
    const clientName = txn.client_first_name
        ? `${txn.client_first_name} ${txn.client_last_name || ''}`.trim()
        : (txn.client_username || 'Client');
    const merchantName = txn.merchant_name || 'Marchand';

    return (
        <div className="min-h-screen bg-slate-950">
            <div className="border-b border-white/5 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 md:px-8 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button onClick={() => router.push('/instructor/transactions')} className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition">
                                <ArrowLeft size={16} />
                                Transactions
                            </button>
                            <div className="h-6 w-px bg-white/10" />
                            <h1 className="text-lg font-bold text-white flex items-center gap-2">
                                <Activity size={20} className="text-blue-400" />
                                Timeline Transaction
                            </h1>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                            <span className="text-slate-500 hidden md:inline">{txn.transaction_id}</span>
                            <span className={`px-2 py-0.5 rounded text-xs font-bold ${isApproved ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                                {txn.status}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 md:px-8 py-6">
                <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
                    <SummaryCard icon={CreditCard} label="Montant" value={`${amount.toFixed(2)} EUR`} />
                    <SummaryCard icon={Store} label="Marchand" value={merchantName} />
                    <SummaryCard icon={User} label="Client" value={clientName} />
                    <SummaryCard icon={CreditCard} label="Carte" value={txn.masked_pan || 'N/A'} />
                    <SummaryCard icon={Clock} label="Durée totale" value={`${totalDuration}ms`} />
                    <SummaryCard icon={Activity} label="Étapes" value={`${timeline.length}`} />
                </div>

                <div className="flex flex-wrap gap-3 mb-6">
                    <LegendItem color="bg-blue-500" label="Process" />
                    <LegendItem color="bg-amber-500" label="Sécurité" />
                    <LegendItem color="bg-violet-500" label="Decision" />
                    <LegendItem color="bg-emerald-500" label="Données" />
                    <div className="h-4 w-px bg-white/10" />
                    <LegendItem color="bg-emerald-500" label="Succès" border />
                    <LegendItem color="bg-red-500" label="Échec" border />
                    <LegendItem color="bg-blue-500" label="En attente" dashed />
                </div>

                <div className="rounded-2xl border border-white/10 bg-slate-900/30 overflow-hidden mb-6">
                    {timeline.length > 0 ? (
                        <TransactionTimeline steps={timeline} />
                    ) : (
                        <div className="text-center py-20 text-slate-500">
                            <Activity size={32} className="mx-auto mb-3" />
                            <p>Aucune donnée de timeline disponible</p>
                        </div>
                    )}
                </div>

                <button onClick={() => setShowRaw(!showRaw)} className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-300 transition mb-4">
                    <Code size={14} />
                    Données brutes
                    {showRaw ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>

                {showRaw && (
                    <div className="rounded-xl border border-white/10 bg-black/40 p-4 overflow-x-auto">
                        <pre className="text-xs text-slate-400 font-mono whitespace-pre-wrap">
                            {JSON.stringify(timeline, null, 2)}
                        </pre>
                    </div>
                )}
            </div>
        </div>
    );
}

function SummaryCard({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
    return (
        <div className="rounded-xl border border-white/10 bg-slate-800/30 p-3">
            <div className="flex items-center gap-1.5 mb-1">
                <Icon size={12} className="text-slate-500" />
                <span className="text-[10px] text-slate-500 uppercase tracking-wider">{label}</span>
            </div>
            <span className="text-sm font-bold text-white truncate block">{value}</span>
        </div>
    );
}

function LegendItem({ color, label, border, dashed }: { color: string; label: string; border?: boolean; dashed?: boolean }) {
    return (
        <div className="flex items-center gap-1.5">
            <div className={`w-3 h-3 rounded-sm ${border ? `border-2 ${color.replace('bg-', 'border-')} bg-transparent` : dashed ? `border ${color.replace('bg-', 'border-')} bg-transparent border-dashed` : color}`} />
            <span className="text-[10px] text-slate-500">{label}</span>
        </div>
    );
}
