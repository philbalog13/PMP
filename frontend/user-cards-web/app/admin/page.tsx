'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@shared/context/AuthContext';
import { getAuthToken } from '@/lib/api-client';
import {
    Users, Search, RefreshCcw, ShieldBan, ShieldCheck, Mail,
    CreditCard, TrendingUp, AlertCircle, ChevronRight, X,
    Send, Wallet, Clock, CheckCircle2, XCircle, Eye
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────
interface Client {
    id: string;
    username: string;
    email: string;
    firstName: string;
    lastName: string;
    status: string;
    createdAt: string;
    accountBalance: number;
    currency: string;
    iban: string;
    accountStatus: string;
    activeCards: number;
    totalCards: number;
    totalTransactions: number;
    totalSpent: number;
}

interface ClientDetail {
    client: Client;
    account: {
        iban: string;
        bic: string;
        balance: number;
        currency: string;
        status: string;
        accountLabel: string;
    } | null;
    cards: Array<{
        id: string;
        maskedPan: string;
        cardType: string;
        network: string;
        status: string;
        balance: number;
        dailyLimit: number;
        dailySpent: number;
    }>;
    recentTransactions: Array<{
        id: string;
        transactionId: string;
        amount: number;
        currency: string;
        type: string;
        status: string;
        merchantName: string;
        responseCode: string;
        createdAt: string;
    }>;
}

// ── Helpers ────────────────────────────────────────────────────────────
const fmt = (n: number, cur = 'EUR') =>
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: cur, minimumFractionDigits: 2 }).format(n);

const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });

async function adminFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
    const token = getAuthToken();
    const res = await fetch(path, {
        ...init,
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(init.headers || {}),
        },
    });
    const data = await res.json();
    if (!res.ok || data.success === false) throw new Error(data.error || `HTTP ${res.status}`);
    return data as T;
}

// ── Status Badge ───────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
    const s = status?.toUpperCase();
    const cls = s === 'ACTIVE' ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20'
        : s === 'SUSPENDED' ? 'bg-red-500/15 text-red-400 border-red-500/20'
            : 'bg-slate-500/15 text-slate-400 border-slate-500/20';
    const icon = s === 'ACTIVE' ? <CheckCircle2 size={11} /> : s === 'SUSPENDED' ? <XCircle size={11} /> : <Clock size={11} />;
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${cls}`}>
            {icon}{status}
        </span>
    );
}

// ── Message Modal ──────────────────────────────────────────────────────
function MessageModal({ client, onClose, onSent }: { client: Client; onClose: () => void; onSent: () => void }) {
    const [subject, setSubject] = useState('');
    const [content, setContent] = useState('');
    const [sending, setSending] = useState(false);
    const [error, setError] = useState('');

    const handleSend = async () => {
        if (!subject.trim() || !content.trim()) { setError('Sujet et contenu requis'); return; }
        setSending(true);
        setError('');
        try {
            await adminFetch(`/api/admin/clients/${client.id}/message`, {
                method: 'POST',
                body: JSON.stringify({ subject, content }),
            });
            onSent();
            onClose();
        } catch (e: any) {
            setError(e.message);
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="w-full max-w-lg bg-slate-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
                    <div>
                        <h3 className="text-white font-bold">Envoyer un message</h3>
                        <p className="text-slate-400 text-sm">À : {client.firstName} {client.lastName} ({client.email})</p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition">
                        <X size={18} />
                    </button>
                </div>
                <div className="p-6 space-y-4">
                    {error && <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2">{error}</div>}
                    <div>
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-2">Sujet</label>
                        <input
                            value={subject}
                            onChange={e => setSubject(e.target.value)}
                            placeholder="Objet du message..."
                            className="w-full px-4 py-3 bg-slate-800 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50 transition"
                        />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-2">Message</label>
                        <textarea
                            value={content}
                            onChange={e => setContent(e.target.value)}
                            rows={5}
                            placeholder="Rédigez votre message ici..."
                            className="w-full px-4 py-3 bg-slate-800 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50 transition resize-none"
                        />
                    </div>
                    <div className="flex gap-3 pt-2">
                        <button onClick={onClose} className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-slate-300 font-medium hover:bg-white/10 transition">
                            Annuler
                        </button>
                        <button
                            onClick={handleSend}
                            disabled={sending}
                            className="flex-1 px-4 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold flex items-center justify-center gap-2 disabled:opacity-50 transition"
                        >
                            <Send size={16} />
                            {sending ? 'Envoi...' : 'Envoyer'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── Client Detail Panel ────────────────────────────────────────────────
function ClientDetailPanel({ clientId, onClose }: { clientId: string; onClose: () => void }) {
    const [detail, setDetail] = useState<ClientDetail | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        adminFetch<{ success: boolean } & ClientDetail>(`/api/admin/clients/${clientId}`)
            .then(d => setDetail(d))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, [clientId]);

    return (
        <div className="fixed inset-0 z-40 flex items-start justify-end bg-black/50 backdrop-blur-sm" onClick={onClose}>
            <div
                className="w-full max-w-xl h-full bg-slate-900 border-l border-white/5 overflow-y-auto shadow-2xl"
                onClick={e => e.stopPropagation()}
            >
                <div className="sticky top-0 bg-slate-900/95 backdrop-blur-xl border-b border-white/5 px-6 py-4 flex items-center justify-between z-10">
                    <h3 className="text-white font-bold">Détail client</h3>
                    <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition">
                        <X size={18} />
                    </button>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : detail ? (
                    <div className="p-6 space-y-6">
                        {/* Client info */}
                        <div className="p-5 rounded-2xl bg-slate-800/50 border border-white/5">
                            <div className="flex items-center gap-4 mb-4">
                                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold text-lg">
                                    {(detail.client.firstName?.[0] || detail.client.username?.[0] || '?').toUpperCase()}
                                </div>
                                <div>
                                    <div className="text-white font-bold text-lg">{detail.client.firstName} {detail.client.lastName}</div>
                                    <div className="text-slate-400 text-sm">{detail.client.email}</div>
                                    <div className="mt-1"><StatusBadge status={detail.client.status} /></div>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3 text-sm">
                                <div><p className="text-slate-500">Nom d'utilisateur</p><p className="text-white">{detail.client.username}</p></div>
                                <div><p className="text-slate-500">Inscrit le</p><p className="text-white">{fmtDate(detail.client.createdAt)}</p></div>
                            </div>
                        </div>

                        {/* Account */}
                        {detail.account && (
                            <div className="p-5 rounded-2xl bg-slate-800/50 border border-white/5 space-y-3">
                                <h4 className="text-white font-bold flex items-center gap-2"><Wallet size={16} className="text-emerald-400" />Compte bancaire</h4>
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                    <div><p className="text-slate-500">Solde</p><p className="text-2xl font-black text-white">{fmt(detail.account.balance, detail.account.currency)}</p></div>
                                    <div><p className="text-slate-500">Statut</p><StatusBadge status={detail.account.status} /></div>
                                    <div className="col-span-2"><p className="text-slate-500">IBAN</p><p className="text-white font-mono text-xs">{detail.account.iban}</p></div>
                                    <div><p className="text-slate-500">BIC</p><p className="text-white font-mono text-xs">{detail.account.bic}</p></div>
                                </div>
                            </div>
                        )}

                        {/* Cards */}
                        {detail.cards.length > 0 && (
                            <div className="space-y-3">
                                <h4 className="text-white font-bold flex items-center gap-2"><CreditCard size={16} className="text-blue-400" />Cartes ({detail.cards.length})</h4>
                                {detail.cards.map(card => (
                                    <div key={card.id} className="p-4 rounded-xl bg-slate-800/50 border border-white/5 flex items-center justify-between">
                                        <div>
                                            <p className="text-white font-mono text-sm">{card.maskedPan}</p>
                                            <p className="text-slate-400 text-xs">{card.network} · {card.cardType}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-white font-bold">{fmt(card.balance)}</p>
                                            <StatusBadge status={card.status} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Transactions */}
                        {detail.recentTransactions.length > 0 && (
                            <div className="space-y-3">
                                <h4 className="text-white font-bold flex items-center gap-2"><TrendingUp size={16} className="text-purple-400" />Dernières transactions</h4>
                                {detail.recentTransactions.slice(0, 10).map(tx => (
                                    <div key={tx.id} className="p-3 rounded-xl bg-slate-800/50 border border-white/5 flex items-center justify-between">
                                        <div>
                                            <p className="text-white text-sm font-medium">{tx.merchantName || 'Inconnu'}</p>
                                            <p className="text-slate-500 text-xs">{fmtDate(tx.createdAt)} · {tx.type}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className={`text-sm font-bold ${tx.status === 'APPROVED' ? 'text-white' : 'text-red-400'}`}>
                                                {fmt(tx.amount, tx.currency)}
                                            </p>
                                            <StatusBadge status={tx.status} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ) : (
                    <p className="text-slate-400 text-center py-20">Impossible de charger les données.</p>
                )}
            </div>
        </div>
    );
}

// ── Main Page ──────────────────────────────────────────────────────────
export default function AdminPage() {
    const { user, isAuthenticated, isLoading } = useAuth();
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
    const [messageTarget, setMessageTarget] = useState<Client | null>(null);
    const [detailTarget, setDetailTarget] = useState<string | null>(null);

    const userRole = (user as any)?.role || '';
    const isAdmin = userRole === 'ROLE_FORMATEUR' || userRole.includes('FORMATEUR');

    const showToast = (msg: string, ok = true) => {
        setToast({ msg, ok });
        setTimeout(() => setToast(null), 3500);
    };

    const loadClients = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const data = await adminFetch<{ success: boolean; clients: Client[] }>('/api/admin/clients');
            setClients(data.clients || []);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (isAuthenticated && isAdmin) loadClients();
    }, [isAuthenticated, isAdmin, loadClients]);

    const handleSuspend = async (client: Client) => {
        const isSuspended = client.status === 'SUSPENDED';
        const action = isSuspended ? 'réactiver' : 'suspendre';
        if (!confirm(`Voulez-vous ${action} le compte de ${client.firstName} ${client.lastName} ?`)) return;
        setActionLoading(client.id);
        try {
            await adminFetch(`/api/admin/clients/${client.id}/suspend`, {
                method: 'PATCH',
                body: JSON.stringify({ suspended: !isSuspended }),
            });
            showToast(`Compte ${isSuspended ? 'réactivé' : 'suspendu'} avec succès`);
            loadClients();
        } catch (e: any) {
            showToast(e.message, false);
        } finally {
            setActionLoading(null);
        }
    };

    const filtered = clients.filter(c => {
        const q = search.toLowerCase();
        const matchSearch = !q || [c.username, c.email, c.firstName, c.lastName, c.iban]
            .some(f => f?.toLowerCase().includes(q));
        const matchStatus = statusFilter === 'ALL' || c.status === statusFilter;
        return matchSearch && matchStatus;
    });

    // ── Guards ─────────────────────────────────────────────────────────
    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!isAuthenticated || !isAdmin) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center px-6">
                <div className="max-w-md w-full rounded-3xl border border-red-500/20 bg-red-500/5 p-10 text-center space-y-4">
                    <AlertCircle size={40} className="text-red-400 mx-auto" />
                    <h1 className="text-2xl font-bold text-white">Accès refusé</h1>
                    <p className="text-slate-400">Cette page est réservée aux administrateurs (Formateurs).</p>
                </div>
            </div>
        );
    }

    // ── KPIs ───────────────────────────────────────────────────────────
    const totalBalance = clients.reduce((s, c) => s + c.accountBalance, 0);
    const totalSpent = clients.reduce((s, c) => s + c.totalSpent, 0);
    const suspended = clients.filter(c => c.status === 'SUSPENDED').length;
    const totalCards = clients.reduce((s, c) => s + c.totalCards, 0);

    return (
        <div className="min-h-screen bg-slate-950 py-8 pb-16">
            {/* Toast */}
            {toast && (
                <div className={`fixed top-6 right-6 z-[100] flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl border text-sm font-medium transition-all ${toast.ok ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300' : 'bg-red-500/15 border-red-500/30 text-red-300'}`}>
                    {toast.ok ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                    {toast.msg}
                </div>
            )}

            {/* Message Modal */}
            {messageTarget && (
                <MessageModal
                    client={messageTarget}
                    onClose={() => setMessageTarget(null)}
                    onSent={() => showToast('Message envoyé avec succès')}
                />
            )}

            {/* Detail Panel */}
            {detailTarget && (
                <ClientDetailPanel
                    clientId={detailTarget}
                    onClose={() => setDetailTarget(null)}
                />
            )}

            <div className="max-w-7xl mx-auto px-6 space-y-8">
                {/* Header */}
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-2xl bg-red-500/15 border border-red-500/20 flex items-center justify-center">
                                <ShieldCheck size={20} className="text-red-400" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-black text-white tracking-tight">Administration</h1>
                                <p className="text-slate-400 text-sm">Gestion des comptes clients · Espace formateur</p>
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={loadClients}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 border border-white/10 text-white hover:bg-slate-700 disabled:opacity-50 transition"
                    >
                        <RefreshCcw size={16} className={loading ? 'animate-spin' : ''} />
                        Actualiser
                    </button>
                </div>

                {/* KPI cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                        { label: 'Clients total', value: clients.length.toString(), icon: <Users size={18} />, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
                        { label: 'Solde total plateforme', value: fmt(totalBalance), icon: <Wallet size={18} />, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
                        { label: 'Comptes suspendus', value: suspended.toString(), icon: <ShieldBan size={18} />, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
                        { label: 'Volume dépensé', value: fmt(totalSpent), icon: <TrendingUp size={18} />, color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20' },
                    ].map(k => (
                        <div key={k.label} className={`p-5 rounded-2xl border ${k.bg}`}>
                            <div className={`mb-2 ${k.color}`}>{k.icon}</div>
                            <div className="text-xl font-black text-white">{k.value}</div>
                            <div className="text-xs text-slate-500 uppercase tracking-widest mt-1">{k.label}</div>
                        </div>
                    ))}
                </div>

                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Rechercher par nom, email, IBAN..."
                            className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50 transition"
                        />
                    </div>
                    <select
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value)}
                        className="px-4 py-3 bg-slate-900 border border-white/10 rounded-xl text-white focus:outline-none focus:border-blue-500/50 transition min-w-[160px]"
                    >
                        <option value="ALL">Tous les statuts</option>
                        <option value="ACTIVE">Actifs</option>
                        <option value="SUSPENDED">Suspendus</option>
                    </select>
                </div>

                {/* Error */}
                {error && (
                    <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-300 flex items-center gap-3">
                        <AlertCircle size={18} />
                        {error}
                    </div>
                )}

                {/* Table */}
                <div className="rounded-2xl border border-white/5 bg-slate-900/60 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-white/5 text-left">
                                    <th className="px-5 py-4 text-xs font-black uppercase tracking-widest text-slate-500">Client</th>
                                    <th className="px-5 py-4 text-xs font-black uppercase tracking-widest text-slate-500">Statut</th>
                                    <th className="px-5 py-4 text-xs font-black uppercase tracking-widest text-slate-500">Solde</th>
                                    <th className="px-5 py-4 text-xs font-black uppercase tracking-widest text-slate-500">Cartes</th>
                                    <th className="px-5 py-4 text-xs font-black uppercase tracking-widest text-slate-500">Dépenses</th>
                                    <th className="px-5 py-4 text-xs font-black uppercase tracking-widest text-slate-500">Inscription</th>
                                    <th className="px-5 py-4 text-xs font-black uppercase tracking-widest text-slate-500">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {loading ? (
                                    Array.from({ length: 5 }).map((_, i) => (
                                        <tr key={i}>
                                            {Array.from({ length: 7 }).map((_, j) => (
                                                <td key={j} className="px-5 py-4">
                                                    <div className="h-4 bg-slate-800 rounded animate-pulse" />
                                                </td>
                                            ))}
                                        </tr>
                                    ))
                                ) : filtered.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-5 py-16 text-center text-slate-500">
                                            Aucun client trouvé.
                                        </td>
                                    </tr>
                                ) : filtered.map(client => (
                                    <tr
                                        key={client.id}
                                        className={`hover:bg-white/3 transition-colors ${client.status === 'SUSPENDED' ? 'opacity-60' : ''}`}
                                    >
                                        {/* Client info */}
                                        <td className="px-5 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-slate-700 to-slate-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                                                    {(client.firstName?.[0] || client.username?.[0] || '?').toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="text-white font-semibold">{client.firstName} {client.lastName}</p>
                                                    <p className="text-slate-500 text-xs">{client.email}</p>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Status */}
                                        <td className="px-5 py-4">
                                            <StatusBadge status={client.status} />
                                        </td>

                                        {/* Balance */}
                                        <td className="px-5 py-4">
                                            <p className="text-white font-bold font-mono">{fmt(client.accountBalance, client.currency)}</p>
                                            <p className="text-slate-500 text-xs">{client.accountStatus}</p>
                                        </td>

                                        {/* Cards */}
                                        <td className="px-5 py-4">
                                            <div className="flex items-center gap-1.5">
                                                <CreditCard size={14} className="text-blue-400" />
                                                <span className="text-white font-bold">{client.activeCards}</span>
                                                <span className="text-slate-500 text-xs">/ {client.totalCards}</span>
                                            </div>
                                        </td>

                                        {/* Total spent */}
                                        <td className="px-5 py-4">
                                            <p className="text-white font-mono">{fmt(client.totalSpent, client.currency)}</p>
                                            <p className="text-slate-500 text-xs">{client.totalTransactions} tx</p>
                                        </td>

                                        {/* Date */}
                                        <td className="px-5 py-4 text-slate-400 text-xs">
                                            {fmtDate(client.createdAt)}
                                        </td>

                                        {/* Actions */}
                                        <td className="px-5 py-4">
                                            <div className="flex items-center gap-2">
                                                {/* View detail */}
                                                <button
                                                    onClick={() => setDetailTarget(client.id)}
                                                    title="Voir le détail"
                                                    className="p-2 rounded-lg bg-white/5 hover:bg-blue-500/20 text-slate-400 hover:text-blue-400 transition"
                                                >
                                                    <Eye size={15} />
                                                </button>

                                                {/* Send message */}
                                                <button
                                                    onClick={() => setMessageTarget(client)}
                                                    title="Envoyer un message"
                                                    className="p-2 rounded-lg bg-white/5 hover:bg-purple-500/20 text-slate-400 hover:text-purple-400 transition"
                                                >
                                                    <Mail size={15} />
                                                </button>

                                                {/* Suspend / Reactivate */}
                                                <button
                                                    onClick={() => handleSuspend(client)}
                                                    disabled={actionLoading === client.id}
                                                    title={client.status === 'SUSPENDED' ? 'Réactiver' : 'Suspendre'}
                                                    className={`p-2 rounded-lg transition ${client.status === 'SUSPENDED'
                                                        ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400'
                                                        : 'bg-white/5 hover:bg-red-500/20 text-slate-400 hover:text-red-400'
                                                    } disabled:opacity-50`}
                                                >
                                                    {actionLoading === client.id
                                                        ? <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                                        : client.status === 'SUSPENDED'
                                                            ? <ShieldCheck size={15} />
                                                            : <ShieldBan size={15} />
                                                    }
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Footer */}
                    {!loading && filtered.length > 0 && (
                        <div className="px-5 py-3 border-t border-white/5 flex items-center justify-between text-xs text-slate-500">
                            <span>{filtered.length} client(s) affiché(s) sur {clients.length}</span>
                            <span>{totalCards} cartes · {clients.reduce((s, c) => s + c.totalTransactions, 0)} transactions</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
