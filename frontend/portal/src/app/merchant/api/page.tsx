'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../../auth/useAuth';
import {
    AlertTriangle,
    CheckCircle2,
    ChevronRight,
    Copy,
    ExternalLink,
    Key,
    Plus,
    Shield,
    Trash2,
    Webhook,
} from 'lucide-react';
import { formatDateTimeString } from '@shared/lib/formatting';
import { BankPageHeader } from '@shared/components/banking/layout/BankPageHeader';
import { BankButton } from '@shared/components/banking/primitives/BankButton';
import { BankBadge } from '@shared/components/banking/primitives/BankBadge';
import { BankFormField } from '@shared/components/banking/forms/BankFormField';
import { BankSpinner } from '@shared/components/banking/primitives/BankSpinner';
import { BankModal } from '@shared/components/banking/feedback/BankModal';
import { BankEmptyState } from '@shared/components/banking/feedback/BankEmptyState';
import { StatCard } from '@shared/components/banking/data-display/StatCard';
import { BankTable, type BankTableColumn } from '@shared/components/banking/data-display/BankTable';

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
            return value ? [value] : [];
        }
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
        createdAt: String(r.createdAt ?? r.created_at ?? ''),
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
        createdAt: String(r.createdAt ?? r.created_at ?? ''),
    };
};

const formatDateOrNever = (value: string | null) => (
    value ? formatDateTimeString(value) : 'Jamais'
);

const readResponseError = async (response: Response, fallback: string): Promise<string> => {
    try {
        const payload = await response.json() as UnknownRecord;
        const message = payload.error ?? payload.message;
        return typeof message === 'string' && message.trim().length > 0
            ? message
            : `${fallback} (${response.status})`;
    } catch {
        return `${fallback} (${response.status})`;
    }
};

export default function MerchantAPIPage() {
    const { isLoading } = useAuth(true);
    const [apiKeys, setApiKeys] = useState<APIKey[]>([]);
    const [webhooks, setWebhooks] = useState<WebhookConfig[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showNewKeyModal, setShowNewKeyModal] = useState(false);
    const [showNewWebhookModal, setShowNewWebhookModal] = useState(false);
    const [newKeyName, setNewKeyName] = useState('');
    const [newWebhookUrl, setNewWebhookUrl] = useState('');
    const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null);
    const [copiedKey, setCopiedKey] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [apiKeysError, setApiKeysError] = useState<string | null>(null);
    const [webhooksError, setWebhooksError] = useState<string | null>(null);

    useEffect(() => {
        void fetchAPIData();
    }, []);

    const fetchAPIData = async () => {
        try {
            setRefreshing(true);
            setError(null);
            setApiKeysError(null);
            setWebhooksError(null);
            const token = localStorage.getItem('token');

            const [keysResponse, webhooksResponse] = await Promise.all([
                fetch('/api/merchant/api-keys', {
                    headers: { Authorization: `Bearer ${token}` },
                }),
                fetch('/api/merchant/webhooks', {
                    headers: { Authorization: `Bearer ${token}` },
                }),
            ]);

            if (keysResponse.ok) {
                const keysData = await keysResponse.json();
                setApiKeys((keysData.apiKeys || []).map(normalizeApiKey));
            } else {
                setApiKeys([]);
                setApiKeysError(await readResponseError(keysResponse, 'Impossible de charger les cles API'));
            }

            if (webhooksResponse.ok) {
                const webhooksData = await webhooksResponse.json();
                setWebhooks((webhooksData.webhooks || []).map(normalizeWebhook));
            } else {
                setWebhooks([]);
                setWebhooksError(await readResponseError(webhooksResponse, 'Impossible de charger les webhooks'));
            }
        } catch (fetchError: unknown) {
            const message = fetchError instanceof Error ? fetchError.message : 'Erreur lors du chargement API';
            setApiKeys([]);
            setWebhooks([]);
            setApiKeysError(message);
            setWebhooksError(message);
            setError(message);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const createAPIKey = async () => {
        if (!newKeyName.trim()) return;
        try {
            setSaving(true);
            setError(null);
            const token = localStorage.getItem('token');
            const response = await fetch('/api/merchant/api-keys', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ keyName: newKeyName }),
            });

            if (!response.ok) {
                throw new Error('Creation de cle API impossible');
            }

            const data = await response.json();
            if (data?.apiKey?.key) {
                setNewlyCreatedKey(String(data.apiKey.key));
            }

            const createdKey = normalizeApiKey(data.apiKey || {});
            if (createdKey.id) {
                setApiKeys((prev) => [createdKey, ...prev]);
            }
            setShowNewKeyModal(false);
            setNewKeyName('');
        } catch (createError: unknown) {
            const message = createError instanceof Error ? createError.message : 'Erreur creation cle API';
            setError(message);
        } finally {
            setSaving(false);
        }
    };

    const revokeAPIKey = async (keyId: string) => {
        if (!confirm('Confirmer la revocation de cette cle API ?')) return;
        try {
            setError(null);
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/merchant/api-keys/${keyId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!response.ok) {
                throw new Error('Revocation impossible');
            }
            setApiKeys((prev) => prev.filter((key) => key.id !== keyId));
        } catch (revokeError: unknown) {
            const message = revokeError instanceof Error ? revokeError.message : 'Erreur revocation cle API';
            setError(message);
        }
    };

    const createWebhook = async () => {
        if (!newWebhookUrl.trim()) return;
        try {
            setSaving(true);
            setError(null);
            const token = localStorage.getItem('token');
            const response = await fetch('/api/merchant/webhooks', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ url: newWebhookUrl }),
            });

            if (!response.ok) {
                throw new Error('Creation webhook impossible');
            }

            const data = await response.json();
            const createdWebhook = normalizeWebhook(data.webhook || {});
            if (createdWebhook.id) {
                setWebhooks((prev) => [createdWebhook, ...prev]);
            }
            setShowNewWebhookModal(false);
            setNewWebhookUrl('');
        } catch (createError: unknown) {
            const message = createError instanceof Error ? createError.message : 'Erreur creation webhook';
            setError(message);
        } finally {
            setSaving(false);
        }
    };

    const deleteWebhook = async (webhookId: string) => {
        if (!confirm('Confirmer la suppression de ce webhook ?')) return;
        try {
            setError(null);
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/merchant/webhooks/${webhookId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });

            if (!response.ok) {
                throw new Error('Suppression webhook impossible');
            }

            setWebhooks((prev) => prev.filter((wh) => wh.id !== webhookId));
        } catch (deleteError: unknown) {
            const message = deleteError instanceof Error ? deleteError.message : 'Erreur suppression webhook';
            setError(message);
        }
    };

    const copyToClipboard = async (text: string, id: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedKey(id);
            setTimeout(() => setCopiedKey(null), 2000);
        } catch {
            setError('Copie impossible');
        }
    };

    const keyColumns = useMemo<BankTableColumn<APIKey>[]>(() => ([
        {
            key: 'keyName',
            header: 'Cle',
            sortable: true,
            render: (row) => (
                <div style={{ display: 'grid', gap: 4 }}>
                    <span style={{ fontWeight: 600 }}>{row.keyName || 'Sans nom'}</span>
                    <span className="bk-caption">{formatDateOrNever(row.createdAt || null)}</span>
                </div>
            ),
        },
        {
            key: 'apiKeyPrefix',
            header: 'Prefixe',
            render: (row) => (
                <code style={{ color: 'var(--bank-text-secondary)', fontSize: 'var(--bank-text-xs)' }}>
                    {row.apiKeyPrefix || 'N/A'}...
                </code>
            ),
        },
        {
            key: 'permissions',
            header: 'Permissions',
            render: (row) => (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', whiteSpace: 'normal' }}>
                    {row.permissions.length > 0 ? (
                        row.permissions.map((permission) => (
                            <BankBadge key={permission} variant="neutral" label={permission} />
                        ))
                    ) : (
                        <BankBadge variant="neutral" label="Aucune" />
                    )}
                </div>
            ),
        },
        {
            key: 'rateLimitPerMinute',
            header: 'Rate limit',
            align: 'right',
            sortable: true,
            render: (row) => `${row.rateLimitPerMinute} req/min`,
        },
        {
            key: 'lastUsedAt',
            header: 'Dernier usage',
            render: (row) => formatDateOrNever(row.lastUsedAt),
        },
        {
            key: 'isActive',
            header: 'Statut',
            align: 'center',
            render: (row) => (
                <BankBadge
                    variant={row.isActive ? 'success' : 'danger'}
                    label={row.isActive ? 'Actif' : 'Inactif'}
                    dot
                />
            ),
        },
        {
            key: 'actions',
            header: 'Actions',
            align: 'right',
            render: (row) => (
                <div style={{ display: 'inline-flex', gap: 'var(--bank-space-2)' }}>
                    <BankButton
                        variant="ghost"
                        size="sm"
                        onClick={() => void copyToClipboard(row.apiKeyPrefix, row.id)}
                        aria-label={`Copier ${row.keyName}`}
                    >
                        {copiedKey === row.id ? <CheckCircle2 size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
                    </BankButton>
                    <BankButton
                        variant="danger"
                        size="sm"
                        onClick={() => void revokeAPIKey(row.id)}
                        aria-label={`Revoquer ${row.keyName}`}
                    >
                        <Trash2 size={14} aria-hidden="true" />
                    </BankButton>
                </div>
            ),
        },
    ]), [copiedKey]);

    const webhookColumns = useMemo<BankTableColumn<WebhookConfig>[]>(() => ([
        {
            key: 'url',
            header: 'URL',
            render: (row) => (
                <a
                    href={row.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                        color: 'var(--bank-text-primary)',
                        textDecoration: 'none',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        whiteSpace: 'normal',
                        wordBreak: 'break-all',
                    }}
                >
                    {row.url}
                    <ExternalLink size={14} aria-hidden="true" />
                </a>
            ),
        },
        {
            key: 'events',
            header: 'Evenements',
            render: (row) => (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', whiteSpace: 'normal' }}>
                    {row.events.length > 0 ? row.events.map((eventName) => (
                        <BankBadge key={eventName} variant="accent" label={eventName} />
                    )) : (
                        <BankBadge variant="neutral" label="Aucun" />
                    )}
                </div>
            ),
        },
        {
            key: 'consecutiveFailures',
            header: 'Echecs',
            align: 'center',
            sortable: true,
            render: (row) => (
                row.consecutiveFailures > 0
                    ? <BankBadge variant="warning" label={`${row.consecutiveFailures}`} />
                    : <BankBadge variant="success" label="0" />
            ),
        },
        {
            key: 'lastTriggeredAt',
            header: 'Dernier envoi',
            render: (row) => formatDateOrNever(row.lastTriggeredAt),
        },
        {
            key: 'isActive',
            header: 'Statut',
            align: 'center',
            render: (row) => (
                <BankBadge
                    variant={row.isActive ? 'success' : 'danger'}
                    label={row.isActive ? 'Actif' : 'Inactif'}
                    dot
                />
            ),
        },
        {
            key: 'actions',
            header: 'Actions',
            align: 'right',
            render: (row) => (
                <BankButton
                    variant="danger"
                    size="sm"
                    onClick={() => void deleteWebhook(row.id)}
                    aria-label="Supprimer webhook"
                >
                    <Trash2 size={14} aria-hidden="true" />
                </BankButton>
            ),
        },
    ]), []);

    const totalActiveKeys = apiKeys.filter((key) => key.isActive).length;
    const totalActiveWebhooks = webhooks.filter((webhook) => webhook.isActive).length;
    const totalFailures = webhooks.reduce((sum, webhook) => sum + webhook.consecutiveFailures, 0);

    if (isLoading || loading) {
        return (
            <div style={{ minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <BankSpinner size={40} />
            </div>
        );
    }

    return (
        <div style={{ maxWidth: 1320, margin: '0 auto', padding: 'var(--bank-space-6)' }}>
            <div className="bk-caption" style={{ marginBottom: 'var(--bank-space-4)' }}>
                <Link href="/merchant" style={{ color: 'var(--bank-text-tertiary)', textDecoration: 'none' }}>Dashboard Marchand</Link>
                <ChevronRight size={12} style={{ display: 'inline', margin: '0 6px' }} />
                <span style={{ color: 'var(--bank-accent)' }}>API</span>
            </div>

            <BankPageHeader
                title="Integration API"
                subtitle="Gerer les cles d acces et les webhooks de votre systeme marchand."
                actions={(
                    <div style={{ display: 'flex', gap: 'var(--bank-space-2)', flexWrap: 'wrap' }}>
                        <BankButton variant="ghost" size="sm" onClick={() => void fetchAPIData()} loading={refreshing}>
                            Actualiser
                        </BankButton>
                        <BankButton size="sm" icon={Plus} onClick={() => setShowNewKeyModal(true)}>
                            Nouvelle cle
                        </BankButton>
                        <BankButton size="sm" variant="ghost" icon={Webhook} onClick={() => setShowNewWebhookModal(true)}>
                            Nouveau webhook
                        </BankButton>
                    </div>
                )}
            />

            {error && (
                <div
                    style={{
                        marginBottom: 'var(--bank-space-4)',
                        borderRadius: 'var(--bank-radius-lg)',
                        border: '1px solid color-mix(in srgb, var(--bank-danger) 30%, transparent)',
                        background: 'color-mix(in srgb, var(--bank-danger) 8%, transparent)',
                        color: 'var(--bank-danger)',
                        padding: 'var(--bank-space-4)',
                        fontSize: 'var(--bank-text-sm)',
                    }}
                >
                    {error}
                </div>
            )}

            {newlyCreatedKey && (
                <section className="bk-card" style={{ marginBottom: 'var(--bank-space-4)' }}>
                    <div style={{ display: 'grid', gap: 'var(--bank-space-3)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--bank-space-2)' }}>
                            <Shield size={16} aria-hidden="true" style={{ color: 'var(--bank-success)' }} />
                            <strong style={{ color: 'var(--bank-text-primary)' }}>Cle API creee</strong>
                        </div>
                        <p className="bk-caption" style={{ margin: 0 }}>
                            Copiez cette valeur maintenant. Elle ne sera plus affichee ensuite.
                        </p>
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 'var(--bank-space-2)',
                                background: 'var(--bank-bg-sunken)',
                                border: '1px solid var(--bank-border-subtle)',
                                borderRadius: 'var(--bank-radius-md)',
                                padding: 'var(--bank-space-3)',
                            }}
                        >
                            <code style={{ flex: 1, wordBreak: 'break-all', fontSize: 'var(--bank-text-xs)' }}>{newlyCreatedKey}</code>
                            <BankButton variant="ghost" size="sm" onClick={() => void copyToClipboard(newlyCreatedKey, 'new')}>
                                {copiedKey === 'new' ? <CheckCircle2 size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
                            </BankButton>
                            <BankButton variant="ghost" size="sm" onClick={() => setNewlyCreatedKey(null)}>
                                Fermer
                            </BankButton>
                        </div>
                    </div>
                </section>
            )}

            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                    gap: 'var(--bank-space-4)',
                    marginBottom: 'var(--bank-space-5)',
                }}
            >
                <StatCard label="Cles actives" value={apiKeysError ? 'Indisponible' : String(totalActiveKeys)} icon={Key} accent index={0} />
                <StatCard label="Webhooks actifs" value={webhooksError ? 'Indisponible' : String(totalActiveWebhooks)} icon={Webhook} index={1} />
                <StatCard label="Echecs webhook" value={webhooksError ? 'Indisponible' : String(totalFailures)} icon={AlertTriangle} index={2} />
            </div>

            <section style={{ marginBottom: 'var(--bank-space-5)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--bank-space-3)' }}>
                    <h2 style={{ margin: 0, fontSize: 'var(--bank-text-lg)', display: 'inline-flex', gap: 8, alignItems: 'center' }}>
                        <Key size={18} aria-hidden="true" />
                        Cles API
                    </h2>
                    <BankButton size="sm" icon={Plus} onClick={() => setShowNewKeyModal(true)}>
                        Creer une cle
                    </BankButton>
                </div>
                {apiKeysError ? (
                    <div className="bk-card">
                        <BankEmptyState
                            icon={<AlertTriangle size={20} aria-hidden="true" />}
                            title="Cles API indisponibles"
                            description={apiKeysError}
                            action={(
                                <BankButton size="sm" variant="ghost" onClick={() => void fetchAPIData()} loading={refreshing}>
                                    Reessayer
                                </BankButton>
                            )}
                        />
                    </div>
                ) : apiKeys.length === 0 ? (
                    <div className="bk-card">
                        <BankEmptyState
                            icon={<Key size={20} aria-hidden="true" />}
                            title="Aucune cle API"
                            description="Creez une premiere cle pour connecter votre backend marchand."
                            action={(
                                <BankButton size="sm" onClick={() => setShowNewKeyModal(true)}>
                                    Creer une cle
                                </BankButton>
                            )}
                        />
                    </div>
                ) : (
                    <BankTable
                        columns={keyColumns}
                        data={apiKeys}
                        rowKey={(row) => row.id}
                        caption="Liste des cles API marchand"
                        emptyTitle="Aucune cle"
                        emptyDesc="Aucune cle API disponible."
                    />
                )}
            </section>

            <section style={{ marginBottom: 'var(--bank-space-5)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--bank-space-3)' }}>
                    <h2 style={{ margin: 0, fontSize: 'var(--bank-text-lg)', display: 'inline-flex', gap: 8, alignItems: 'center' }}>
                        <Webhook size={18} aria-hidden="true" />
                        Webhooks
                    </h2>
                    <BankButton size="sm" icon={Plus} onClick={() => setShowNewWebhookModal(true)}>
                        Ajouter webhook
                    </BankButton>
                </div>
                {webhooksError ? (
                    <div className="bk-card">
                        <BankEmptyState
                            icon={<AlertTriangle size={20} aria-hidden="true" />}
                            title="Webhooks indisponibles"
                            description={webhooksError}
                            action={(
                                <BankButton size="sm" variant="ghost" onClick={() => void fetchAPIData()} loading={refreshing}>
                                    Reessayer
                                </BankButton>
                            )}
                        />
                    </div>
                ) : webhooks.length === 0 ? (
                    <div className="bk-card">
                        <BankEmptyState
                            icon={<Webhook size={20} aria-hidden="true" />}
                            title="Aucun webhook"
                            description="Configurez un endpoint pour recevoir les evenements de paiement."
                            action={(
                                <BankButton size="sm" onClick={() => setShowNewWebhookModal(true)}>
                                    Ajouter webhook
                                </BankButton>
                            )}
                        />
                    </div>
                ) : (
                    <BankTable
                        columns={webhookColumns}
                        data={webhooks}
                        rowKey={(row) => row.id}
                        caption="Liste des webhooks marchand"
                        emptyTitle="Aucun webhook"
                        emptyDesc="Aucune configuration webhook active."
                    />
                )}
            </section>

            <section className="bk-card">
                <h2 style={{ marginTop: 0, marginBottom: 'var(--bank-space-3)', fontSize: 'var(--bank-text-lg)' }}>
                    Documentation API
                </h2>
                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                        gap: 'var(--bank-space-3)',
                    }}
                >
                    <div style={{ padding: 'var(--bank-space-3)', background: 'var(--bank-bg-sunken)', borderRadius: 'var(--bank-radius-md)' }}>
                        <p className="bk-label-upper" style={{ margin: 0 }}>Authentification</p>
                        <code style={{ display: 'block', marginTop: 8, fontSize: 'var(--bank-text-xs)' }}>
                            Authorization: Bearer pmp_your_api_key
                        </code>
                    </div>
                    <div style={{ padding: 'var(--bank-space-3)', background: 'var(--bank-bg-sunken)', borderRadius: 'var(--bank-radius-md)' }}>
                        <p className="bk-label-upper" style={{ margin: 0 }}>Base URL</p>
                        <code style={{ display: 'block', marginTop: 8, fontSize: 'var(--bank-text-xs)' }}>
                            https://api.pmp.edu/v1
                        </code>
                    </div>
                    <div style={{ padding: 'var(--bank-space-3)', background: 'var(--bank-bg-sunken)', borderRadius: 'var(--bank-radius-md)' }}>
                        <p className="bk-label-upper" style={{ margin: 0 }}>Transactions</p>
                        <code style={{ display: 'block', marginTop: 8, fontSize: 'var(--bank-text-xs)' }}>
                            POST /transactions | GET /transactions
                        </code>
                    </div>
                </div>
                <div style={{ marginTop: 'var(--bank-space-3)' }}>
                    <a
                        href="/documentation"
                        style={{ color: 'var(--bank-accent)', textDecoration: 'none', display: 'inline-flex', gap: 6, alignItems: 'center' }}
                    >
                        Ouvrir la documentation complete
                        <ExternalLink size={14} aria-hidden="true" />
                    </a>
                </div>
            </section>

            <BankModal
                open={showNewKeyModal}
                onClose={() => setShowNewKeyModal(false)}
                title="Creer une nouvelle cle API"
                footer={(
                    <>
                        <BankButton variant="ghost" onClick={() => setShowNewKeyModal(false)}>
                            Annuler
                        </BankButton>
                        <BankButton onClick={() => void createAPIKey()} loading={saving} disabled={!newKeyName.trim()}>
                            Creer
                        </BankButton>
                    </>
                )}
            >
                <BankFormField
                    label="Nom de la cle"
                    placeholder="Production backend"
                    value={newKeyName}
                    onChange={(event) => setNewKeyName(event.target.value)}
                    hint="Cette cle sera utilisee pour signer les appels API."
                />
            </BankModal>

            <BankModal
                open={showNewWebhookModal}
                onClose={() => setShowNewWebhookModal(false)}
                title="Ajouter un webhook"
                footer={(
                    <>
                        <BankButton variant="ghost" onClick={() => setShowNewWebhookModal(false)}>
                            Annuler
                        </BankButton>
                        <BankButton onClick={() => void createWebhook()} loading={saving} disabled={!newWebhookUrl.trim()}>
                            Ajouter
                        </BankButton>
                    </>
                )}
            >
                <BankFormField
                    type="url"
                    label="URL endpoint"
                    placeholder="https://votre-domaine.com/webhook"
                    value={newWebhookUrl}
                    onChange={(event) => setNewWebhookUrl(event.target.value)}
                    hint="Evenements envoyes: transaction.approved et transaction.declined."
                />
            </BankModal>
        </div>
    );
}
