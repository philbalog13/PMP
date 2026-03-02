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
            <div style={{ minHeight: '100vh', background: 'var(--n-bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                    <Beaker style={{ width: '40px', height: '40px', color: 'var(--n-warning)', animation: 'bounce 1s infinite' }} />
                    <span style={{ fontSize: '13px', color: 'var(--n-text-tertiary)' }}>Chargement des conditions du lab...</span>
                </div>
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', background: 'var(--n-bg-secondary)', padding: '32px 24px' }}>
            {/* Toasts */}
            <div style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 50, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {toasts.map((toast) => (
                    <div key={toast.id} style={{
                        display: 'flex', alignItems: 'center', gap: '10px',
                        padding: '10px 16px', borderRadius: '8px', border: '1px solid',
                        background: toast.type === 'success' ? 'var(--n-success-bg)' : 'var(--n-accent-light)',
                        borderColor: toast.type === 'success' ? 'var(--n-success)' : 'var(--n-accent)',
                        color: toast.type === 'success' ? 'var(--n-success)' : 'var(--n-accent)',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '13px', fontWeight: 500
                    }}>
                        <CheckCircle2 size={16} />
                        <span>{toast.message}</span>
                        <button onClick={() => dismissToast(toast.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.6, marginLeft: '4px', display: 'flex' }}>
                            <X size={13} />
                        </button>
                    </div>
                ))}
            </div>

            <div style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>

                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div style={{ padding: '10px', background: 'var(--n-warning-bg)', borderRadius: '8px', border: '1px solid var(--n-warning)', display: 'flex' }}>
                            <Beaker style={{ width: '24px', height: '24px', color: 'var(--n-warning)' }} />
                        </div>
                        <div>
                            <h1 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--n-text-primary)', margin: 0 }}>Contrôle Laboratoire</h1>
                            <p style={{ color: 'var(--n-text-secondary)', fontSize: '13px', marginTop: '4px' }}>Injection de conditions d&apos;erreur pour tests pédagogiques</p>
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        <button onClick={() => { void refreshAll(); }} style={{
                            display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px',
                            background: 'var(--n-bg-primary)', border: '1px solid var(--n-border)',
                            borderRadius: '6px', cursor: 'pointer', fontSize: '13px', color: 'var(--n-text-primary)'
                        }}>
                            <RefreshCw style={{ width: '14px', height: '14px' }} /> Actualiser
                        </button>
                        {activeCount > 0 && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', background: 'var(--n-warning-bg)', border: '1px solid var(--n-warning)', borderRadius: '20px' }}>
                                <Zap style={{ width: '13px', height: '13px', color: 'var(--n-warning)' }} />
                                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--n-warning)' }}>{activeCount} condition{activeCount > 1 ? 's' : ''} active{activeCount > 1 ? 's' : ''}</span>
                            </div>
                        )}
                        {activeVulnerabilityCount > 0 && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', background: 'var(--n-danger-bg)', border: '1px solid var(--n-danger)', borderRadius: '20px' }}>
                                <AlertTriangle style={{ width: '13px', height: '13px', color: 'var(--n-danger)' }} />
                                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--n-danger)' }}>{activeVulnerabilityCount} vuln CTF active{activeVulnerabilityCount > 1 ? 's' : ''}</span>
                            </div>
                        )}
                    </div>
                </div>

                {error && (
                    <div style={{ padding: '12px 16px', background: 'var(--n-danger-bg)', border: '1px solid var(--n-danger)', borderRadius: '6px', fontSize: '13px', color: 'var(--n-danger)' }}>
                        {error}
                    </div>
                )}

                {/* Avertissement formateur */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '14px 16px', background: 'var(--n-warning-bg)', border: '1px solid var(--n-warning)', borderRadius: '8px' }}>
                    <AlertTriangle style={{ width: '16px', height: '16px', color: 'var(--n-warning)', flexShrink: 0, marginTop: '2px' }} />
                    <div style={{ fontSize: '13px' }}>
                        <p style={{ fontWeight: 600, color: 'var(--n-warning)', margin: '0 0 4px' }}>Mode Formateur Actif</p>
                        <p style={{ color: 'var(--n-text-secondary)', margin: 0 }}>Les conditions appliquées ici affectent les sessions de tous les étudiants connectés.</p>
                    </div>
                </div>

                {/* Grille contrôles */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                    <ControlCard title="Latence Réseau" icon={<Clock className="w-5 h-5" />} color="accent" active={conditions.latencyMs > 0}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                    <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--n-text-primary)' }}>Délai (ms)</label>
                                    <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--n-accent)' }}>{conditions.latencyMs} ms</span>
                                </div>
                                <input type="range" min="0" max="500" step="10" value={conditions.latencyMs}
                                    onChange={(e) => setConditions((prev) => ({ ...prev, latencyMs: Number(e.target.value) }))}
                                    style={{ width: '100%', accentColor: 'var(--n-accent)' }} />
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--n-text-tertiary)', marginTop: '4px' }}><span>0ms</span><span>500ms</span></div>
                            </div>
                            <p style={{ fontSize: '12px', color: 'var(--n-text-tertiary)', margin: 0 }}>Simule une connexion lente pour tester la résilience des applications.</p>
                        </div>
                    </ControlCard>

                    <ControlCard title="Échecs d'Authentification" icon={<Shield className="w-5 h-5" />} color="danger" active={conditions.authFailureRate > 0}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                    <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--n-text-primary)' }}>Taux d&apos;échec (%)</label>
                                    <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--n-danger)' }}>{conditions.authFailureRate}%</span>
                                </div>
                                <input type="range" min="0" max="100" step="5" value={conditions.authFailureRate}
                                    onChange={(e) => setConditions((prev) => ({ ...prev, authFailureRate: Number(e.target.value) }))}
                                    style={{ width: '100%', accentColor: 'var(--n-danger)' }} />
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--n-text-tertiary)', marginTop: '4px' }}><span>0%</span><span>100%</span></div>
                            </div>
                            <p style={{ fontSize: '12px', color: 'var(--n-text-tertiary)', margin: 0 }}>Simule des refus d&apos;autorisation aléatoires (05, 51, 54...).</p>
                        </div>
                    </ControlCard>

                    <ControlCard title="Latence HSM" icon={<Shield className="w-5 h-5" />} color="purple" active={conditions.hsmLatencyMs > 0}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                    <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--n-text-primary)' }}>Délai cryptographique (ms)</label>
                                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#9333ea' }}>{conditions.hsmLatencyMs} ms</span>
                                </div>
                                <input type="range" min="0" max="300" step="10" value={conditions.hsmLatencyMs}
                                    onChange={(e) => setConditions((prev) => ({ ...prev, hsmLatencyMs: Number(e.target.value) }))}
                                    style={{ width: '100%', accentColor: '#9333ea' }} />
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--n-text-tertiary)', marginTop: '4px' }}><span>0ms</span><span>300ms</span></div>
                            </div>
                            <p style={{ fontSize: '12px', color: 'var(--n-text-tertiary)', margin: 0 }}>Simule un HSM surchargé.</p>
                        </div>
                    </ControlCard>

                    <ControlCard title="Injection Fraude" icon={<AlertTriangle className="w-5 h-5" />} color="warning" active={conditions.fraudInjection}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--n-text-primary)' }}>Mode Fraude Actif</span>
                                <Toggle enabled={conditions.fraudInjection} color="var(--n-warning)" onToggle={() => setConditions((prev) => ({ ...prev, fraudInjection: !prev.fraudInjection }))} />
                            </div>
                            <p style={{ fontSize: '12px', color: 'var(--n-text-tertiary)', margin: 0 }}>Injecte des patterns détectables (velocity abuse, géolocalisation suspecte).</p>
                            {conditions.fraudInjection && (
                                <div style={{ padding: '10px 12px', background: 'var(--n-warning-bg)', border: '1px solid var(--n-warning)', borderRadius: '6px' }}>
                                    <p style={{ fontSize: '12px', color: 'var(--n-warning)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
                                        <AlertTriangle size={12} /> Actif: les étudiants verront des alertes de fraude
                                    </p>
                                </div>
                            )}
                        </div>
                    </ControlCard>
                </div>

                {/* Options avancées */}
                <div style={{ background: 'var(--n-bg-primary)', border: '1px solid var(--n-border)', borderRadius: '8px', padding: '20px 24px' }}>
                    <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--n-text-primary)', margin: '0 0 16px' }}>Options Avancées</h2>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                            <p style={{ fontWeight: 500, color: 'var(--n-text-primary)', margin: '0 0 3px', fontSize: '14px' }}>Erreurs Réseau Aléatoires</p>
                            <p style={{ fontSize: '12px', color: 'var(--n-text-tertiary)', margin: 0 }}>Simule des timeouts et connexions refusées.</p>
                        </div>
                        <Toggle enabled={conditions.networkErrors} color="var(--n-danger)" onToggle={() => setConditions((prev) => ({ ...prev, networkErrors: !prev.networkErrors }))} />
                    </div>
                </div>

                {/* CTF Vulnerability Controls */}
                <div style={{ background: 'var(--n-bg-primary)', border: '1px solid var(--n-danger)', borderRadius: '8px', padding: '20px 24px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
                        <div>
                            <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--n-danger)', margin: '0 0 4px' }}>CTF Vulnerability Controls</h2>
                            <p style={{ fontSize: '12px', color: 'var(--n-text-tertiary)', margin: 0 }}>Pilotage direct de VulnEngine HSM pour les challenges REPLAY/HSM.</p>
                        </div>
                        <button onClick={() => { void fetchCtfVulnerabilities(); }} style={{
                            display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px',
                            background: 'var(--n-bg-secondary)', border: '1px solid var(--n-border)',
                            borderRadius: '6px', cursor: 'pointer', fontSize: '12px', color: 'var(--n-text-secondary)'
                        }}>
                            <RefreshCw style={{ width: '13px', height: '13px' }} /> Lire état
                        </button>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                        <CtfToggleRow title="allowReplay" description="Autorise le rejeu d'une même transaction (room PAY-001)." enabled={ctfVulnerabilities.allowReplay} onToggle={() => setCtfVulnerabilities((prev) => ({ ...prev, allowReplay: !prev.allowReplay }))} />
                        <CtfToggleRow title="weakKeysEnabled" description="Active des clés faibles/prévisibles (room PCI-001)." enabled={ctfVulnerabilities.weakKeysEnabled} onToggle={() => setCtfVulnerabilities((prev) => ({ ...prev, weakKeysEnabled: !prev.weakKeysEnabled }))} />
                        <CtfToggleRow title="verboseErrors" description="Expose plus d'informations techniques dans les erreurs." enabled={ctfVulnerabilities.verboseErrors} onToggle={() => setCtfVulnerabilities((prev) => ({ ...prev, verboseErrors: !prev.verboseErrors }))} />
                        <CtfToggleRow title="keyLeakInLogs" description="Journalise du matériel sensible dans les logs (room PAY-001)." enabled={ctfVulnerabilities.keyLeakInLogs} onToggle={() => setCtfVulnerabilities((prev) => ({ ...prev, keyLeakInLogs: !prev.keyLeakInLogs }))} />
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button onClick={handleApplyCtfVulnerabilities} disabled={applyingCtfVulns} style={{
                            display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 18px',
                            background: 'var(--n-danger)', color: '#fff', borderRadius: '6px',
                            border: 'none', cursor: applyingCtfVulns ? 'not-allowed' : 'pointer',
                            fontWeight: 600, fontSize: '13px', opacity: applyingCtfVulns ? 0.6 : 1
                        }}>
                            {applyingCtfVulns ? <><div style={{ width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%' }} />Application...</> : <><Zap style={{ width: '14px', height: '14px' }} />Appliquer toggles CTF</>}
                        </button>
                        <button onClick={handleResetCtfVulnerabilities} disabled={applyingCtfVulns} style={{
                            display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 18px',
                            background: 'var(--n-bg-secondary)', border: '1px solid var(--n-border)',
                            borderRadius: '6px', cursor: 'pointer', fontWeight: 500, fontSize: '13px',
                            color: 'var(--n-text-primary)', opacity: applyingCtfVulns ? 0.6 : 1
                        }}>
                            <RefreshCw style={{ width: '14px', height: '14px' }} /> Reset CTF
                        </button>
                    </div>
                </div>

                {/* Boutons principaux */}
                <div style={{ display: 'flex', gap: '12px' }}>
                    <button onClick={handleApplyConditions} disabled={applying} style={{
                        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                        padding: '12px 24px', background: 'var(--n-success)', color: '#fff',
                        borderRadius: '8px', border: 'none', cursor: applying ? 'not-allowed' : 'pointer',
                        fontWeight: 700, fontSize: '15px', opacity: applying ? 0.6 : 1
                    }}>
                        {applying ? <><div style={{ width: '18px', height: '18px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%' }} />Application...</> : <><Zap style={{ width: '18px', height: '18px' }} />Appliquer les Conditions</>}
                    </button>
                    <button onClick={handleReset} disabled={applying} style={{
                        display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px',
                        background: 'var(--n-bg-primary)', border: '1px solid var(--n-border)',
                        borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '15px',
                        color: 'var(--n-text-primary)', opacity: applying ? 0.6 : 1
                    }}>
                        <RefreshCw style={{ width: '18px', height: '18px' }} /> Réinitialiser
                    </button>
                </div>

                {/* Cas d'usage */}
                <div style={{ padding: '16px 20px', background: 'var(--n-accent-light)', border: '1px solid var(--n-accent)', borderRadius: '8px' }}>
                    <h3 style={{ fontWeight: 600, color: 'var(--n-accent)', margin: '0 0 10px', fontSize: '14px' }}>Cas d&apos;usage pédagogiques</h3>
                    <ul style={{ margin: 0, paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <li style={{ fontSize: '13px', color: 'var(--n-text-secondary)' }}><strong>Latence 300ms</strong> - Gestion de timeout et retry logic</li>
                        <li style={{ fontSize: '13px', color: 'var(--n-text-secondary)' }}><strong>Échecs auth 20%</strong> - Lecture des codes de refus ISO 8583</li>
                        <li style={{ fontSize: '13px', color: 'var(--n-text-secondary)' }}><strong>Mode Fraude</strong> - Tests des détecteurs de patterns suspects</li>
                        <li style={{ fontSize: '13px', color: 'var(--n-text-secondary)' }}><strong>HSM lent</strong> - Impact des opérations cryptographiques</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}

function ControlCard({
    title, icon, color, active, children
}: {
    title: string; icon: ReactNode; color: string; active?: boolean; children: ReactNode;
}) {
    const colorMap: Record<string, { bg: string; border: string; text: string }> = {
        accent: { bg: 'var(--n-accent-light)', border: 'var(--n-accent)', text: 'var(--n-accent)' },
        danger: { bg: 'var(--n-danger-bg)', border: 'var(--n-danger)', text: 'var(--n-danger)' },
        warning: { bg: 'var(--n-warning-bg)', border: 'var(--n-warning)', text: 'var(--n-warning)' },
        purple: { bg: '#f5f3ff', border: '#9333ea', text: '#9333ea' },
    };
    const c = colorMap[color] || colorMap.accent;
    return (
        <div style={{
            background: 'var(--n-bg-primary)',
            border: `1px solid ${active ? c.border : 'var(--n-border)'}`,
            borderRadius: '8px', padding: '18px 20px',
            display: 'flex', flexDirection: 'column', gap: '14px'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ padding: '7px', background: c.bg, borderRadius: '6px', color: c.text, display: 'flex' }}>{icon}</div>
                    <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--n-text-primary)', margin: 0 }}>{title}</h3>
                </div>
                {active && (
                    <span style={{ fontSize: '10px', fontWeight: 700, padding: '3px 8px', borderRadius: '20px', background: 'var(--n-success-bg)', color: 'var(--n-success)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Actif</span>
                )}
            </div>
            {children}
        </div>
    );
}

function Toggle({ enabled, color, onToggle }: { enabled: boolean; color: string; onToggle: () => void }) {
    return (
        <button onClick={onToggle} style={{
            position: 'relative', width: '44px', height: '24px', flexShrink: 0,
            background: enabled ? color : 'var(--n-border)', border: 'none',
            borderRadius: '12px', cursor: 'pointer', transition: 'background 0.2s'
        }}>
            <span style={{
                position: 'absolute', top: '4px', left: enabled ? '24px' : '4px',
                width: '16px', height: '16px', background: '#fff',
                borderRadius: '50%', transition: 'left 0.2s'
            }} />
        </button>
    );
}

function CtfToggleRow({ title, description, enabled, onToggle }: { title: string; description: string; enabled: boolean; onToggle: () => void }) {
    return (
        <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px',
            background: 'var(--n-bg-secondary)', border: '1px solid var(--n-border)',
            borderRadius: '6px', padding: '10px 14px'
        }}>
            <div>
                <p style={{ fontFamily: 'monospace', fontSize: '13px', color: 'var(--n-text-primary)', margin: '0 0 2px' }}>{title}</p>
                <p style={{ fontSize: '12px', color: 'var(--n-text-tertiary)', margin: 0 }}>{description}</p>
            </div>
            <Toggle enabled={enabled} color="var(--n-danger)" onToggle={onToggle} />
        </div>
    );
}
