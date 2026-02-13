'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import type { TimelineStep } from '@shared/components/TransactionTimeline';
import {
    ArrowLeft,
    Activity,
    Clock,
    Store,
    CreditCard,
    ChevronDown,
    ChevronUp,
    Code,
    User,
    Shield,
    GitBranch,
    Database,
    Hash,
    Fingerprint,
    Server,
    type LucideIcon,
} from 'lucide-react';

const TransactionTimeline = dynamic(
    () => import('@shared/components/TransactionTimeline'),
    {
        ssr: false,
        loading: () => (
            <div className="flex items-center justify-center py-20">
                <div className="h-8 w-8 border-2 border-violet-400/30 border-t-violet-400 rounded-full animate-spin" />
            </div>
        )
    }
);

type TransactionSummary = {
    transaction_id: string;
    status: string;
    amount: number;
    currency: string;
    response_code: string;
    authorization_code: string;
    stan: string;
    terminal_id: string;
    merchant_mcc: string;
    fraud_score: number | null;
    client_first_name: string;
    client_last_name: string;
    client_username: string;
    merchant_name: string;
    merchant_first_name: string;
    merchant_last_name: string;
    merchant_username: string;
    masked_pan: string;
    processing_steps: unknown;
};

type ServiceItem = {
    name: string;
    icon: LucideIcon;
    desc: string;
    color: string;
    bg: string;
};

const SERVICES: ServiceItem[] = [
    { name: 'POS Terminal', icon: CreditCard, desc: 'Point de vente', color: 'text-sky-400', bg: 'bg-sky-500/10' },
    { name: 'Acquirer', icon: Store, desc: 'Banque acquéreur', color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { name: 'Network Switch', icon: Server, desc: 'Réseau interbancaire', color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
    { name: 'Fraud Detection', icon: Shield, desc: 'Analyse de fraude', color: 'text-amber-400', bg: 'bg-amber-500/10' },
    { name: 'Auth Engine', icon: GitBranch, desc: 'Moteur autorisation', color: 'text-violet-400', bg: 'bg-violet-500/10' },
    { name: 'Issuer', icon: Fingerprint, desc: 'Banque émettrice', color: 'text-pink-400', bg: 'bg-pink-500/10' },
    { name: 'Ledger', icon: Database, desc: 'Comptabilité', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { name: 'Settlement', icon: Hash, desc: 'Compensation', color: 'text-teal-400', bg: 'bg-teal-500/10' },
];

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

    const scoreRaw = source.fraud_score;
    return {
        transaction_id: String(source.transaction_id || source.transactionId || ''),
        status: String(source.status || ''),
        amount: toNumber(source.amount),
        currency: String(source.currency || 'EUR'),
        response_code: String(source.response_code || source.responseCode || ''),
        authorization_code: String(source.authorization_code || source.authorizationCode || ''),
        stan: String(source.stan || ''),
        terminal_id: String(source.terminal_id || source.terminalId || ''),
        merchant_mcc: String(source.merchant_mcc || source.merchantMcc || ''),
        fraud_score: scoreRaw === null || scoreRaw === undefined ? null : toNumber(scoreRaw),
        client_first_name: String(source.client_first_name || source.clientFirstName || ''),
        client_last_name: String(source.client_last_name || source.clientLastName || ''),
        client_username: String(source.client_username || source.clientUsername || ''),
        merchant_name: String(source.merchant_name || source.merchantName || ''),
        merchant_first_name: String(source.merchant_first_name || source.merchantFirstName || ''),
        merchant_last_name: String(source.merchant_last_name || source.merchantLastName || ''),
        merchant_username: String(source.merchant_username || source.merchantUsername || ''),
        masked_pan: String(source.masked_pan || source.maskedPan || ''),
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

export default function StudentTransactionTimelinePage() {
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
                    throw new Error(String(data.error || 'Échec du chargement'));
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
                    <div className="h-10 w-10 border-2 border-violet-400/30 border-t-violet-400 rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-sm text-slate-400">Chargement de la timeline...</p>
                </div>
            </div>
        );
    }

    if (error || !txn) {
        return (
            <div className="min-h-screen bg-slate-950 p-8">
                <div className="max-w-2xl mx-auto text-center py-20">
                    <Activity size={40} className="mx-auto mb-4 text-slate-600" />
                    <p className="text-amber-400 mb-2 font-medium">{error || 'Transaction introuvable'}</p>
                    <p className="text-xs text-slate-500 mb-6">Vérifiez que vous êtes bien connecté et que la transaction existe.</p>
                    <button onClick={() => router.back()} className="text-blue-400 text-sm hover:underline">Retour</button>
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
    const merchantName = txn.merchant_name
        || (txn.merchant_first_name
            ? `${txn.merchant_first_name} ${txn.merchant_last_name || ''}`.trim()
            : (txn.merchant_username || 'Marchand'));

    return (
        <div className="min-h-screen bg-slate-950">
            <div className="border-b border-white/5 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-50">
                <div className="max-w-6xl mx-auto px-4 md:px-8 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button onClick={() => router.push('/student/transactions')} className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition">
                                <ArrowLeft size={16} />
                                Transactions
                            </button>
                            <div className="h-6 w-px bg-white/10" />
                            <h1 className="text-lg font-bold text-white flex items-center gap-2">
                                <Activity size={20} className="text-violet-400" />
                                Cycle de vie
                            </h1>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                            <span className="text-slate-500 hidden md:inline font-mono text-xs">{txn.transaction_id}</span>
                            <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${isApproved ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
                                {txn.status}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-4 md:px-8 py-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                    <SummaryCard icon={CreditCard} label="Montant" value={`${amount.toFixed(2)} ${txn.currency || 'EUR'}`} highlight />
                    <SummaryCard icon={Store} label="Marchand" value={merchantName} />
                    <SummaryCard icon={CreditCard} label="Carte" value={txn.masked_pan || 'N/A'} />
                    <SummaryCard icon={Clock} label="Traitement total" value={`${totalDuration}ms`} />
                </div>

                {txn.response_code && (
                    <div className="flex flex-wrap gap-3 mb-6">
                        <InfoPill label="Code réponse" value={txn.response_code} color={txn.response_code === '00' ? 'text-emerald-400' : 'text-red-400'} />
                        {txn.authorization_code && <InfoPill label="Code autorisation" value={txn.authorization_code} />}
                        {txn.stan && <InfoPill label="STAN" value={txn.stan} />}
                        {txn.terminal_id && <InfoPill label="Terminal" value={txn.terminal_id} />}
                        {txn.merchant_mcc && <InfoPill label="MCC" value={txn.merchant_mcc} />}
                        {txn.fraud_score !== null && (
                            <InfoPill
                                label="Score fraude"
                                value={`${txn.fraud_score}/100`}
                                color={txn.fraud_score < 30 ? 'text-emerald-400' : txn.fraud_score < 70 ? 'text-amber-400' : 'text-red-400'}
                            />
                        )}
                    </div>
                )}

                <div className="mb-6 p-4 rounded-2xl border border-white/10 bg-slate-800/20">
                    <div className="flex items-center gap-2 mb-3">
                        <Server size={14} className="text-slate-400" />
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">Services impliqués dans le flux</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {SERVICES.map((service) => (
                            <div key={service.name} className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg ${service.bg} border border-white/5`}>
                                <service.icon size={12} className={service.color} />
                                <span className="text-[11px] text-white font-medium">{service.name}</span>
                                <span className="text-[9px] text-slate-500 hidden md:inline">{service.desc}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-slate-900/30 overflow-hidden mb-6">
                    {timeline.length > 0 ? (
                        <TransactionTimeline steps={timeline} />
                    ) : (
                        <div className="text-center py-20 text-slate-500">
                            <Activity size={32} className="mx-auto mb-3 opacity-50" />
                            <p className="text-sm">Aucune donnée de timeline disponible</p>
                        </div>
                    )}
                </div>

                <button onClick={() => setShowRaw(!showRaw)} className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-300 transition mb-4">
                    <Code size={14} />
                    Données brutes (ISO 8583)
                    {showRaw ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>

                {showRaw && (
                    <div className="rounded-xl border border-white/10 bg-black/40 p-4 overflow-x-auto">
                        <pre className="text-xs text-slate-400 font-mono whitespace-pre-wrap">
                            {JSON.stringify(timeline, null, 2)}
                        </pre>
                    </div>
                )}

                <div className="mt-4 text-xs text-slate-500 inline-flex items-center gap-1">
                    <User size={12} />
                    Client: <span className="text-slate-300">{clientName}</span>
                </div>
            </div>
        </div>
    );
}

function SummaryCard({ icon: Icon, label, value, highlight }: { icon: LucideIcon; label: string; value: string; highlight?: boolean }) {
    return (
        <div className={`rounded-xl border p-3.5 ${highlight ? 'border-violet-500/30 bg-violet-500/5' : 'border-white/10 bg-slate-800/30'}`}>
            <div className="flex items-center gap-1.5 mb-1.5">
                <Icon size={12} className="text-slate-500" />
                <span className="text-[10px] text-slate-500 uppercase tracking-wider">{label}</span>
            </div>
            <span className="text-sm font-bold text-white truncate block">{value}</span>
        </div>
    );
}

function InfoPill({ label, value, color }: { label: string; value: string; color?: string }) {
    return (
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/50 border border-white/5">
            <span className="text-[10px] text-slate-500">{label}:</span>
            <span className={`text-xs font-bold font-mono ${color || 'text-white'}`}>{value}</span>
        </div>
    );
}
