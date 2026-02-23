'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@shared/context/AuthContext';
import { UserRole } from '@shared/types/user';
import {
    ArrowDownRight,
    ArrowUpRight,
    BarChart3,
    CreditCard,
    RefreshCcw,
    ShieldCheck,
    Store,
    TrendingDown,
    TrendingUp,
    Wallet,
} from 'lucide-react';
import { clientApi } from '@/lib/api-client';

/* ── types ──────────────────────────────────────────────── */
type Tx = {
    id: string;
    amount: number;
    currency: string;
    status: string;
    type: string;
    timestamp: string;
    merchantName: string;
    merchantId: string;
    maskedPan: string;
};

type DayBucket = { date: string; spent: number };

/* ── utils ──────────────────────────────────────────────── */
const asObject = (v: unknown): Record<string, unknown> =>
    v !== null && typeof v === 'object' ? (v as Record<string, unknown>) : {};

const toNumber = (v: unknown): number => {
    const n = Number.parseFloat(String(v ?? ''));
    return Number.isFinite(n) ? n : 0;
};

const toString = (v: unknown): string =>
    v !== null && v !== undefined ? String(v) : '';

const formatMoney = (v: number, currency = 'EUR') =>
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency, minimumFractionDigits: 2 }).format(v);

const formatShort = (v: number) => {
    if (Math.abs(v) >= 1000) return `${(v / 1000).toFixed(1)} k€`;
    return `${v.toFixed(2)} €`;
};

const getErrorMessage = (err: unknown, fallback: string): string => {
    if (err instanceof Error && err.message) return err.message;
    const c = asObject(err);
    return typeof c.message === 'string' ? c.message : fallback;
};

const currentMonthKey = (): string => new Date().toISOString().slice(0, 7);

const lastNDays = (n: number): string[] => {
    const days: string[] = [];
    for (let i = n - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        days.push(d.toISOString().slice(0, 10));
    }
    return days;
};

const STATUS_COLORS: Record<string, string> = {
    APPROVED: 'bg-emerald-500',
    DECLINED: 'bg-red-500',
    PENDING: 'bg-amber-400',
    REFUNDED: 'bg-blue-400',
};
const statusColor = (s: string) => STATUS_COLORS[s] || 'bg-slate-500';

/* ── Metric card ────────────────────────────────────────── */
function MetricCard({
    label,
    value,
    sub,
    icon: Icon,
    color = 'text-white',
    trend,
}: {
    label: string;
    value: string;
    sub?: string;
    icon: React.ElementType;
    color?: string;
    trend?: 'up' | 'down' | null;
}) {
    return (
        <div className="rounded-2xl border border-white/8 bg-slate-900/60 p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</p>
                <Icon size={16} className="text-slate-500" />
            </div>
            <div className="flex items-end justify-between gap-2">
                <p className={`text-2xl font-bold ${color}`}>{value}</p>
                {trend === 'up' && <ArrowUpRight size={18} className="text-emerald-400 mb-1" />}
                {trend === 'down' && <ArrowDownRight size={18} className="text-red-400 mb-1" />}
            </div>
            {sub && <p className="text-xs text-slate-500">{sub}</p>}
        </div>
    );
}

/* ── Main page ──────────────────────────────────────────── */
export default function StatsPage() {
    const { isLoading, isAuthenticated, user } = useAuth();
    const [transactions, setTransactions] = useState<Tx[]>([]);
    const [isRefreshing, setIsRefreshing] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const isClient = user?.role === UserRole.CLIENT;

    const load = async () => {
        setIsRefreshing(true);
        setError(null);
        try {
            const res = await clientApi.getTransactions('limit=500&page=1');
            const raw = Array.isArray(res.transactions) ? res.transactions : [];
            const normalized: Tx[] = raw.map((r) => {
                const t = asObject(r);
                const merchant = asObject(t.merchant);
                return {
                    id: toString(t.id || t.transaction_id),
                    amount: toNumber(t.amount),
                    currency: toString(t.currency || 'EUR'),
                    status: toString(t.status),
                    type: toString(t.type),
                    timestamp: toString(t.timestamp || t.created_at),
                    merchantName: toString(
                        t.merchant_name || merchant.name || merchant.displayName ||
                        merchant.username || t.merchantName || '—'
                    ),
                    merchantId: toString(t.merchant_id || merchant.id || t.merchantId || ''),
                    maskedPan: toString(t.masked_pan || t.maskedPan || '****'),
                };
            });
            setTransactions(normalized);
        } catch (e) {
            setError(getErrorMessage(e, 'Impossible de charger les statistiques'));
        } finally {
            setIsRefreshing(false);
        }
    };

    useEffect(() => {
        if (!isAuthenticated || !isClient) return;
        load();
    }, [isAuthenticated, isClient]);

    /* ── Computed metrics ─────────────────────────────── */
    const metrics = useMemo(() => {
        if (transactions.length === 0) return null;

        const currency = transactions[0]?.currency || 'EUR';
        const approved = transactions.filter((t) => t.status === 'APPROVED');
        const purchases = approved.filter((t) => t.type === 'PURCHASE');
        const refunds = approved.filter((t) => t.type === 'REFUND');

        const totalSpent = purchases.reduce((s, t) => s + t.amount, 0);
        const totalRefunded = refunds.reduce((s, t) => s + t.amount, 0);
        const netSpent = totalSpent - totalRefunded;
        const approvalRate = transactions.length === 0 ? 0 : Math.round((approved.length / transactions.length) * 100);
        const avgTx = purchases.length === 0 ? 0 : totalSpent / purchases.length;

        const monthKey = currentMonthKey();
        const monthPurchases = purchases.filter((t) => t.timestamp.startsWith(monthKey));
        const monthSpent = monthPurchases.reduce((s, t) => s + t.amount, 0);

        const days30 = lastNDays(30);
        const dayMap = new Map<string, DayBucket>(days30.map((d) => [d, { date: d, spent: 0 }]));
        for (const t of purchases) {
            const key = t.timestamp.slice(0, 10);
            const bucket = dayMap.get(key);
            if (bucket) bucket.spent += t.amount;
        }
        const chartData = Array.from(dayMap.values());
        const maxDaily = Math.max(...chartData.map((d) => d.spent), 1);

        const merchantMap = new Map<string, { name: string; total: number; count: number }>();
        for (const t of purchases) {
            const key = t.merchantId || t.merchantName;
            if (!key) continue;
            const prev = merchantMap.get(key) || { name: t.merchantName || key, total: 0, count: 0 };
            merchantMap.set(key, { name: prev.name, total: prev.total + t.amount, count: prev.count + 1 });
        }
        const topMerchants = [...merchantMap.values()]
            .sort((a, b) => b.total - a.total)
            .slice(0, 5);

        const cardMap = new Map<string, { pan: string; total: number; count: number }>();
        for (const t of purchases) {
            const key = t.maskedPan;
            const prev = cardMap.get(key) || { pan: key, total: 0, count: 0 };
            cardMap.set(key, { pan: key, total: prev.total + t.amount, count: prev.count + 1 });
        }
        const topCards = [...cardMap.values()].sort((a, b) => b.total - a.total).slice(0, 3);

        const statusMap = new Map<string, number>();
        for (const t of transactions) statusMap.set(t.status, (statusMap.get(t.status) || 0) + 1);
        const statusDist = [...statusMap.entries()]
            .map(([status, count]) => ({ status, count, pct: Math.round((count / transactions.length) * 100) }))
            .sort((a, b) => b.count - a.count);

        return {
            currency, totalSpent, totalRefunded, netSpent, approvalRate, avgTx,
            monthSpent, totalCount: transactions.length, approvedCount: approved.length,
            purchaseCount: purchases.length, chartData, maxDaily,
            topMerchants, topCards, statusDist,
        };
    }, [transactions]);

    /* ── Auth guards ──────────────────────────────────── */
    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-cyan-500" />
            </div>
        );
    }
    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center px-6">
                <div className="max-w-md w-full rounded-2xl border border-white/10 bg-slate-900/70 p-8 text-center space-y-4">
                    <h1 className="text-xl font-bold text-white">Session expirée</h1>
                    <a
                        href={`${process.env.NEXT_PUBLIC_PORTAL_URL || 'http://localhost:3000'}/login`}
                        className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-cyan-500 text-slate-950 font-semibold hover:bg-cyan-400 transition"
                    >
                        Se connecter
                    </a>
                </div>
            </div>
        );
    }
    if (!isClient) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center px-6">
                <p className="text-slate-400">Les statistiques sont réservées au rôle client.</p>
            </div>
        );
    }

    /* ── Render ───────────────────────────────────────── */
    return (
        <div className="min-h-screen bg-slate-950 py-8 pb-16">
            <div className="max-w-6xl mx-auto px-6 space-y-8">

                {/* Header */}
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-white">Analyses & Statistiques</h1>
                        <p className="text-sm text-slate-400 mt-1">
                            Calculées en temps réel depuis vos {transactions.length} transaction{transactions.length > 1 ? 's' : ''}.
                        </p>
                    </div>
                    <button
                        onClick={load}
                        disabled={isRefreshing}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 border border-white/10 text-sm text-white hover:bg-slate-700 disabled:opacity-50 transition"
                    >
                        <RefreshCcw size={15} className={isRefreshing ? 'animate-spin' : ''} />
                        Actualiser
                    </button>
                </div>

                {error && (
                    <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                        {error}
                    </div>
                )}

                {isRefreshing && !metrics ? (
                    <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-12 flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-cyan-500" />
                    </div>
                ) : !metrics ? (
                    <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-12 text-center text-slate-400">
                        Aucune transaction disponible.
                    </div>
                ) : (
                    <>
                        {/* ── KPIs ligne 1 ── */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <MetricCard
                                label="Achats approuvés"
                                value={formatMoney(metrics.totalSpent, metrics.currency)}
                                sub={`${metrics.purchaseCount} transaction${metrics.purchaseCount > 1 ? 's' : ''}`}
                                icon={ArrowUpRight}
                            />
                            <MetricCard
                                label="Dépensé ce mois"
                                value={formatMoney(metrics.monthSpent, metrics.currency)}
                                sub={currentMonthKey()}
                                icon={TrendingUp}
                                color="text-cyan-300"
                            />
                            <MetricCard
                                label="Remboursements"
                                value={formatMoney(metrics.totalRefunded, metrics.currency)}
                                sub={`Net : ${formatMoney(metrics.netSpent, metrics.currency)}`}
                                icon={ArrowDownRight}
                                color="text-emerald-300"
                            />
                            <MetricCard
                                label="Taux d'approbation"
                                value={`${metrics.approvalRate}%`}
                                sub={`${metrics.approvedCount}/${metrics.totalCount} approuvées`}
                                icon={ShieldCheck}
                                color={metrics.approvalRate >= 80 ? 'text-emerald-400' : 'text-amber-400'}
                                trend={metrics.approvalRate >= 80 ? 'up' : 'down'}
                            />
                        </div>

                        {/* ── KPIs ligne 2 ── */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <MetricCard
                                label="Ticket moyen"
                                value={formatMoney(metrics.avgTx, metrics.currency)}
                                sub="par achat approuvé"
                                icon={Wallet}
                            />
                            <MetricCard
                                label="Solde net consommé"
                                value={formatMoney(metrics.netSpent, metrics.currency)}
                                sub="achats − remboursements"
                                icon={TrendingDown}
                                color={metrics.netSpent > 0 ? 'text-red-300' : 'text-emerald-300'}
                            />
                            <MetricCard
                                label="Cartes utilisées"
                                value={String(metrics.topCards.length)}
                                sub="cartes distinctes"
                                icon={CreditCard}
                            />
                            <MetricCard
                                label="Marchands actifs"
                                value={String(metrics.topMerchants.length)}
                                sub="partenaires distincts"
                                icon={Store}
                            />
                        </div>

                        {/* ── Graphique 30 jours ── */}
                        <div className="rounded-2xl border border-white/8 bg-slate-900/60 p-6">
                            <div className="flex items-center gap-2 mb-5">
                                <BarChart3 size={17} className="text-cyan-400" />
                                <span className="font-semibold text-white text-sm">Dépenses journalières — 30 derniers jours</span>
                            </div>
                            <div className="h-48 flex items-end gap-1">
                                {metrics.chartData.map((day, idx) => (
                                    <div key={day.date} className="flex-1 flex flex-col items-center group relative">
                                        {/* Tooltip */}
                                        <div className="absolute -top-10 left-1/2 -translate-x-1/2 hidden group-hover:block bg-slate-800 border border-white/10 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap z-10 shadow-xl pointer-events-none">
                                            {day.date.slice(5)} · {formatShort(day.spent)}
                                        </div>
                                        <div
                                            className={`w-full rounded-t transition-all ${day.spent > 0 ? 'bg-cyan-500/50 hover:bg-cyan-400/80' : 'bg-slate-800/30'}`}
                                            style={{ height: `${day.spent > 0 ? Math.max(3, (day.spent / metrics.maxDaily) * 100) : 2}%` }}
                                        />
                                        {idx % 5 === 0 && (
                                            <span className="text-[9px] text-slate-600 mt-1">{day.date.slice(5)}</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* ── Top marchands + Statuts ── */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="rounded-2xl border border-white/8 bg-slate-900/60 p-6">
                                <div className="flex items-center gap-2 mb-5">
                                    <Store size={17} className="text-violet-400" />
                                    <span className="font-semibold text-white text-sm">Top marchands</span>
                                </div>
                                {metrics.topMerchants.length === 0 ? (
                                    <p className="text-sm text-slate-500">Aucune donnée</p>
                                ) : (
                                    <div className="space-y-4">
                                        {metrics.topMerchants.map((m, i) => {
                                            const pct = metrics.totalSpent > 0 ? (m.total / metrics.totalSpent) * 100 : 0;
                                            return (
                                                <div key={m.name + i}>
                                                    <div className="flex items-center justify-between text-sm mb-1.5">
                                                        <span className="text-slate-200 truncate max-w-[180px]">{m.name}</span>
                                                        <span className="text-slate-400 shrink-0 ml-2 font-mono">{formatShort(m.total)}</span>
                                                    </div>
                                                    <div className="h-1.5 rounded-full bg-slate-700/60 overflow-hidden">
                                                        <div className="h-full rounded-full bg-violet-500" style={{ width: `${pct}%` }} />
                                                    </div>
                                                    <p className="text-[10px] text-slate-500 mt-0.5">{m.count} achat{m.count > 1 ? 's' : ''} · {pct.toFixed(0)}%</p>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            <div className="rounded-2xl border border-white/8 bg-slate-900/60 p-6">
                                <div className="flex items-center gap-2 mb-5">
                                    <ShieldCheck size={17} className="text-emerald-400" />
                                    <span className="font-semibold text-white text-sm">Répartition par statut</span>
                                </div>
                                <div className="space-y-4">
                                    {metrics.statusDist.map((row) => (
                                        <div key={row.status}>
                                            <div className="flex items-center justify-between text-sm mb-1.5">
                                                <span className="text-slate-200">{row.status}</span>
                                                <span className="text-slate-400">{row.count} · {row.pct}%</span>
                                            </div>
                                            <div className="h-1.5 rounded-full bg-slate-700/60 overflow-hidden">
                                                <div className={`h-full rounded-full ${statusColor(row.status)}`} style={{ width: `${row.pct}%` }} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* ── Top cartes ── */}
                        {metrics.topCards.length > 0 && (
                            <div className="rounded-2xl border border-white/8 bg-slate-900/60 p-6">
                                <div className="flex items-center gap-2 mb-5">
                                    <CreditCard size={17} className="text-blue-400" />
                                    <span className="font-semibold text-white text-sm">Activité par carte</span>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    {metrics.topCards.map((card) => (
                                        <div key={card.pan} className="rounded-xl border border-white/8 bg-slate-800/40 p-4">
                                            <p className="font-mono text-sm text-white mb-1">{card.pan}</p>
                                            <p className="text-xl font-bold text-cyan-300">{formatShort(card.total)}</p>
                                            <p className="text-xs text-slate-500 mt-1">{card.count} achat{card.count > 1 ? 's' : ''}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
