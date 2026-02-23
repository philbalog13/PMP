'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@shared/context/AuthContext';
import { UserRole } from '@shared/types/user';
import { clientApi } from '@/lib/api-client';
import {
    ArrowLeft, CreditCard, Lock, Unlock, Shield, Wifi, Globe,
    ShoppingCart, RefreshCcw, AlertCircle, CheckCircle2, Settings2,
    TrendingUp, Calendar, Clock
} from 'lucide-react';
import Link from 'next/link';

// ── Types ──────────────────────────────────────────────────────────────────
type Card = {
    id: string;
    maskedPan: string;
    cardholderName: string | null;
    expiryDate: string;
    cardType: string;
    network: string;
    status: string;
    dailyLimit: number;
    monthlyLimit: number;
    singleTxnLimit: number;
    dailySpent: number;
    monthlySpent: number;
    balance: number;
    currency: string;
    threedsEnrolled: boolean;
    contactlessEnabled: boolean;
    internationalEnabled: boolean;
    ecommerceEnabled: boolean;
    isAutoIssued: boolean;
    lastUsedDate: string | null;
    issueDate: string;
};

type RecentTx = {
    id: string;
    transactionId: string;
    amount: number;
    currency: string;
    type: string;
    status: string;
    merchantName: string;
    timestamp: string;
};

// ── Helpers ─────────────────────────────────────────────────────────────────
const toNum = (v: unknown) => parseFloat(String(v)) || 0;

const normalizeCard = (raw: Record<string, unknown>): Card => ({
    id: String(raw.id || ''),
    maskedPan: String(raw.masked_pan || raw.maskedPan || ''),
    cardholderName: (raw.cardholder_name || raw.cardholderName || null) as string | null,
    expiryDate: String(raw.expiry_date || raw.expiryDate || ''),
    cardType: String(raw.card_type || raw.cardType || 'DEBIT'),
    network: String(raw.network || 'VISA'),
    status: String(raw.status || 'ACTIVE'),
    dailyLimit: toNum(raw.daily_limit ?? raw.dailyLimit),
    monthlyLimit: toNum(raw.monthly_limit ?? raw.monthlyLimit),
    singleTxnLimit: toNum(raw.single_txn_limit ?? raw.singleTxnLimit),
    dailySpent: toNum(raw.daily_spent ?? raw.dailySpent),
    monthlySpent: toNum(raw.monthly_spent ?? raw.monthlySpent),
    balance: toNum(raw.balance),
    currency: String(raw.currency || 'EUR'),
    threedsEnrolled: Boolean(raw.threeds_enrolled ?? raw.threedsEnrolled),
    contactlessEnabled: Boolean(raw.contactless_enabled ?? raw.contactlessEnabled),
    internationalEnabled: Boolean(raw.international_enabled ?? raw.internationalEnabled),
    ecommerceEnabled: Boolean(raw.ecommerce_enabled ?? raw.ecommerceEnabled),
    isAutoIssued: Boolean(raw.is_auto_issued ?? raw.isAutoIssued),
    lastUsedDate: (raw.last_used_date || raw.lastUsedDate || null) as string | null,
    issueDate: String(raw.issue_date || raw.issueDate || ''),
});

const normalizeTx = (raw: Record<string, unknown>): RecentTx => ({
    id: String(raw.id || ''),
    transactionId: String(raw.transaction_id || raw.transactionId || ''),
    amount: toNum(raw.amount),
    currency: String(raw.currency || 'EUR'),
    type: String(raw.type || 'PURCHASE'),
    status: String(raw.status || 'PENDING'),
    merchantName: String(raw.merchant_name || raw.merchantName || '—'),
    timestamp: String(raw.timestamp || raw.created_at || ''),
});

const fmt = (n: number, cur = 'EUR') =>
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: cur, minimumFractionDigits: 2 }).format(n);

const fmtDate = (d: string | null) => d
    ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—';

const fmtDateTime = (d: string) => {
    const dt = new Date(d);
    return dt.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
        + ' ' + dt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
};

const networkGradient = (n: string) =>
    n === 'VISA' ? 'from-blue-600 to-blue-900' : 'from-red-700 to-orange-900';

const pct = (spent: number, limit: number) =>
    limit > 0 ? Math.min(100, (spent / limit) * 100) : 0;

// ── Feature Toggle ──────────────────────────────────────────────────────────
function FeatureToggle({
    icon, label, description, value, onChange, loading
}: {
    icon: React.ReactNode; label: string; description: string;
    value: boolean; onChange: (v: boolean) => void; loading: boolean;
}) {
    return (
        <button
            onClick={() => !loading && onChange(!value)}
            disabled={loading}
            className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all text-left ${value
                ? 'bg-blue-500/10 border-blue-500/30'
                : 'bg-white/3 border-white/8 hover:border-white/15'
            } disabled:opacity-50`}
        >
            <span className={`shrink-0 ${value ? 'text-blue-400' : 'text-slate-500'}`}>{icon}</span>
            <div className="flex-1 min-w-0">
                <p className={`font-semibold text-sm ${value ? 'text-blue-300' : 'text-slate-300'}`}>{label}</p>
                <p className="text-slate-500 text-xs">{description}</p>
            </div>
            {loading
                ? <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin shrink-0" />
                : (
                    <span className={`shrink-0 w-10 h-5 rounded-full relative transition-colors ${value ? 'bg-blue-500' : 'bg-slate-700'}`}>
                        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${value ? 'left-5' : 'left-0.5'}`} />
                    </span>
                )
            }
        </button>
    );
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function CardDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const { isAuthenticated, isLoading: authLoading, user } = useAuth();

    const [card, setCard] = useState<Card | null>(null);
    const [recentTxs, setRecentTxs] = useState<RecentTx[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [featureSaving, setFeatureSaving] = useState<string | null>(null);
    const [blockSaving, setBlockSaving] = useState(false);
    const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

    const showToast = (msg: string, ok = true) => {
        setToast({ msg, ok });
        setTimeout(() => setToast(null), 3000);
    };

    const loadCard = async () => {
        setLoading(true);
        setError('');
        try {
            const res = await clientApi.getCardById(id) as any;
            if (!res?.card) throw new Error('Carte introuvable');
            setCard(normalizeCard(res.card as Record<string, unknown>));
            const rawTxs: Record<string, unknown>[] = res.recentTransactions || [];
            setRecentTxs(rawTxs.map(normalizeTx));
        } catch (e: any) {
            setError(e.message || 'Erreur de chargement');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isAuthenticated) loadCard();
    }, [isAuthenticated, id]);

    const handleBlock = async () => {
        if (!card) return;
        const willBlock = card.status !== 'BLOCKED';
        setBlockSaving(true);
        try {
            const res = await clientApi.toggleCardBlock(card.id, willBlock) as any;
            const newStatus = res.card?.status || (willBlock ? 'BLOCKED' : 'ACTIVE');
            setCard(prev => prev ? { ...prev, status: newStatus } : prev);
            showToast(willBlock ? 'Carte bloquée' : 'Carte débloquée');
        } catch (e: any) {
            showToast(e.message, false);
        } finally {
            setBlockSaving(false);
        }
    };

    const handleFeature = async (feature: string, value: boolean) => {
        if (!card) return;
        setFeatureSaving(feature);
        try {
            await clientApi.updateCardFeatures(card.id, { [feature]: value } as any);
            setCard(prev => prev ? { ...prev, [feature]: value } : prev);
            showToast('Fonctionnalité mise à jour');
        } catch (e: any) {
            showToast(e.message, false);
        } finally {
            setFeatureSaving(null);
        }
    };

    // Auth guard
    if (authLoading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!isAuthenticated || user?.role !== UserRole.CLIENT) {
        router.replace('/');
        return null;
    }

    // Loading state
    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 p-8">
                <div className="max-w-4xl mx-auto">
                    <Link href="/cards" className="flex items-center gap-2 text-slate-400 hover:text-white mb-8 transition text-sm">
                        <ArrowLeft size={16} /> Retour aux cartes
                    </Link>
                    <div className="space-y-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-32 rounded-2xl bg-slate-800/40 animate-pulse" />
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    // Error / not found
    if (error || !card) {
        return (
            <div className="min-h-screen bg-slate-950 p-8 flex items-center justify-center">
                <div className="max-w-md text-center space-y-4">
                    <AlertCircle size={40} className="text-red-400 mx-auto" />
                    <h2 className="text-2xl font-bold text-white">Carte introuvable</h2>
                    <p className="text-slate-400">{error || 'Cette carte n\'existe pas ou ne vous appartient pas.'}</p>
                    <Link href="/cards" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 text-white hover:bg-slate-700 transition text-sm font-medium">
                        <ArrowLeft size={14} /> Retour aux cartes
                    </Link>
                </div>
            </div>
        );
    }

    const isBlocked = card.status === 'BLOCKED';
    const dailyPct = pct(card.dailySpent, card.dailyLimit);
    const monthlyPct = pct(card.monthlySpent, card.monthlyLimit);

    return (
        <div className="min-h-screen bg-slate-950 py-8 pb-16">
            {/* Toast */}
            {toast && (
                <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl border text-sm font-medium ${toast.ok ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300' : 'bg-red-500/15 border-red-500/30 text-red-300'}`}>
                    {toast.ok ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                    {toast.msg}
                </div>
            )}

            <div className="max-w-4xl mx-auto px-6 space-y-6">
                {/* Back + refresh */}
                <div className="flex items-center justify-between">
                    <Link href="/cards" className="flex items-center gap-2 text-slate-400 hover:text-white transition text-sm">
                        <ArrowLeft size={16} /> Retour aux cartes
                    </Link>
                    <button
                        onClick={loadCard}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-slate-300 hover:text-white hover:bg-slate-700 transition text-sm"
                    >
                        <RefreshCcw size={14} />
                        Actualiser
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                    {/* Left column — card + status */}
                    <div className="lg:col-span-2 space-y-4">
                        {/* Card visual */}
                        <div className={`relative rounded-2xl bg-gradient-to-br ${networkGradient(card.network)} p-5 overflow-hidden shadow-xl`}>
                            <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent pointer-events-none" />
                            <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/5" />

                            {isBlocked && (
                                <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                                    <div className="flex items-center gap-2 text-red-400 font-bold text-sm bg-red-500/15 border border-red-500/30 rounded-xl px-4 py-2">
                                        <Lock size={16} /> Carte bloquée
                                    </div>
                                </div>
                            )}

                            <div className="relative">
                                <div className="flex justify-between items-start mb-6">
                                    <div>
                                        <p className="text-white/50 text-[10px] uppercase tracking-widest">
                                            {card.isAutoIssued ? 'Carte principale' : card.cardType}
                                        </p>
                                        <p className="text-white font-bold text-lg">{card.network}</p>
                                    </div>
                                    <div className="w-10 h-7 rounded-md bg-yellow-400/80" />
                                </div>
                                <p className="text-white font-mono text-base tracking-widest mb-5">{card.maskedPan}</p>
                                <div className="flex justify-between items-end">
                                    <div>
                                        <p className="text-white/40 text-[9px] uppercase">Expiration</p>
                                        <p className="text-white font-mono text-sm">{card.expiryDate}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-white/40 text-[9px] uppercase">Solde</p>
                                        <p className="text-white font-bold text-sm">{fmt(card.balance, card.currency)}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Block / Unblock */}
                        <button
                            onClick={handleBlock}
                            disabled={blockSaving}
                            className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl border font-semibold text-sm transition ${isBlocked
                                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                                : 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20'
                            } disabled:opacity-50`}
                        >
                            {blockSaving
                                ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                : isBlocked ? <Unlock size={16} /> : <Lock size={16} />
                            }
                            {isBlocked ? 'Débloquer la carte' : 'Bloquer la carte'}
                        </button>

                        {/* Info grid */}
                        <div className="grid grid-cols-2 gap-2">
                            {[
                                { label: 'Statut', value: card.status, color: isBlocked ? 'text-red-400' : 'text-emerald-400' },
                                { label: 'Titulaire', value: card.cardholderName || '—', color: 'text-white' },
                                { label: 'Émission', value: fmtDate(card.issueDate), color: 'text-white' },
                                { label: 'Dernière utilisation', value: fmtDate(card.lastUsedDate), color: 'text-white' },
                            ].map(item => (
                                <div key={item.label} className="p-3 rounded-xl bg-slate-900/60 border border-white/5">
                                    <p className="text-slate-500 text-[10px] uppercase tracking-widest mb-1">{item.label}</p>
                                    <p className={`font-semibold text-xs ${item.color}`}>{item.value}</p>
                                </div>
                            ))}
                        </div>

                        {/* Spending bars */}
                        <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/5 space-y-3">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <TrendingUp size={12} /> Utilisation
                            </p>
                            {[
                                { label: 'Journalier', spent: card.dailySpent, limit: card.dailyLimit, pct: dailyPct },
                                { label: 'Mensuel', spent: card.monthlySpent, limit: card.monthlyLimit, pct: monthlyPct },
                            ].map(({ label, spent, limit, pct: p }) => (
                                <div key={label}>
                                    <div className="flex justify-between text-xs mb-1">
                                        <span className="text-slate-400">{label}</span>
                                        <span className="text-white font-mono">{fmt(spent)} / {fmt(limit)}</span>
                                    </div>
                                    <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all ${p > 85 ? 'bg-red-500' : 'bg-blue-500'}`}
                                            style={{ width: `${p}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                            <div className="pt-1 text-xs text-slate-500 flex gap-4">
                                <span>Max/tx : {fmt(card.singleTxnLimit)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Right column — features + transactions */}
                    <div className="lg:col-span-3 space-y-4">
                        {/* Features */}
                        <div className="p-5 rounded-2xl bg-slate-900/60 border border-white/5 space-y-3">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <Settings2 size={12} /> Options de la carte
                            </p>
                            <FeatureToggle
                                icon={<Wifi size={16} />}
                                label="Paiement sans contact (NFC)"
                                description="Transactions rapides jusqu'à 50€"
                                value={card.contactlessEnabled}
                                loading={featureSaving === 'contactlessEnabled'}
                                onChange={v => handleFeature('contactlessEnabled', v)}
                            />
                            <FeatureToggle
                                icon={<Globe size={16} />}
                                label="Paiements internationaux"
                                description="Autoriser les transactions hors zone euro"
                                value={card.internationalEnabled}
                                loading={featureSaving === 'internationalEnabled'}
                                onChange={v => handleFeature('internationalEnabled', v)}
                            />
                            <FeatureToggle
                                icon={<ShoppingCart size={16} />}
                                label="Paiements e-commerce"
                                description="Utiliser la carte en ligne"
                                value={card.ecommerceEnabled}
                                loading={featureSaving === 'ecommerceEnabled'}
                                onChange={v => handleFeature('ecommerceEnabled', v)}
                            />
                            <FeatureToggle
                                icon={<Shield size={16} />}
                                label="Authentification 3D Secure"
                                description="Vérification renforcée pour les paiements en ligne"
                                value={card.threedsEnrolled}
                                loading={featureSaving === 'threedsEnrolled'}
                                onChange={v => handleFeature('threedsEnrolled', v)}
                            />
                        </div>

                        {/* Recent transactions */}
                        <div className="p-5 rounded-2xl bg-slate-900/60 border border-white/5 space-y-3">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <Clock size={12} /> Dernières transactions
                            </p>
                            {recentTxs.length === 0 ? (
                                <p className="text-slate-500 text-sm text-center py-6">Aucune transaction sur cette carte.</p>
                            ) : (
                                <div className="space-y-2">
                                    {recentTxs.slice(0, 8).map(tx => (
                                        <Link
                                            key={tx.id}
                                            href={`/transactions/${tx.id}`}
                                            className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition group"
                                        >
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${tx.status === 'APPROVED' ? 'bg-emerald-500/15' : 'bg-red-500/15'}`}>
                                                <CreditCard size={14} className={tx.status === 'APPROVED' ? 'text-emerald-400' : 'text-red-400'} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-white text-sm font-medium truncate">{tx.merchantName}</p>
                                                <p className="text-slate-500 text-xs">{fmtDateTime(tx.timestamp)}</p>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <p className={`text-sm font-bold ${tx.status === 'APPROVED' ? 'text-white' : 'text-red-400'}`}>
                                                    {fmt(tx.amount, tx.currency)}
                                                </p>
                                                <p className={`text-[10px] font-bold ${tx.status === 'APPROVED' ? 'text-emerald-400' : 'text-red-400'}`}>{tx.status}</p>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            )}
                            <Link
                                href={`/transactions`}
                                className="block text-center text-xs text-slate-500 hover:text-blue-400 transition pt-1"
                            >
                                Voir toutes les transactions →
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
