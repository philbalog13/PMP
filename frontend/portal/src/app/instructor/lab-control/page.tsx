'use client';

import { useState, useEffect, useCallback, type ReactNode } from 'react';
import Link from 'next/link';
import { Beaker, AlertTriangle, RefreshCw, Zap, Shield, Clock, ChevronRight, CheckCircle2, X } from 'lucide-react';

interface Toast {
    id: number;
    message: string;
    type: 'success' | 'info';
}

interface LabConditions {
    latencyMs: number;
    authFailureRate: number;
    fraudInjection: boolean;
    hsmLatencyMs: number;
    networkErrors: boolean;
}

interface CtfVulnerabilityControls {
    allowReplay: boolean;
    weakKeysEnabled: boolean;
    verboseErrors: boolean;
    keyLeakInLogs: boolean;
}

const DEFAULT_CONDITIONS: LabConditions = {
    latencyMs: 0,
    authFailureRate: 0,
    fraudInjection: false,
    hsmLatencyMs: 0,
    networkErrors: false,
};

const DEFAULT_CTF_VULNERABILITIES: CtfVulnerabilityControls = {
    allowReplay: false,
    weakKeysEnabled: false,
    verboseErrors: false,
    keyLeakInLogs: false,
};

export default function LabControlPage() {
    const [conditions, setConditions] = useState<LabConditions>(DEFAULT_CONDITIONS);
    const [ctfVulnerabilities, setCtfVulnerabilities] = useState<CtfVulnerabilityControls>(DEFAULT_CTF_VULNERABILITIES);
    const [toasts, setToasts] = useState<Toast[]>([]);
    const [loading, setLoading] = useState(true);
    const [applying, setApplying] = useState(false);
    const [applyingCtfVulns, setApplyingCtfVulns] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const showToast = useCallback((message: string, type: 'success' | 'info' = 'success') => {
        const id = Date.now();
        setToasts((prev) => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts((prev) => prev.filter((toast) => toast.id !== id));
        }, 3500);
    }, []);

    const dismissToast = (id: number) => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
    };

    const readToken = () => localStorage.getItem('token');

    const normalizeConditions = useCallback((payload: Record<string, unknown> | null | undefined): LabConditions => {
        const latencyMs = Number(payload?.latencyMs ?? payload?.latency ?? 0);
        const authFailureRate = Number(payload?.authFailureRate ?? payload?.authFailRate ?? 0);
        const hsmLatencyMs = Number(payload?.hsmLatencyMs ?? payload?.hsmLatency ?? 0);

        return {
            latencyMs: Number.isFinite(latencyMs) ? latencyMs : 0,
            authFailureRate: Number.isFinite(authFailureRate) ? authFailureRate : 0,
            fraudInjection: Boolean(payload?.fraudInjection),
            hsmLatencyMs: Number.isFinite(hsmLatencyMs) ? hsmLatencyMs : 0,
            networkErrors: Boolean(payload?.networkErrors),
        };
    }, []);

    const normalizeCtfVulnerabilities = useCallback((payload: Record<string, unknown> | null | undefined): CtfVulnerabilityControls => ({
        allowReplay: Boolean(payload?.allowReplay),
        weakKeysEnabled: Boolean(payload?.weakKeysEnabled),
        verboseErrors: Boolean(payload?.verboseErrors),
        keyLeakInLogs: Boolean(payload?.keyLeakInLogs),
    }), []);

    const fetchConditions = useCallback(async () => {
        const token = readToken();
        if (!token) {
            setError('Session introuvable.');
            setLoading(false);
            return;
        }

        try {
            setError(null);
            const response = await fetch('/api/progress/lab/conditions', {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (!response.ok) {
                throw new Error(`Erreur API (${response.status})`);
            }

            const data = await response.json();
            setConditions(normalizeConditions(data.conditions));
        } catch (err: any) {
            setError(err.message || 'Impossible de charger les conditions du lab.');
        } finally {
            setLoading(false);
        }
    }, [normalizeConditions]);

    const fetchCtfVulnerabilities = useCallback(async () => {
        const token = readToken();
        if (!token) {
            setError('Session introuvable.');
            return;
        }

        try {
            setError(null);
            const response = await fetch('/api/hsm/config', {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                throw new Error(`Erreur API (${response.status})`);
            }

            const data = await response.json();
            setCtfVulnerabilities(normalizeCtfVulnerabilities(data.vulnerabilities));
        } catch (err: any) {
            setError(err.message || 'Impossible de charger la config VulnEngine CTF.');
        }
    }, [normalizeCtfVulnerabilities]);

    const refreshAll = useCallback(async () => {
        await Promise.all([fetchConditions(), fetchCtfVulnerabilities()]);
    }, [fetchConditions, fetchCtfVulnerabilities]);

    useEffect(() => {
        void refreshAll();
    }, [refreshAll]);

    const activeCount = [
        conditions.latencyMs > 0,
        conditions.authFailureRate > 0,
        conditions.fraudInjection,
        conditions.hsmLatencyMs > 0,
        conditions.networkErrors,
    ].filter(Boolean).length;

    const activeVulnerabilityCount = [
        ctfVulnerabilities.allowReplay,
        ctfVulnerabilities.weakKeysEnabled,
        ctfVulnerabilities.verboseErrors,
        ctfVulnerabilities.keyLeakInLogs,
    ].filter(Boolean).length;

    const handleApplyConditions = async () => {
        const token = readToken();
        if (!token) {
            showToast('Session expiree, reconnectez-vous.', 'info');
            return;
        }

        setApplying(true);

        try {
            setError(null);
            const response = await fetch('/api/progress/lab/conditions', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(conditions)
            });

            if (!response.ok) {
                throw new Error(`Erreur API (${response.status})`);
            }

            const data = await response.json();
            setConditions(normalizeConditions(data.conditions));
            showToast(`${activeCount} condition${activeCount !== 1 ? 's' : ''} appliquee${activeCount !== 1 ? 's' : ''} avec succes`);
        } catch (err: any) {
            setError(err.message || 'Erreur lors de la mise a jour des conditions.');
            showToast('Application des conditions echouee', 'info');
        } finally {
            setApplying(false);
        }
    };

    const handleReset = async () => {
        const token = readToken();
        if (!token) {
            showToast('Session expiree, reconnectez-vous.', 'info');
            return;
        }

        setApplying(true);

        try {
            setError(null);
            const response = await fetch('/api/progress/lab/conditions/reset', {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` }
            });

            if (!response.ok) {
                throw new Error(`Erreur API (${response.status})`);
            }

            const data = await response.json();
            setConditions(normalizeConditions(data.conditions));
            showToast('Environnement reinitialise', 'info');
        } catch (err: any) {
            setError(err.message || 'Erreur lors de la reinitialisation.');
            showToast('Reinitialisation echouee', 'info');
        } finally {
            setApplying(false);
        }
    };

    const handleApplyCtfVulnerabilities = async () => {
        const token = readToken();
        if (!token) {
            showToast('Session expiree, reconnectez-vous.', 'info');
            return;
        }

        setApplyingCtfVulns(true);

        try {
            setError(null);
            const response = await fetch('/api/hsm/config', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    vulnerabilities: ctfVulnerabilities,
                }),
            });

            if (!response.ok) {
                throw new Error(`Erreur API (${response.status})`);
            }

            const data = await response.json();
            setCtfVulnerabilities(normalizeCtfVulnerabilities(data.vulnerabilities));
            showToast(`${activeVulnerabilityCount} toggle${activeVulnerabilityCount > 1 ? 's' : ''} CTF applique${activeVulnerabilityCount > 1 ? 's' : ''}`);
        } catch (err: any) {
            setError(err.message || 'Erreur lors de la mise a jour des toggles CTF.');
            showToast('Application des toggles CTF echouee', 'info');
        } finally {
            setApplyingCtfVulns(false);
        }
    };

    const handleResetCtfVulnerabilities = async () => {
        const token = readToken();
        if (!token) {
            showToast('Session expiree, reconnectez-vous.', 'info');
            return;
        }

        setApplyingCtfVulns(true);

        try {
            setError(null);
            const response = await fetch('/api/hsm/config', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    vulnerabilities: DEFAULT_CTF_VULNERABILITIES,
                }),
            });

            if (!response.ok) {
                throw new Error(`Erreur API (${response.status})`);
            }

            const data = await response.json();
            setCtfVulnerabilities(normalizeCtfVulnerabilities(data.vulnerabilities));
            showToast('Toggles CTF reinitialises', 'info');
        } catch (err: any) {
            setError(err.message || 'Erreur lors de la reinitialisation des toggles CTF.');
            showToast('Reinitialisation toggles CTF echouee', 'info');
        } finally {
            setApplyingCtfVulns(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
                <div className="flex flex-col items-center gap-4">
                    <Beaker className="animate-bounce w-12 h-12 text-orange-500" />
                    <span className="text-sm text-slate-500">Chargement des conditions du lab...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 text-white pt-24 pb-12 px-6">
            <div className="fixed top-20 right-6 z-50 flex flex-col gap-2">
                {toasts.map((toast) => (
                    <div
                        key={toast.id}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg animate-in slide-in-from-right backdrop-blur-sm ${
                            toast.type === 'success'
                                ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300'
                                : 'bg-blue-500/20 border-blue-500/30 text-blue-300'
                        }`}
                    >
                        <CheckCircle2 size={18} />
                        <span className="text-sm font-medium">{toast.message}</span>
                        <button onClick={() => dismissToast(toast.id)} className="ml-2 opacity-60 hover:opacity-100">
                            <X size={14} />
                        </button>
                    </div>
                ))}
            </div>

            <div className="max-w-5xl mx-auto space-y-8">
                <div className="text-xs text-slate-500">
                    <Link href="/instructor" className="hover:text-blue-400">Dashboard</Link>
                    <ChevronRight size={12} className="inline mx-1" />
                    <span className="text-blue-400">Controle Lab</span>
                </div>

                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-orange-500/20 rounded-xl border border-orange-500/30">
                            <Beaker className="w-7 h-7 text-orange-400" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold">Controle Laboratoire</h1>
                            <p className="text-slate-400 mt-1">
                                Injection de conditions d&apos;erreur pour tests pedagogiques
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => {
                                void refreshAll();
                            }}
                            className="px-4 py-2 bg-slate-800 rounded-xl font-medium hover:bg-slate-700 transition flex items-center gap-2"
                        >
                            <RefreshCw className="w-4 h-4" />
                            Actualiser
                        </button>
                        {activeCount > 0 && (
                            <div className="flex items-center gap-2 px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-full">
                                <Zap className="w-4 h-4 text-amber-400" />
                                <span className="text-xs font-bold text-amber-400">
                                    {activeCount} condition{activeCount > 1 ? 's' : ''} active{activeCount > 1 ? 's' : ''}
                                </span>
                            </div>
                        )}
                        {activeVulnerabilityCount > 0 && (
                            <div className="flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-full">
                                <AlertTriangle className="w-4 h-4 text-red-300" />
                                <span className="text-xs font-bold text-red-300">
                                    {activeVulnerabilityCount} vuln CTF active{activeVulnerabilityCount > 1 ? 's' : ''}
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-xl text-sm text-red-300">
                        {error}
                    </div>
                )}

                <div className="bg-orange-500/10 border border-orange-500/30 p-4 rounded-xl flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
                    <div className="text-sm">
                        <p className="font-bold text-orange-400">Mode Formateur Actif</p>
                        <p className="text-slate-300 mt-1">
                            Les conditions appliquees ici affectent les sessions de tous les etudiants connectes.
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <ControlCard
                        title="Latence Reseau"
                        icon={<Clock className="w-6 h-6" />}
                        color="blue"
                        active={conditions.latencyMs > 0}
                    >
                        <div className="space-y-4">
                            <div>
                                <div className="flex justify-between mb-2">
                                    <label className="text-sm font-medium">Delai (ms)</label>
                                    <span className="text-sm font-bold text-blue-400">{conditions.latencyMs} ms</span>
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max="500"
                                    step="10"
                                    value={conditions.latencyMs}
                                    onChange={(e) => setConditions((prev) => ({ ...prev, latencyMs: Number(e.target.value) }))}
                                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                                />
                                <div className="flex justify-between text-xs text-slate-500 mt-1">
                                    <span>0ms</span>
                                    <span>500ms</span>
                                </div>
                            </div>
                            <p className="text-xs text-slate-400">Simule une connexion lente pour tester la resilience des applications.</p>
                        </div>
                    </ControlCard>

                    <ControlCard
                        title="Echecs d'Authentification"
                        icon={<Shield className="w-6 h-6" />}
                        color="red"
                        active={conditions.authFailureRate > 0}
                    >
                        <div className="space-y-4">
                            <div>
                                <div className="flex justify-between mb-2">
                                    <label className="text-sm font-medium">Taux d&apos;echec (%)</label>
                                    <span className="text-sm font-bold text-red-400">{conditions.authFailureRate}%</span>
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    step="5"
                                    value={conditions.authFailureRate}
                                    onChange={(e) => setConditions((prev) => ({ ...prev, authFailureRate: Number(e.target.value) }))}
                                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                                />
                                <div className="flex justify-between text-xs text-slate-500 mt-1">
                                    <span>0%</span>
                                    <span>100%</span>
                                </div>
                            </div>
                            <p className="text-xs text-slate-400">Simule des refus d&apos;autorisation aleatoires (05, 51, 54...).</p>
                        </div>
                    </ControlCard>

                    <ControlCard
                        title="Latence HSM"
                        icon={<Shield className="w-6 h-6" />}
                        color="purple"
                        active={conditions.hsmLatencyMs > 0}
                    >
                        <div className="space-y-4">
                            <div>
                                <div className="flex justify-between mb-2">
                                    <label className="text-sm font-medium">Delai cryptographique (ms)</label>
                                    <span className="text-sm font-bold text-purple-400">{conditions.hsmLatencyMs} ms</span>
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max="300"
                                    step="10"
                                    value={conditions.hsmLatencyMs}
                                    onChange={(e) => setConditions((prev) => ({ ...prev, hsmLatencyMs: Number(e.target.value) }))}
                                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                                />
                                <div className="flex justify-between text-xs text-slate-500 mt-1">
                                    <span>0ms</span>
                                    <span>300ms</span>
                                </div>
                            </div>
                            <p className="text-xs text-slate-400">Simule un HSM surcharge.</p>
                        </div>
                    </ControlCard>

                    <ControlCard
                        title="Injection Fraude"
                        icon={<AlertTriangle className="w-6 h-6" />}
                        color="yellow"
                        active={conditions.fraudInjection}
                    >
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">Mode Fraude Actif</span>
                                <button
                                    onClick={() => setConditions((prev) => ({ ...prev, fraudInjection: !prev.fraudInjection }))}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                                        conditions.fraudInjection ? 'bg-yellow-500' : 'bg-slate-700'
                                    }`}
                                >
                                    <span
                                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                                            conditions.fraudInjection ? 'translate-x-6' : 'translate-x-1'
                                        }`}
                                    />
                                </button>
                            </div>
                            <p className="text-xs text-slate-400">Injecte des patterns detectables (velocity abuse, geolocalisation suspecte).</p>
                            {conditions.fraudInjection && (
                                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
                                    <p className="text-xs text-yellow-400 font-bold flex items-center gap-2">
                                        <AlertTriangle size={14} />
                                        Actif: les etudiants verront des alertes de fraude
                                    </p>
                                </div>
                            )}
                        </div>
                    </ControlCard>
                </div>

                <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-6 space-y-4">
                    <h2 className="text-xl font-bold">Options Avancees</h2>

                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-medium">Erreurs Reseau Aleatoires</p>
                            <p className="text-xs text-slate-400 mt-1">
                                Simule des timeouts et connexions refusees.
                            </p>
                        </div>
                        <button
                            onClick={() => setConditions((prev) => ({ ...prev, networkErrors: !prev.networkErrors }))}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                                conditions.networkErrors ? 'bg-red-500' : 'bg-slate-700'
                            }`}
                        >
                            <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                                    conditions.networkErrors ? 'translate-x-6' : 'translate-x-1'
                                }`}
                            />
                        </button>
                    </div>
                </div>

                <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-6 space-y-4">
                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <h2 className="text-xl font-bold">CTF Vulnerability Controls</h2>
                            <p className="text-xs text-slate-400 mt-1">
                                Pilotage direct de VulnEngine HSM pour les challenges REPLAY/HSM.
                            </p>
                        </div>
                        <button
                            onClick={() => {
                                void fetchCtfVulnerabilities();
                            }}
                            className="px-3 py-2 bg-slate-800 rounded-lg text-xs hover:bg-slate-700 transition flex items-center gap-2"
                        >
                            <RefreshCw className="w-4 h-4" />
                            Lire etat
                        </button>
                    </div>

                    <div className="space-y-3">
                        <CtfToggleRow
                            title="allowReplay"
                            description="Autorise le rejeu d'une meme transaction (room PAY-001)."
                            enabled={ctfVulnerabilities.allowReplay}
                            onToggle={() => setCtfVulnerabilities((prev) => ({ ...prev, allowReplay: !prev.allowReplay }))}
                        />
                        <CtfToggleRow
                            title="weakKeysEnabled"
                            description="Active des cles faibles/predictibles (room PCI-001)."
                            enabled={ctfVulnerabilities.weakKeysEnabled}
                            onToggle={() => setCtfVulnerabilities((prev) => ({ ...prev, weakKeysEnabled: !prev.weakKeysEnabled }))}
                        />
                        <CtfToggleRow
                            title="verboseErrors"
                            description="Expose plus d'informations techniques dans les erreurs."
                            enabled={ctfVulnerabilities.verboseErrors}
                            onToggle={() => setCtfVulnerabilities((prev) => ({ ...prev, verboseErrors: !prev.verboseErrors }))}
                        />
                        <CtfToggleRow
                            title="keyLeakInLogs"
                            description="Journalise du materiel sensible dans les logs (room PAY-001)."
                            enabled={ctfVulnerabilities.keyLeakInLogs}
                            onToggle={() => setCtfVulnerabilities((prev) => ({ ...prev, keyLeakInLogs: !prev.keyLeakInLogs }))}
                        />
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={handleApplyCtfVulnerabilities}
                            disabled={applyingCtfVulns}
                            className="px-5 py-2.5 bg-red-600 rounded-xl font-bold hover:bg-red-500 transition flex items-center gap-2 text-sm disabled:opacity-60"
                        >
                            {applyingCtfVulns ? (
                                <>
                                    <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Application...
                                </>
                            ) : (
                                <>
                                    <Zap className="w-4 h-4" />
                                    Appliquer toggles CTF
                                </>
                            )}
                        </button>
                        <button
                            onClick={handleResetCtfVulnerabilities}
                            disabled={applyingCtfVulns}
                            className="px-5 py-2.5 bg-slate-800 rounded-xl font-bold hover:bg-slate-700 transition flex items-center gap-2 text-sm disabled:opacity-60"
                        >
                            <RefreshCw className="w-4 h-4" />
                            Reset CTF
                        </button>
                    </div>
                </div>

                <div className="flex gap-4">
                    <button
                        onClick={handleApplyConditions}
                        disabled={applying}
                        className="flex-1 px-8 py-4 bg-emerald-600 rounded-2xl font-bold hover:bg-emerald-500 transition flex items-center justify-center gap-2 disabled:opacity-60"
                    >
                        {applying ? (
                            <>
                                <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Application...
                            </>
                        ) : (
                            <>
                                <Zap className="w-5 h-5" />
                                Appliquer les Conditions
                            </>
                        )}
                    </button>
                    <button
                        onClick={handleReset}
                        disabled={applying}
                        className="px-8 py-4 bg-slate-800 rounded-2xl font-bold hover:bg-slate-700 transition flex items-center gap-2 disabled:opacity-60"
                    >
                        <RefreshCw className="w-5 h-5" />
                        Reinitialiser
                    </button>
                </div>

                <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-6">
                    <h3 className="font-bold text-blue-400 mb-2">Cas d&apos;usage pedagogiques</h3>
                    <ul className="space-y-2 text-sm text-slate-300">
                        <li><strong>Latence 300ms</strong> - Gestion de timeout et retry logic</li>
                        <li><strong>Echecs auth 20%</strong> - Lecture des codes de refus ISO 8583</li>
                        <li><strong>Mode Fraude</strong> - Tests des detecteurs de patterns suspects</li>
                        <li><strong>HSM lent</strong> - Impact des operations cryptographiques</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}

function ControlCard({
    title,
    icon,
    color,
    active,
    children,
}: {
    title: string;
    icon: ReactNode;
    color: string;
    active?: boolean;
    children: ReactNode;
}) {
    const colors: Record<string, string> = {
        blue: 'bg-blue-500/20 border-blue-500/30 text-blue-400',
        red: 'bg-red-500/20 border-red-500/30 text-red-400',
        purple: 'bg-purple-500/20 border-purple-500/30 text-purple-400',
        yellow: 'bg-yellow-500/20 border-yellow-500/30 text-yellow-400',
    };

    return (
        <div className={`bg-slate-900/60 border rounded-2xl p-6 space-y-4 transition ${
            active ? 'border-white/20' : 'border-white/10'
        }`}>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg border ${colors[color]}`}>{icon}</div>
                    <h3 className="text-lg font-bold">{title}</h3>
                </div>
                {active && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 uppercase tracking-wider">
                        Actif
                    </span>
                )}
            </div>
            {children}
        </div>
    );
}

function CtfToggleRow({
    title,
    description,
    enabled,
    onToggle,
}: {
    title: string;
    description: string;
    enabled: boolean;
    onToggle: () => void;
}) {
    return (
        <div className="rounded-xl border border-white/10 bg-slate-900/70 p-3 flex items-center justify-between gap-3">
            <div>
                <p className="font-mono text-sm text-slate-100">{title}</p>
                <p className="text-xs text-slate-400 mt-0.5">{description}</p>
            </div>
            <button
                onClick={onToggle}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                    enabled ? 'bg-red-500' : 'bg-slate-700'
                }`}
            >
                <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                        enabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                />
            </button>
        </div>
    );
}
