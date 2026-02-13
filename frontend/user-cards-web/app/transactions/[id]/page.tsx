'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { clientApi } from '@/lib/api-client';
import { ArrowLeft, CreditCard, Store, Clock, Shield, Hash, GitBranch, AlertTriangle, ChevronRight, type LucideIcon } from 'lucide-react';

type TransactionDetail = {
    id: string;
    transaction_id: string;
    stan: string;
    authorization_code: string;
    response_code: string;
    status: string;
    type: string;
    amount: number;
    currency: string;
    merchant_name: string;
    merchant_mcc: string;
    timestamp: string;
    created_at: string;
    settled_at: string;
    masked_pan: string;
    terminal_id: string;
    threeds_status: string;
    threeds_version: string;
    eci: string;
    fraud_score: number | null;
    fraud_rules_triggered: string[];
};

const asObject = (value: unknown): Record<string, unknown> =>
    value !== null && typeof value === 'object' ? (value as Record<string, unknown>) : {};

const toNumber = (value: unknown): number => {
    const parsed = Number.parseFloat(String(value ?? '0'));
    return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeTransaction = (raw: unknown): TransactionDetail => {
    const source = asObject(raw);
    const rawFraudRules = Array.isArray(source.fraud_rules_triggered) ? source.fraud_rules_triggered : [];
    return {
        id: String(source.id || ''),
        transaction_id: String(source.transaction_id || source.transactionId || ''),
        stan: String(source.stan || ''),
        authorization_code: String(source.authorization_code || source.authorizationCode || ''),
        response_code: String(source.response_code || source.responseCode || ''),
        status: String(source.status || ''),
        type: String(source.type || ''),
        amount: toNumber(source.amount),
        currency: String(source.currency || 'EUR'),
        merchant_name: String(source.merchant_name || source.merchantName || ''),
        merchant_mcc: String(source.merchant_mcc || source.merchantMcc || ''),
        timestamp: String(source.timestamp || ''),
        created_at: String(source.created_at || ''),
        settled_at: String(source.settled_at || ''),
        masked_pan: String(source.masked_pan || source.maskedPan || ''),
        terminal_id: String(source.terminal_id || source.terminalId || ''),
        threeds_status: String(source.threeds_status || source.threedsStatus || ''),
        threeds_version: String(source.threeds_version || source.threedsVersion || ''),
        eci: String(source.eci || ''),
        fraud_score: source.fraud_score === null || source.fraud_score === undefined ? null : toNumber(source.fraud_score),
        fraud_rules_triggered: rawFraudRules.map((rule) => String(rule))
    };
};

const getErrorMessage = (error: unknown, fallback: string): string => {
    if (error instanceof Error && error.message) return error.message;
    return fallback;
};

export default function TransactionDetailPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;
    const [txn, setTxn] = useState<TransactionDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!id) return;
        void clientApi.getTransactionById(id)
            .then((data) => {
                const source = data.transaction || data;
                setTxn(normalizeTransaction(source));
            })
            .catch((error: unknown) => setError(getErrorMessage(error, 'Impossible de charger la transaction')))
            .finally(() => setLoading(false));
    }, [id]);

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="h-8 w-8 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" />
            </div>
        );
    }

    if (error || !txn) {
        return (
            <div className="min-h-screen bg-slate-950 p-8">
                <div className="max-w-2xl mx-auto text-center py-20">
                    <AlertTriangle size={48} className="mx-auto mb-4 text-amber-400" />
                    <h1 className="text-xl font-bold text-white mb-2">Transaction introuvable</h1>
                    <p className="text-sm text-slate-400 mb-6">{error || 'Cette transaction n\'existe pas.'}</p>
                    <button onClick={() => router.push('/transactions')} className="text-blue-400 hover:text-blue-300 text-sm">
                        Retour aux transactions
                    </button>
                </div>
            </div>
        );
    }

    const isApproved = txn.status === 'APPROVED';
    const amount = txn.amount;
    const fraudScore = txn.fraud_score;

    return (
        <div className="min-h-screen bg-slate-950 p-4 md:p-8">
            <div className="max-w-3xl mx-auto">
                {/* Back button */}
                <button
                    onClick={() => router.push('/transactions')}
                    className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition mb-6"
                >
                    <ArrowLeft size={16} />
                    Retour aux transactions
                </button>

                {/* Header */}
                <div className={`rounded-2xl border p-6 mb-6 ${isApproved
                    ? 'border-emerald-500/20 bg-emerald-500/5'
                    : 'border-red-500/20 bg-red-500/5'
                    }`}>
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <span className={`text-xs font-bold px-2 py-1 rounded ${isApproved ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                                {txn.status}
                            </span>
                            <span className="text-xs font-mono text-slate-500 ml-3">{txn.type}</span>
                        </div>
                        <span className="text-xs text-slate-500">{new Date(txn.timestamp || txn.created_at).toLocaleString('fr-FR')}</span>
                    </div>
                    <div className="text-3xl font-bold text-white mb-1">
                        {txn.type === 'REFUND' ? '+' : '-'}{amount.toFixed(2)} <span className="text-lg text-slate-400">{txn.currency || 'EUR'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-400">
                        <Store size={14} />
                        {txn.merchant_name || 'Marchand inconnu'}
                        {txn.merchant_mcc && <span className="text-xs text-slate-600">MCC {txn.merchant_mcc}</span>}
                    </div>
                </div>

                {/* Timeline Button */}
                <Link
                    href={`/transactions/${id}/timeline`}
                    className="flex items-center justify-between w-full p-5 rounded-2xl border border-violet-500/30 bg-gradient-to-r from-violet-500/10 to-purple-500/10 hover:from-violet-500/15 hover:to-purple-500/15 transition-all mb-6 group"
                >
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-violet-500/20">
                            <GitBranch size={22} className="text-violet-400" />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-white">Voir la Timeline Interactive</h3>
                            <p className="text-xs text-slate-400">Visualisez le parcours complet de cette transaction</p>
                        </div>
                    </div>
                    <ChevronRight size={20} className="text-violet-400 group-hover:translate-x-1 transition-transform" />
                </Link>

                {/* Details Grid */}
                <div className="grid md:grid-cols-2 gap-4 mb-6">
                    <DetailCard title="Identifiants" icon={Hash}>
                        <DetailRow label="Transaction ID" value={txn.transaction_id} mono />
                        <DetailRow label="STAN" value={txn.stan} mono />
                        <DetailRow label="Code Auth." value={txn.authorization_code} mono />
                        <DetailRow label="Code Réponse" value={txn.response_code} mono />
                    </DetailCard>

                    <DetailCard title="Carte" icon={CreditCard}>
                        <DetailRow label="PAN" value={txn.masked_pan} mono />
                        <DetailRow label="Terminal" value={txn.terminal_id || 'N/A'} />
                    </DetailCard>

                    <DetailCard title="Sécurité" icon={Shield}>
                        {fraudScore !== null && (
                            <DetailRow
                                label="Score Fraude"
                                value={`${fraudScore}/100`}
                                valueColor={fraudScore < 10 ? 'text-emerald-400' : fraudScore < 20 ? 'text-amber-400' : 'text-red-400'}
                            />
                        )}
                        {txn.threeds_status && (
                            <>
                                <DetailRow label="3DS Status" value={txn.threeds_status} />
                                <DetailRow label="3DS Version" value={txn.threeds_version || 'N/A'} />
                                <DetailRow label="ECI" value={txn.eci || 'N/A'} />
                            </>
                        )}
                        {txn.fraud_rules_triggered && Array.isArray(txn.fraud_rules_triggered) && txn.fraud_rules_triggered.length > 0 && (
                            <DetailRow label="Règles déclenchées" value={txn.fraud_rules_triggered.join(', ')} />
                        )}
                    </DetailCard>

                    <DetailCard title="Dates" icon={Clock}>
                        <DetailRow label="Transaction" value={new Date(txn.timestamp || txn.created_at).toLocaleString('fr-FR')} />
                        <DetailRow label="Créé le" value={txn.created_at ? new Date(txn.created_at).toLocaleString('fr-FR') : 'N/A'} />
                        <DetailRow label="Réglé le" value={txn.settled_at ? new Date(txn.settled_at).toLocaleString('fr-FR') : 'Non réglé'} />
                    </DetailCard>
                </div>
            </div>
        </div>
    );
}

function DetailCard({ title, icon: Icon, children }: { title: string; icon: LucideIcon; children: React.ReactNode }) {
    return (
        <div className="rounded-2xl border border-white/10 bg-slate-800/30 p-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Icon size={14} />
                {title}
            </h3>
            <div className="space-y-2">{children}</div>
        </div>
    );
}

function DetailRow({ label, value, mono, valueColor }: { label: string; value: string | null | undefined; mono?: boolean; valueColor?: string }) {
    return (
        <div className="flex justify-between items-center text-sm">
            <span className="text-slate-500">{label}</span>
            <span className={`${mono ? 'font-mono' : ''} ${valueColor || 'text-white'} text-right max-w-[200px] truncate`}>
                {value || 'N/A'}
            </span>
        </div>
    );
}
