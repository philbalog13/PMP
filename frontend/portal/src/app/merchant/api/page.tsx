'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../auth/useAuth';
import {
    Key,
    Webhook,
    Plus,
    Copy,
    Trash2,
    CheckCircle2,
    XCircle,
    AlertTriangle,
    ChevronRight,
    ExternalLink,
    Code,
    Shield,
    Clock
} from 'lucide-react';
import Link from 'next/link';

interface APIKey {
    id: string;
    keyName: string;
    apiKeyPrefix: string;
    permissions: string[];
    rateLimitPerMinute: number;
    isActive: boolean;
    lastUsedAt: string | null;
    createdAt: string;
}

interface WebhookConfig {
    id: string;
    url: string;
    events: string[];
    isActive: boolean;
    lastTriggeredAt: string | null;
    consecutiveFailures: number;
    createdAt: string;
}

const toStringArray = (value: unknown): string[] => {
    if (Array.isArray(value)) return value.map(String);
    if (typeof value === 'string') {
        try {
            const parsed = JSON.parse(value);
            if (Array.isArray(parsed)) return parsed.map(String);
        } catch {
            // Ignore parse error and fallback below
        }
        return value ? [value] : [];
    }
    return [];
};

type UnknownRecord = Record<string, unknown>;

const toRecord = (value: unknown): UnknownRecord => (
    value !== null && typeof value === 'object' ? (value as UnknownRecord) : {}
);

const toNullableString = (value: unknown): string | null => (
    typeof value === 'string' ? value : null
);

const normalizeApiKey = (raw: unknown): APIKey => {
    const r = toRecord(raw);
    return {
        id: String(r.id || ''),
        keyName: String(r.keyName ?? r.key_name ?? ''),
        apiKeyPrefix: String(r.apiKeyPrefix ?? r.api_key_prefix ?? ''),
        permissions: toStringArray(r.permissions),
        rateLimitPerMinute: Number(r.rateLimitPerMinute ?? r.rate_limit_per_minute ?? 60),
        isActive: Boolean(r.isActive ?? r.is_active),
        lastUsedAt: toNullableString(r.lastUsedAt ?? r.last_used_at),
        createdAt: String(r.createdAt ?? r.created_at ?? '')
    };
};

const normalizeWebhook = (raw: unknown): WebhookConfig => {
    const r = toRecord(raw);
    return {
        id: String(r.id || ''),
        url: String(r.url ?? ''),
        events: toStringArray(r.events),
        isActive: Boolean(r.isActive ?? r.is_active),
        lastTriggeredAt: toNullableString(r.lastTriggeredAt ?? r.last_triggered_at),
        consecutiveFailures: Number(r.consecutiveFailures ?? r.consecutive_failures ?? 0),
        createdAt: String(r.createdAt ?? r.created_at ?? '')
    };
};

export default function MerchantAPIPage() {
    const { isLoading } = useAuth(true);
    const [apiKeys, setApiKeys] = useState<APIKey[]>([]);
    const [webhooks, setWebhooks] = useState<WebhookConfig[]>([]);
    const [loading, setLoading] = useState(true);
    const [showNewKeyModal, setShowNewKeyModal] = useState(false);
    const [showNewWebhookModal, setShowNewWebhookModal] = useState(false);
    const [newKeyName, setNewKeyName] = useState('');
    const [newWebhookUrl, setNewWebhookUrl] = useState('');
    const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null);
    const [copiedKey, setCopiedKey] = useState<string | null>(null);

    useEffect(() => {
        fetchAPIData();
    }, []);

    const fetchAPIData = async () => {
        try {
            const token = localStorage.getItem('token');

            // Fetch API keys
            const keysResponse = await fetch('/api/merchant/api-keys', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            // Fetch webhooks
            const webhooksResponse = await fetch('/api/merchant/webhooks', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (keysResponse.ok) {
                const keysData = await keysResponse.json();
                setApiKeys((keysData.apiKeys || []).map(normalizeApiKey));
            } else {
                // Mock data
                setApiKeys([
                    {
                        id: '1',
                        keyName: 'Production Key',
                        apiKeyPrefix: 'pmp_prod_a1b2',
                        permissions: ['transactions.read', 'transactions.create'],
                        rateLimitPerMinute: 60,
                        isActive: true,
                        lastUsedAt: '2024-01-15T14:30:00Z',
                        createdAt: '2024-01-01T10:00:00Z'
                    }
                ]);
            }

            if (webhooksResponse.ok) {
                const webhooksData = await webhooksResponse.json();
                setWebhooks((webhooksData.webhooks || []).map(normalizeWebhook));
            } else {
                // Mock data
                setWebhooks([
                    {
                        id: '1',
                        url: 'https://example.com/webhooks/pmp',
                        events: ['transaction.approved', 'transaction.declined'],
                        isActive: true,
                        lastTriggeredAt: '2024-01-15T14:25:00Z',
                        consecutiveFailures: 0,
                        createdAt: '2024-01-01T10:00:00Z'
                    }
                ]);
            }
        } catch (error) {
            console.error('Failed to fetch API data:', error);
        } finally {
            setLoading(false);
        }
    };

    const createAPIKey = async () => {
        if (!newKeyName.trim()) return;

        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/merchant/api-keys', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ keyName: newKeyName })
            });

            if (response.ok) {
                const data = await response.json();
                if (data?.apiKey?.key) {
                    setNewlyCreatedKey(data.apiKey.key);
                }
                const createdKey = normalizeApiKey(data.apiKey || {});
                if (createdKey.id) {
                    setApiKeys([createdKey, ...apiKeys]);
                }
            }
        } catch (error) {
            console.error('Failed to create API key:', error);
        }

        setNewKeyName('');
        setShowNewKeyModal(false);
    };

    const revokeAPIKey = async (keyId: string) => {
        if (!confirm('Voulez-vous vraiment révoquer cette clé API ?')) return;

        try {
            const token = localStorage.getItem('token');
            await fetch(`/api/merchant/api-keys/${keyId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            setApiKeys(apiKeys.filter(key => key.id !== keyId));
        } catch (error) {
            console.error('Failed to revoke API key:', error);
        }
    };

    const createWebhook = async () => {
        if (!newWebhookUrl.trim()) return;

        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/merchant/webhooks', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ url: newWebhookUrl })
            });

            if (response.ok) {
                const data = await response.json();
                const createdWebhook = normalizeWebhook(data.webhook || {});
                if (createdWebhook.id) {
                    setWebhooks([createdWebhook, ...webhooks]);
                }
            }
        } catch (error) {
            console.error('Failed to create webhook:', error);
        }

        setNewWebhookUrl('');
        setShowNewWebhookModal(false);
    };

    const deleteWebhook = async (webhookId: string) => {
        if (!confirm('Voulez-vous vraiment supprimer ce webhook ?')) return;

        try {
            const token = localStorage.getItem('token');
            await fetch(`/api/merchant/webhooks/${webhookId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            setWebhooks(webhooks.filter(wh => wh.id !== webhookId));
        } catch (error) {
            console.error('Failed to delete webhook:', error);
        }
    };

    const copyToClipboard = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopiedKey(id);
        setTimeout(() => setCopiedKey(null), 2000);
    };

    if (isLoading || loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 pt-24 pb-12">
            <div className="max-w-5xl mx-auto px-6">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-2 text-slate-400 text-sm mb-4">
                        <Link href="/merchant" className="hover:text-purple-400">Dashboard</Link>
                        <ChevronRight size={14} />
                        <span className="text-white">Intégration API</span>
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2">Intégration API</h1>
                    <p className="text-slate-400">
                        Gérez vos clés API et configurez les webhooks pour l&apos;intégration avec votre système.
                    </p>
                </div>

                {/* Newly Created Key Alert */}
                {newlyCreatedKey && (
                    <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-6 mb-8">
                        <div className="flex items-start gap-4">
                            <Shield className="w-6 h-6 text-emerald-400 flex-shrink-0" />
                            <div className="flex-1">
                                <h3 className="text-lg font-semibold text-white mb-2">Clé API créée avec succès</h3>
                                <p className="text-sm text-slate-400 mb-4">
                                    Copiez cette clé maintenant. Elle ne sera plus affichée par la suite.
                                </p>
                                <div className="flex items-center gap-2 p-3 bg-slate-900 rounded-lg font-mono text-sm">
                                    <code className="text-emerald-400 flex-1 break-all">{newlyCreatedKey}</code>
                                    <button
                                        onClick={() => copyToClipboard(newlyCreatedKey, 'new')}
                                        className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
                                    >
                                        {copiedKey === 'new' ? (
                                            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                                        ) : (
                                            <Copy className="w-5 h-5 text-slate-400" />
                                        )}
                                    </button>
                                </div>
                            </div>
                            <button
                                onClick={() => setNewlyCreatedKey(null)}
                                className="text-slate-400 hover:text-white"
                            >
                                <XCircle size={20} />
                            </button>
                        </div>
                    </div>
                )}

                {/* API Keys Section */}
                <div className="mb-10">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                            <Key className="w-5 h-5 text-purple-400" />
                            Clés API
                        </h2>
                        <button
                            onClick={() => setShowNewKeyModal(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-xl text-sm font-medium transition-colors"
                        >
                            <Plus size={18} />
                            Nouvelle clé
                        </button>
                    </div>

                    <div className="space-y-4">
                        {apiKeys.length === 0 ? (
                            <div className="bg-slate-800/50 border border-white/10 rounded-2xl p-8 text-center">
                                <Key className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                                <p className="text-slate-400">Aucune clé API créée</p>
                                <button
                                    onClick={() => setShowNewKeyModal(true)}
                                    className="mt-4 text-purple-400 hover:text-purple-300"
                                >
                                    Créer votre première clé
                                </button>
                            </div>
                        ) : (
                            apiKeys.map((key) => (
                                <div key={key.id} className="bg-slate-800/50 border border-white/10 rounded-2xl p-6">
                                    <div className="flex items-start justify-between mb-4">
                                        <div>
                                            <h3 className="text-lg font-medium text-white mb-1">{key.keyName}</h3>
                                            <div className="flex items-center gap-2">
                                                <code className="text-sm text-slate-400 font-mono">{key.apiKeyPrefix}...</code>
                                                <button
                                                    onClick={() => copyToClipboard(key.apiKeyPrefix, key.id)}
                                                    className="p-1 hover:bg-slate-700 rounded transition-colors"
                                                >
                                                    {copiedKey === key.id ? (
                                                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                                    ) : (
                                                        <Copy className="w-4 h-4 text-slate-500" />
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className={`px-3 py-1 rounded-full text-xs ${
                                                key.isActive
                                                    ? 'bg-emerald-500/20 text-emerald-400'
                                                    : 'bg-red-500/20 text-red-400'
                                            }`}>
                                                {key.isActive ? 'Active' : 'Inactive'}
                                            </span>
                                            <button
                                                onClick={() => revokeAPIKey(key.id)}
                                                className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-3 gap-4 text-sm">
                                        <div>
                                            <p className="text-slate-500 mb-1">Permissions</p>
                                            <div className="flex flex-wrap gap-1">
                                                {key.permissions.map((perm, idx) => (
                                                    <span key={idx} className="px-2 py-0.5 bg-slate-700 text-slate-300 rounded text-xs">
                                                        {perm}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-slate-500 mb-1">Rate Limit</p>
                                            <p className="text-white">{key.rateLimitPerMinute} req/min</p>
                                        </div>
                                        <div>
                                            <p className="text-slate-500 mb-1">Dernière utilisation</p>
                                            <p className="text-white">
                                                {key.lastUsedAt
                                                    ? new Date(key.lastUsedAt).toLocaleString('fr-FR')
                                                    : 'Jamais'
                                                }
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Webhooks Section */}
                <div className="mb-10">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                            <Webhook className="w-5 h-5 text-blue-400" />
                            Webhooks
                        </h2>
                        <button
                            onClick={() => setShowNewWebhookModal(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-sm font-medium transition-colors"
                        >
                            <Plus size={18} />
                            Nouveau webhook
                        </button>
                    </div>

                    <div className="space-y-4">
                        {webhooks.length === 0 ? (
                            <div className="bg-slate-800/50 border border-white/10 rounded-2xl p-8 text-center">
                                <Webhook className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                                <p className="text-slate-400">Aucun webhook configuré</p>
                                <button
                                    onClick={() => setShowNewWebhookModal(true)}
                                    className="mt-4 text-blue-400 hover:text-blue-300"
                                >
                                    Configurer votre premier webhook
                                </button>
                            </div>
                        ) : (
                            webhooks.map((webhook) => (
                                <div key={webhook.id} className="bg-slate-800/50 border border-white/10 rounded-2xl p-6">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2">
                                                <code className="text-sm text-white font-mono break-all">{webhook.url}</code>
                                                <a
                                                    href={webhook.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="p-1 hover:bg-slate-700 rounded transition-colors"
                                                >
                                                    <ExternalLink className="w-4 h-4 text-slate-500" />
                                                </a>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {webhook.events.map((event, idx) => (
                                                    <span key={idx} className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded text-xs">
                                                        {event}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {webhook.consecutiveFailures > 0 && (
                                                <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded-full flex items-center gap-1">
                                                    <AlertTriangle size={12} />
                                                    {webhook.consecutiveFailures} échecs
                                                </span>
                                            )}
                                            <span className={`px-3 py-1 rounded-full text-xs ${
                                                webhook.isActive
                                                    ? 'bg-emerald-500/20 text-emerald-400'
                                                    : 'bg-red-500/20 text-red-400'
                                            }`}>
                                                {webhook.isActive ? 'Actif' : 'Inactif'}
                                            </span>
                                            <button
                                                onClick={() => deleteWebhook(webhook.id)}
                                                className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4 text-sm text-slate-400">
                                        <span className="flex items-center gap-1">
                                            <Clock size={14} />
                                            Dernier appel: {webhook.lastTriggeredAt
                                                ? new Date(webhook.lastTriggeredAt).toLocaleString('fr-FR')
                                                : 'Jamais'
                                            }
                                        </span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* API Documentation */}
                <div className="bg-slate-800/50 border border-white/10 rounded-2xl p-6">
                    <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                        <Code className="w-5 h-5 text-amber-400" />
                        Documentation API
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 bg-slate-900/50 rounded-xl">
                            <h3 className="font-medium text-white mb-2">Authentification</h3>
                            <p className="text-sm text-slate-400 mb-3">
                                Incluez votre clé API dans le header Authorization.
                            </p>
                            <code className="block p-3 bg-slate-950 rounded-lg text-xs text-emerald-400 font-mono">
                                Authorization: Bearer pmp_your_api_key
                            </code>
                        </div>

                        <div className="p-4 bg-slate-900/50 rounded-xl">
                            <h3 className="font-medium text-white mb-2">Base URL</h3>
                            <p className="text-sm text-slate-400 mb-3">
                                Tous les endpoints utilisent cette URL de base.
                            </p>
                            <code className="block p-3 bg-slate-950 rounded-lg text-xs text-emerald-400 font-mono">
                                https://api.pmp.edu/v1
                            </code>
                        </div>

                        <div className="p-4 bg-slate-900/50 rounded-xl">
                            <h3 className="font-medium text-white mb-2">Créer une transaction</h3>
                            <code className="block p-3 bg-slate-950 rounded-lg text-xs text-emerald-400 font-mono">
                                POST /transactions
                            </code>
                        </div>

                        <div className="p-4 bg-slate-900/50 rounded-xl">
                            <h3 className="font-medium text-white mb-2">Lister les transactions</h3>
                            <code className="block p-3 bg-slate-950 rounded-lg text-xs text-emerald-400 font-mono">
                                GET /transactions?status=approved
                            </code>
                        </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-white/5">
                        <a
                            href="/documentation"
                            className="text-purple-400 hover:text-purple-300 text-sm flex items-center gap-1"
                        >
                            Voir la documentation complète <ExternalLink size={14} />
                        </a>
                    </div>
                </div>
            </div>

            {/* New Key Modal */}
            {showNewKeyModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-800 border border-white/10 rounded-2xl p-6 max-w-md w-full">
                        <h3 className="text-xl font-semibold text-white mb-4">Créer une nouvelle clé API</h3>
                        <input
                            type="text"
                            value={newKeyName}
                            onChange={(e) => setNewKeyName(e.target.value)}
                            placeholder="Nom de la clé (ex: Production)"
                            className="w-full px-4 py-3 bg-slate-900 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                onClick={() => setShowNewKeyModal(false)}
                                className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={createAPIKey}
                                disabled={!newKeyName.trim()}
                                className="px-4 py-2 bg-purple-500 hover:bg-purple-600 disabled:opacity-50 text-white rounded-xl font-medium transition-colors"
                            >
                                Créer
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* New Webhook Modal */}
            {showNewWebhookModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-800 border border-white/10 rounded-2xl p-6 max-w-md w-full">
                        <h3 className="text-xl font-semibold text-white mb-4">Configurer un nouveau webhook</h3>
                        <input
                            type="url"
                            value={newWebhookUrl}
                            onChange={(e) => setNewWebhookUrl(e.target.value)}
                            placeholder="https://votre-site.com/webhook"
                            className="w-full px-4 py-3 bg-slate-900 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <p className="text-xs text-slate-400 mt-2">
                            Les événements transaction.approved et transaction.declined seront envoyés à cette URL.
                        </p>
                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                onClick={() => setShowNewWebhookModal(false)}
                                className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={createWebhook}
                                disabled={!newWebhookUrl.trim()}
                                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white rounded-xl font-medium transition-colors"
                            >
                                Créer
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
