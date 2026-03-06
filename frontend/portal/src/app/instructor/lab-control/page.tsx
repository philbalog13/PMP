'use client';

import { useCallback, useEffect, useId, useMemo, useState } from 'react';
import { AlertTriangle, Beaker, RefreshCw, Shield, Zap } from 'lucide-react';
import {
  NotionButton,
  NotionCard,
  NotionPill,
  NotionProgress,
  NotionSkeleton,
  useNotionToast,
} from '@shared/components/notion';

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

function readToken() {
  return localStorage.getItem('token');
}

export default function LabControlPage() {
  const { pushToast } = useNotionToast();

  const [conditions, setConditions] = useState<LabConditions>(DEFAULT_CONDITIONS);
  const [ctfVulnerabilities, setCtfVulnerabilities] = useState<CtfVulnerabilityControls>(DEFAULT_CTF_VULNERABILITIES);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [applyingConditions, setApplyingConditions] = useState(false);
  const [applyingCtf, setApplyingCtf] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const normalizeCtfVulnerabilities = useCallback(
    (payload: Record<string, unknown> | null | undefined): CtfVulnerabilityControls => ({
      allowReplay: Boolean(payload?.allowReplay),
      weakKeysEnabled: Boolean(payload?.weakKeysEnabled),
      verboseErrors: Boolean(payload?.verboseErrors),
      keyLeakInLogs: Boolean(payload?.keyLeakInLogs),
    }),
    []
  );

  const fetchConditions = useCallback(async () => {
    const token = readToken();
    if (!token) {
      setError('Session introuvable');
      return;
    }

    const response = await fetch('/api/progress/lab/conditions', {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      throw new Error(`Erreur API (${response.status})`);
    }

    const payload = await response.json();
    setConditions(normalizeConditions(payload.conditions));
  }, [normalizeConditions]);

  const fetchCtfVulnerabilities = useCallback(async () => {
    const token = readToken();
    if (!token) {
      setError('Session introuvable');
      return;
    }

    const response = await fetch('/api/hsm/config', {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      throw new Error(`Erreur API (${response.status})`);
    }

    const payload = await response.json();
    setCtfVulnerabilities(normalizeCtfVulnerabilities(payload.vulnerabilities));
  }, [normalizeCtfVulnerabilities]);

  const refreshAll = useCallback(async () => {
    try {
      setError(null);
      setRefreshing(true);
      await Promise.all([fetchConditions(), fetchCtfVulnerabilities()]);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Impossible de charger les conditions du lab';
      setError(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [fetchConditions, fetchCtfVulnerabilities]);

  useEffect(() => {
    void refreshAll();
  }, [refreshAll]);

  const activeCount = useMemo(
    () =>
      [
        conditions.latencyMs > 0,
        conditions.authFailureRate > 0,
        conditions.fraudInjection,
        conditions.hsmLatencyMs > 0,
        conditions.networkErrors,
      ].filter(Boolean).length,
    [conditions]
  );

  const activeVulnerabilityCount = useMemo(
    () =>
      [
        ctfVulnerabilities.allowReplay,
        ctfVulnerabilities.weakKeysEnabled,
        ctfVulnerabilities.verboseErrors,
        ctfVulnerabilities.keyLeakInLogs,
      ].filter(Boolean).length,
    [ctfVulnerabilities]
  );

  const handleApplyConditions = useCallback(async () => {
    const token = readToken();
    if (!token) {
      pushToast({ variant: 'error', title: 'Session invalide' });
      return;
    }

    try {
      setError(null);
      setApplyingConditions(true);

      const response = await fetch('/api/progress/lab/conditions', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(conditions),
      });

      if (!response.ok) throw new Error(`Erreur API (${response.status})`);

      const payload = await response.json();
      setConditions(normalizeConditions(payload.conditions));
      pushToast({
        variant: 'success',
        title: 'Conditions appliquees',
        message: `${activeCount} condition${activeCount > 1 ? 's' : ''} active${activeCount > 1 ? 's' : ''}`,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Application des conditions echouee';
      setError(message);
      pushToast({ variant: 'error', title: 'Echec application', message });
    } finally {
      setApplyingConditions(false);
    }
  }, [activeCount, conditions, normalizeConditions, pushToast]);

  const handleResetConditions = useCallback(async () => {
    const token = readToken();
    if (!token) {
      pushToast({ variant: 'error', title: 'Session invalide' });
      return;
    }

    try {
      setError(null);
      setApplyingConditions(true);

      const response = await fetch('/api/progress/lab/conditions/reset', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error(`Erreur API (${response.status})`);

      const payload = await response.json();
      setConditions(normalizeConditions(payload.conditions));
      pushToast({ variant: 'info', title: 'Conditions reinitialisees' });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Reset impossible';
      setError(message);
      pushToast({ variant: 'error', title: 'Reset echoue', message });
    } finally {
      setApplyingConditions(false);
    }
  }, [normalizeConditions, pushToast]);

  const handleApplyCtf = useCallback(async () => {
    const token = readToken();
    if (!token) {
      pushToast({ variant: 'error', title: 'Session invalide' });
      return;
    }

    try {
      setError(null);
      setApplyingCtf(true);

      const response = await fetch('/api/hsm/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ vulnerabilities: ctfVulnerabilities }),
      });

      if (!response.ok) throw new Error(`Erreur API (${response.status})`);

      const payload = await response.json();
      setCtfVulnerabilities(normalizeCtfVulnerabilities(payload.vulnerabilities));
      pushToast({
        variant: 'success',
        title: 'Toggles CTF appliques',
        message: `${activeVulnerabilityCount} vulnerability toggle${activeVulnerabilityCount > 1 ? 's' : ''} actif${activeVulnerabilityCount > 1 ? 's' : ''}`,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Application CTF impossible';
      setError(message);
      pushToast({ variant: 'error', title: 'Echec CTF toggle', message });
    } finally {
      setApplyingCtf(false);
    }
  }, [activeVulnerabilityCount, ctfVulnerabilities, normalizeCtfVulnerabilities, pushToast]);

  const handleResetCtf = useCallback(async () => {
    const token = readToken();
    if (!token) {
      pushToast({ variant: 'error', title: 'Session invalide' });
      return;
    }

    try {
      setError(null);
      setApplyingCtf(true);

      const response = await fetch('/api/hsm/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ vulnerabilities: DEFAULT_CTF_VULNERABILITIES }),
      });

      if (!response.ok) throw new Error(`Erreur API (${response.status})`);

      const payload = await response.json();
      setCtfVulnerabilities(normalizeCtfVulnerabilities(payload.vulnerabilities));
      pushToast({ variant: 'info', title: 'Toggles CTF reinitialises' });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Reset CTF impossible';
      setError(message);
      pushToast({ variant: 'error', title: 'Reset CTF echoue', message });
    } finally {
      setApplyingCtf(false);
    }
  }, [normalizeCtfVulnerabilities, pushToast]);

  if (loading) {
    return (
      <div className="n-page-container" style={{ maxWidth: '1200px' }}>
        <NotionSkeleton type="line" width="220px" height="28px" />
        <div style={{ marginTop: 'var(--n-space-2)' }}>
          <NotionSkeleton type="line" width="360px" height="14px" />
        </div>
        <div
          style={{
            marginTop: 'var(--n-space-6)',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: 'var(--n-space-3)',
          }}
        >
          {[...Array(4)].map((_, index) => (
            <NotionSkeleton key={index} type="card" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="n-page-container" style={{ maxWidth: '1200px' }}>
      <NotionCard padding="lg">
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 'var(--n-space-4)',
            alignItems: 'center',
          }}
        >
          <div>
            <NotionPill variant="warning" icon={<Beaker size={12} />}>
              Laboratoire pedagogique
            </NotionPill>
            <h1
              style={{
                margin: 'var(--n-space-3) 0 var(--n-space-2)',
                color: 'var(--n-text-primary)',
                fontSize: 'var(--n-text-2xl)',
                fontWeight: 'var(--n-weight-bold)',
              }}
            >
              Controle laboratoire
            </h1>
            <p style={{ margin: 0, color: 'var(--n-text-secondary)', fontSize: 'var(--n-text-sm)' }}>
              Injectez des perturbations realismes pour entrainer la cohorte sur incidents monétiques.
            </p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--n-space-2)', flexWrap: 'wrap' }}>
            <NotionButton variant="secondary" leftIcon={<RefreshCw size={13} />} loading={refreshing} onClick={() => void refreshAll()}>
              Actualiser
            </NotionButton>
            <NotionPill variant={activeCount > 0 ? 'warning' : 'default'} icon={<Zap size={11} />}>
              {activeCount} condition{activeCount > 1 ? 's' : ''} active{activeCount > 1 ? 's' : ''}
            </NotionPill>
            <NotionPill variant={activeVulnerabilityCount > 0 ? 'danger' : 'default'} icon={<Shield size={11} />}>
              {activeVulnerabilityCount} toggle CTF
            </NotionPill>
          </div>
        </div>
      </NotionCard>

      {error && (
        <div
          style={{
            marginTop: 'var(--n-space-4)',
            padding: 'var(--n-space-3) var(--n-space-4)',
            borderRadius: 'var(--n-radius-sm)',
            border: '1px solid var(--n-danger-border)',
            background: 'var(--n-danger-bg)',
            color: 'var(--n-danger)',
            fontSize: 'var(--n-text-sm)',
            display: 'flex',
            gap: 'var(--n-space-2)',
            alignItems: 'center',
          }}
        >
          <AlertTriangle size={14} /> {error}
        </div>
      )}

      <div
        style={{
          marginTop: 'var(--n-space-4)',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: 'var(--n-space-3)',
        }}
      >
        <NotionCard padding="md">
          <h2 style={{ margin: '0 0 var(--n-space-3)', color: 'var(--n-text-primary)', fontSize: 'var(--n-text-base)' }}>Conditions runtime</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--n-space-3)' }}>
            <RangeControl
              label="Latence reseau"
              value={conditions.latencyMs}
              min={0}
              max={500}
              step={10}
              suffix="ms"
              accent="var(--n-accent)"
              onChange={(value) => setConditions((prev) => ({ ...prev, latencyMs: value }))}
            />
            <RangeControl
              label="Echec authentification"
              value={conditions.authFailureRate}
              min={0}
              max={100}
              step={5}
              suffix="%"
              accent="var(--n-danger)"
              onChange={(value) => setConditions((prev) => ({ ...prev, authFailureRate: value }))}
            />
            <RangeControl
              label="Latence HSM"
              value={conditions.hsmLatencyMs}
              min={0}
              max={300}
              step={10}
              suffix="ms"
              accent="var(--n-reward)"
              onChange={(value) => setConditions((prev) => ({ ...prev, hsmLatencyMs: value }))}
            />

            <ToggleControl
              label="Injection fraude"
              description="Injecte des patterns suspects detectables"
              enabled={conditions.fraudInjection}
              onToggle={() => setConditions((prev) => ({ ...prev, fraudInjection: !prev.fraudInjection }))}
            />
            <ToggleControl
              label="Erreurs reseau aleatoires"
              description="Simule des timeouts et connexions refusees"
              enabled={conditions.networkErrors}
              onToggle={() => setConditions((prev) => ({ ...prev, networkErrors: !prev.networkErrors }))}
            />

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 'var(--n-space-2)' }}>
              <NotionButton variant="primary" loading={applyingConditions} onClick={() => void handleApplyConditions()}>
                Appliquer
              </NotionButton>
              <NotionButton variant="secondary" loading={applyingConditions} onClick={() => void handleResetConditions()}>
                Reinitialiser
              </NotionButton>
            </div>
          </div>
        </NotionCard>

        <NotionCard padding="md">
          <h2 style={{ margin: '0 0 var(--n-space-3)', color: 'var(--n-text-primary)', fontSize: 'var(--n-text-base)' }}>CTF vulnerability toggles</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--n-space-2)' }}>
            <ToggleControl
              label="allowReplay"
              description="Autorise le rejeu transactionnel"
              enabled={ctfVulnerabilities.allowReplay}
              onToggle={() => setCtfVulnerabilities((prev) => ({ ...prev, allowReplay: !prev.allowReplay }))}
            />
            <ToggleControl
              label="weakKeysEnabled"
              description="Active des cles faibles"
              enabled={ctfVulnerabilities.weakKeysEnabled}
              onToggle={() => setCtfVulnerabilities((prev) => ({ ...prev, weakKeysEnabled: !prev.weakKeysEnabled }))}
            />
            <ToggleControl
              label="verboseErrors"
              description="Expose plus de detail technique"
              enabled={ctfVulnerabilities.verboseErrors}
              onToggle={() => setCtfVulnerabilities((prev) => ({ ...prev, verboseErrors: !prev.verboseErrors }))}
            />
            <ToggleControl
              label="keyLeakInLogs"
              description="Journalise du materiel sensible"
              enabled={ctfVulnerabilities.keyLeakInLogs}
              onToggle={() => setCtfVulnerabilities((prev) => ({ ...prev, keyLeakInLogs: !prev.keyLeakInLogs }))}
            />

            <div style={{ marginTop: 'var(--n-space-2)' }}>
              <NotionProgress
                value={Math.round((activeVulnerabilityCount / 4) * 100)}
                variant={activeVulnerabilityCount >= 2 ? 'danger' : 'warning'}
                size="thin"
                showLabel
                label={`${activeVulnerabilityCount}/4 actifs`}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 'var(--n-space-2)' }}>
              <NotionButton variant="reward" loading={applyingCtf} onClick={() => void handleApplyCtf()}>
                Appliquer CTF
              </NotionButton>
              <NotionButton variant="secondary" loading={applyingCtf} onClick={() => void handleResetCtf()}>
                Reset CTF
              </NotionButton>
            </div>
          </div>
        </NotionCard>
      </div>

      <NotionCard padding="md" style={{ marginTop: 'var(--n-space-4)' }}>
        <h3 style={{ margin: '0 0 var(--n-space-3)', color: 'var(--n-text-primary)', fontSize: 'var(--n-text-base)' }}>Cas d usage pedagogiques</h3>
        <ul
          style={{
            margin: 0,
            paddingLeft: 'var(--n-space-4)',
            color: 'var(--n-text-secondary)',
            fontSize: 'var(--n-text-sm)',
            lineHeight: 'var(--n-leading-relaxed)',
          }}
        >
          <li>Latence 300ms: entrainement au timeout et retry logic.</li>
          <li>Echec auth 20%: lecture des codes de refus ISO 8583.</li>
          <li>Fraude active: detection de patterns anormaux.</li>
          <li>HSM lent: analyse des impacts cryptographiques.</li>
        </ul>
      </NotionCard>
    </div>
  );
}

function RangeControl({
  label,
  value,
  min,
  max,
  step,
  suffix,
  accent,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix: string;
  accent: string;
  onChange: (value: number) => void;
}) {
  const inputId = useId();

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
        <label htmlFor={inputId} style={{ color: 'var(--n-text-secondary)', fontSize: 'var(--n-text-sm)' }}>
          {label}
        </label>
        <span style={{ color: 'var(--n-text-primary)', fontFamily: 'var(--n-font-mono)', fontSize: 'var(--n-text-sm)' }}>
          {value} {suffix}
        </span>
      </div>
      <input
        id={inputId}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        aria-label={label}
        style={{ width: '100%', accentColor: accent }}
      />
    </div>
  );
}

function ToggleControl({
  label,
  description,
  enabled,
  onToggle,
}: {
  label: string;
  description: string;
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      style={{
        width: '100%',
        border: '1px solid var(--n-border)',
        borderRadius: 'var(--n-radius-sm)',
        background: 'var(--n-bg-elevated)',
        padding: 'var(--n-space-3)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        cursor: 'pointer',
        textAlign: 'left',
      }}
      aria-pressed={enabled}
      aria-label={label}
    >
      <div>
        <div style={{ color: 'var(--n-text-primary)', fontSize: 'var(--n-text-sm)', fontWeight: 'var(--n-weight-medium)' }}>{label}</div>
        <div style={{ color: 'var(--n-text-tertiary)', fontSize: 'var(--n-text-xs)' }}>{description}</div>
      </div>
      <span
        style={{
          width: '38px',
          height: '20px',
          borderRadius: '999px',
          background: enabled ? 'var(--n-accent)' : 'var(--n-border-strong)',
          position: 'relative',
          transition: 'background var(--n-duration-sm) var(--n-ease)',
          flexShrink: 0,
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: '2px',
            left: enabled ? '20px' : '2px',
            width: '16px',
            height: '16px',
            borderRadius: '999px',
            background: '#fff',
            transition: 'left var(--n-duration-sm) var(--n-ease)',
          }}
        />
      </span>
    </button>
  );
}

