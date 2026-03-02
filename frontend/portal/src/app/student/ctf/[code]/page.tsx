'use client';

import { Suspense } from 'react';
import { use, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import {
    AlertCircle,
    ArrowRight,
    BookOpen,
    CheckCircle2,
    ChevronRight,
    Copy,
    ExternalLink,
    Flag,
    Flame,
    Lightbulb,
    Lock,
    Monitor,
    RefreshCw,
    Send,
    Shield,
    Terminal,
    Trophy,
    Zap,
} from 'lucide-react';
import { useAuth } from '../../../auth/useAuth';
import { APP_URLS } from '@shared/lib/app-urls';
import { CtfLabSession, CtfTask } from '@/lib/ctf-lab';
import { normalizeCtfCode } from '@/lib/ctf-code-map';
import { NotionSkeleton, NotionProgress, NotionBadge } from '@shared/components/notion';

// ─── Types ────────────────────────────────────────────────────────────────────

type RoomStatus = 'LOCKED' | 'UNLOCKED' | 'IN_PROGRESS' | 'COMPLETED';
type WorkflowMode = 'FLAG_ONLY' | 'TASK_VALIDATION';

type GuidedStep = {
    stepNumber: number;
    stepTitle: string;
    stepDescription: string;
    stepType: string;
    commandTemplate: string | null;
    expectedOutput: string | null;
    hintText: string | null;
};

type HintInfo = {
    hintNumber: number;
    hintText: string | null;
    costPoints: number;
    unlocked: boolean;
    eligible?: boolean;
    lockedReason?: string | null;
    unlockPolicy?: {
        minMinutes: number;
        minFailedAttempts: number;
        requiredPreviousHint: number | null;
        elapsedMinutes: number;
        failedAttempts: number;
    };
};

type RoomDetail = {
    id: string;
    code: string;
    title: string;
    description: string;
    category: string;
    difficulty: string;
    points: number;
    targetService: string;
    targetEndpoint: string;
    vulnerabilityType: string;
    attackVector: string;
    learningObjectives: string[];
    estimatedMinutes: number;
    status: RoomStatus;
    workflowMode?: WorkflowMode;
    started?: boolean;
    currentGuidedStep?: number;
    totalSteps?: number;
    guidedSteps?: GuidedStep[];
    hints?: HintInfo[];
    failedAttempts?: number;
    prerequisiteChallengeCode?: string | null;
    relatedWorkshopPath?: string | null;
    labSession?: CtfLabSession | null;
    labTasks?: CtfTask[];
};

// ─── Constants ────────────────────────────────────────────────────────────────

const DIFFICULTY_STYLES: Record<string, { label: string; color: string; bg: string; border: string }> = {
    BEGINNER:     { label: 'Easy',   color: '#059669', bg: 'rgba(5,150,105,0.08)',   border: 'rgba(5,150,105,0.2)' },
    INTERMEDIATE: { label: 'Medium', color: '#b45309', bg: 'rgba(180,83,9,0.08)',    border: 'rgba(180,83,9,0.2)' },
    ADVANCED:     { label: 'Hard',   color: '#c2410c', bg: 'rgba(194,65,12,0.08)',   border: 'rgba(194,65,12,0.2)' },
    EXPERT:       { label: 'Expert', color: '#b91c1c', bg: 'rgba(185,28,28,0.08)',   border: 'rgba(185,28,28,0.2)' },
};

const CATEGORY_LABELS: Record<string, string> = {
    HSM_ATTACK: 'HSM Attack', REPLAY_ATTACK: 'Replay Attack', '3DS_BYPASS': '3DS Bypass',
    FRAUD_CNP: 'Fraud CNP', ISO8583_MANIPULATION: 'ISO 8583', PIN_CRACKING: 'PIN Cracking',
    MITM: 'MITM', PRIVILEGE_ESCALATION: 'Privesc', CRYPTO_WEAKNESS: 'Crypto',
    EMV_CLONING: 'EMV Cloning', TOKEN_VAULT: 'Token Vault', NETWORK_ATTACK: 'Network',
    KEY_MANAGEMENT: 'Key Mgmt', ADVANCED_FRAUD: 'Adv. Fraud', SUPPLY_CHAIN: 'Supply Chain',
    BOSS: 'Boss',
};

const TARGET_HOST_MAP: Record<string, string> = {
    'hsm-simulator': '10.10.0.10', 'api-gateway': '10.10.0.1',
    'sim-network-switch': '10.10.0.4', 'sim-fraud-detection': '10.10.0.7',
    'sim-auth-engine': '10.10.0.5', 'sim-card-service': '10.10.0.6',
    'sim-issuer-service': '10.10.0.8', 'sim-acquirer-service': '10.10.0.9',
    'acs-simulator': '10.10.0.11',
};

function getMachineIp(targetService: string): string {
    return TARGET_HOST_MAP[targetService.toLowerCase().trim()] || '10.10.x.x';
}

function substituteIp(text: string | null | undefined, ip: string): string {
    if (!text) return text ?? '';
    return text.replaceAll('MACHINE_IP', ip).replaceAll('{{MACHINE_IP}}', ip).replaceAll('<MACHINE_IP>', ip);
}

function formatRemainingTime(totalSeconds: number): string {
    const safeSeconds = Math.max(0, Math.floor(totalSeconds));
    const hours = Math.floor(safeSeconds / 3600);
    const minutes = Math.floor((safeSeconds % 3600) / 60);
    const seconds = safeSeconds % 60;
    if (hours > 0) return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

// ─── Shared sub-components ────────────────────────────────────────────────────

function Card({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) {
    return (
        <div style={{ background: 'var(--n-bg-primary)', border: '1px solid var(--n-border)', borderRadius: '8px', ...style }}>
            {children}
        </div>
    );
}

function Pill({ children, color, bg, border }: { children: React.ReactNode; color: string; bg: string; border: string }) {
    return (
        <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '2px 8px',
            borderRadius: '4px',
            fontSize: '11px',
            fontWeight: 700,
            color,
            background: bg,
            border: `1px solid ${border}`,
        }}>
            {children}
        </span>
    );
}

// ─── Suspense wrapper ─────────────────────────────────────────────────────────

export default function CtfRoomPage({ params }: { params: Promise<{ code: string }> }) {
    const { code } = use(params);
    return (
        <Suspense fallback={
            <div style={{ padding: '40px 24px', maxWidth: '1000px', margin: '0 auto' }}>
                <NotionSkeleton type="line" style={{ width: '200px', marginBottom: '16px' }} />
                <NotionSkeleton type="stat" style={{ height: '80px', marginBottom: '24px' }} />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '20px' }}>
                    <NotionSkeleton type="card" style={{ height: '300px' }} />
                    <NotionSkeleton type="card" style={{ height: '200px' }} />
                </div>
            </div>
        }>
            <RoomPageInner rawCode={code} />
        </Suspense>
    );
}

// ─── Main component ───────────────────────────────────────────────────────────

function RoomPageInner({ rawCode }: { rawCode: string }) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { isLoading: authLoading } = useAuth(true);

    const requestedCode = useMemo(() => normalizeCtfCode(decodeURIComponent(String(rawCode || ''))), [rawCode]);
    const normalizedCode = requestedCode;

    const [room, setRoom] = useState<RoomDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const taskParam = searchParams.get('task');
    const [activeTask, setActiveTask] = useState<number>(taskParam ? parseInt(taskParam, 10) : 1);
    const [flagInput, setFlagInput] = useState('');
    const [flagResult, setFlagResult] = useState<{ ok: boolean; message: string; points?: number } | null>(null);
    const [stepAnswers, setStepAnswers] = useState<Record<number, string>>({});
    const [stepResult, setStepResult] = useState<{ ok: boolean; message: string } | null>(null);
    const [hintError, setHintError] = useState<string | null>(null);
    const [copiedCmd, setCopiedCmd] = useState(false);
    const [nowMs, setNowMs] = useState<number>(Date.now());

    const getHeaders = useCallback(() => {
        const token = localStorage.getItem('token');
        return token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : null;
    }, []);

    const bootstrapAttackboxAccess = useCallback(async (attackboxPath: string): Promise<boolean> => {
        const headers = getHeaders();
        if (!headers) return false;
        const authPath = `${String(attackboxPath || '').replace(/\/+$/, '')}/auth`;
        try {
            const response = await fetch(authPath, { method: 'POST', headers, cache: 'no-store' });
            return response.ok;
        } catch { return false; }
    }, [getHeaders]);

    const fetchRoom = useCallback(async () => {
        if (!normalizedCode) return;
        const headers = getHeaders();
        if (!headers) { setError('Session expirée.'); setLoading(false); return; }
        try {
            setError(null);
            setRefreshing(true);
            const res = await fetch(`/api/ctf/challenges/${encodeURIComponent(normalizedCode)}?mode=GUIDED&profile=INTERMEDIATE`, { headers });
            const data = await res.json().catch(() => ({}));
            if (res.ok && data?.success && data?.challenge) {
                setRoom(data.challenge);
            } else {
                throw new Error(data?.error || 'Impossible de charger cette room.');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erreur de chargement.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [getHeaders, normalizedCode]);

    useEffect(() => { if (authLoading) return; void fetchRoom(); }, [authLoading, fetchRoom]);
    useEffect(() => { const interval = window.setInterval(() => setNowMs(Date.now()), 1000); return () => window.clearInterval(interval); }, []);
    useEffect(() => {
        const session = room?.labSession;
        if (!session || session.status !== 'RUNNING' || !session.attackboxPath) return;
        void bootstrapAttackboxAccess(session.attackboxPath);
    }, [room?.labSession?.attackboxPath, room?.labSession?.sessionId, room?.labSession?.status, bootstrapAttackboxAccess]);
    useEffect(() => { const t = searchParams.get('task'); if (t) setActiveTask(parseInt(t, 10)); }, [searchParams]);

    const navigateToTask = useCallback((n: number) => {
        setActiveTask(n); setFlagResult(null); setStepResult(null); setHintError(null);
        router.replace(`${APP_URLS.studentCtf}/${encodeURIComponent(normalizedCode)}?task=${n}`, { scroll: false });
    }, [normalizedCode, router]);

    const startRoom = useCallback(async () => {
        const headers = getHeaders();
        if (!headers) return;
        try {
            setSubmitting(true); setError(null);
            const res = await fetch(`/api/ctf/challenges/${encodeURIComponent(normalizedCode)}/start`, {
                method: 'POST', headers, body: JSON.stringify({ mode: 'GUIDED', learnerProfile: 'INTERMEDIATE' }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok || !data?.success) throw new Error(data?.error || 'Impossible de démarrer.');
            await fetchRoom();
            if (data.session) {
                setRoom((prev) => prev ? { ...prev, labSession: data.session, labTasks: Array.isArray(data.tasks) ? data.tasks : (prev.labTasks ?? []) } : prev);
            }
            navigateToTask(1);
        } catch (err) { setError(err instanceof Error ? err.message : 'Erreur démarrage.'); } finally { setSubmitting(false); }
    }, [fetchRoom, getHeaders, navigateToTask, normalizedCode]);

    const refreshLabSession = useCallback(async () => {
        const headers = getHeaders();
        if (!headers || !normalizedCode) return;
        try {
            const res = await fetch(`/api/ctf/challenges/${encodeURIComponent(normalizedCode)}/session`, { method: 'GET', headers });
            const data = await res.json().catch(() => ({}));
            if (!res.ok || !data?.success) return;
            setRoom((previous) => {
                if (!previous) return previous;
                return { ...previous, labSession: data.session || null, labTasks: Array.isArray(data.tasks) ? data.tasks : previous.labTasks };
            });
        } catch { /* passive refresh */ }
    }, [getHeaders, normalizedCode]);

    const extendSession = useCallback(async () => {
        const headers = getHeaders(); const sessionId = room?.labSession?.sessionId;
        if (!headers || !sessionId) return;
        try {
            setSubmitting(true); setError(null);
            const res = await fetch(`/api/ctf/sessions/${encodeURIComponent(sessionId)}/extend`, { method: 'POST', headers });
            const data = await res.json().catch(() => ({}));
            if (!res.ok || !data?.success || !data?.session) throw new Error(data?.error || 'Impossible d\'étendre la session.');
            setRoom((previous) => previous ? { ...previous, labSession: data.session } : previous);
        } catch (err) { setError(err instanceof Error ? err.message : 'Erreur extension de session.'); } finally { setSubmitting(false); }
    }, [getHeaders, room?.labSession?.sessionId]);

    const resetSession = useCallback(async () => {
        const headers = getHeaders(); const sessionId = room?.labSession?.sessionId;
        if (!headers || !sessionId) return;
        try {
            setSubmitting(true); setError(null);
            const res = await fetch(`/api/ctf/sessions/${encodeURIComponent(sessionId)}/reset`, { method: 'POST', headers });
            const data = await res.json().catch(() => ({}));
            if (!res.ok || !data?.success || !data?.session) throw new Error(data?.error || 'Impossible de réinitialiser.');
            setRoom((previous) => previous ? { ...previous, labSession: data.session } : previous);
            navigateToTask(1);
        } catch (err) { setError(err instanceof Error ? err.message : 'Erreur réinitialisation.'); } finally { setSubmitting(false); }
    }, [getHeaders, navigateToTask, room?.labSession?.sessionId]);

    const terminateSession = useCallback(async () => {
        const headers = getHeaders(); const sessionId = room?.labSession?.sessionId;
        if (!headers || !sessionId) return;
        try {
            setSubmitting(true); setError(null);
            const res = await fetch(`/api/ctf/sessions/${encodeURIComponent(sessionId)}`, { method: 'DELETE', headers });
            const data = await res.json().catch(() => ({}));
            if (!res.ok || !data?.success || !data?.session) throw new Error(data?.error || 'Impossible d\'arrêter.');
            setRoom((previous) => previous ? { ...previous, labSession: data.session } : previous);
        } catch (err) { setError(err instanceof Error ? err.message : 'Erreur arrêt.'); } finally { setSubmitting(false); }
    }, [getHeaders, room?.labSession?.sessionId]);

    const advanceTask = useCallback(async () => {
        const headers = getHeaders();
        if (!headers) return;
        try {
            setSubmitting(true); setError(null);
            const res = await fetch(`/api/ctf/challenges/${encodeURIComponent(normalizedCode)}/step/next`, { method: 'POST', headers });
            const data = await res.json().catch(() => ({}));
            if (!res.ok || !data?.success) throw new Error(data?.error || 'Impossible d\'avancer.');
            await fetchRoom();
            const nextStep = (room?.currentGuidedStep || activeTask) + 1;
            const total = room?.totalSteps || 0;
            if (nextStep > total) navigateToTask(total + 1);
            else navigateToTask(nextStep);
        } catch (err) { setError(err instanceof Error ? err.message : 'Erreur avancement.'); } finally { setSubmitting(false); }
    }, [activeTask, fetchRoom, getHeaders, navigateToTask, normalizedCode, room?.currentGuidedStep, room?.totalSteps]);

    const submitStepAnswer = useCallback(async () => {
        const headers = getHeaders();
        if (!headers || !room || room.workflowMode !== 'TASK_VALIDATION') return;
        const stepNumber = room.currentGuidedStep || activeTask || 1;
        const answer = (stepAnswers[stepNumber] || '').trim();
        if (!answer) return;
        try {
            setSubmitting(true); setError(null); setStepResult(null);
            const res = await fetch(`/api/ctf/challenges/${encodeURIComponent(normalizedCode)}/step/${stepNumber}/submit`, {
                method: 'POST', headers, body: JSON.stringify({ answer }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok || !data?.success || !data?.result) throw new Error(data?.error || 'Step validation failed.');
            const result = data.result as { isCorrect: boolean; completed: boolean; message?: string; currentGuidedStep?: number };
            if (!result.isCorrect) { setStepResult({ ok: false, message: result.message || 'Incorrect answer. Try again.' }); await fetchRoom(); return; }
            setStepResult({ ok: true, message: result.message || 'Correct answer.' });
            await fetchRoom();
            if (result.completed) { navigateToTask(Math.max(room.totalSteps || stepNumber, stepNumber)); return; }
            navigateToTask(Math.max(stepNumber + 1, Number(result.currentGuidedStep || stepNumber + 1)));
        } catch (err) { setStepResult({ ok: false, message: err instanceof Error ? err.message : 'Step validation error.' }); } finally { setSubmitting(false); }
    }, [activeTask, fetchRoom, getHeaders, navigateToTask, normalizedCode, room, stepAnswers]);

    const unlockHint = useCallback(async (hintNumber: number) => {
        const headers = getHeaders();
        if (!headers) return;
        try {
            setSubmitting(true); setHintError(null);
            const res = await fetch(`/api/ctf/challenges/${encodeURIComponent(normalizedCode)}/hint/${hintNumber}`, { method: 'POST', headers });
            const data = await res.json().catch(() => ({}));
            if (!res.ok || !data?.success) throw new Error(data?.error || 'Impossible de déverrouiller.');
            await fetchRoom();
        } catch (err) { setHintError(err instanceof Error ? err.message : 'Erreur déverrouillage.'); } finally { setSubmitting(false); }
    }, [fetchRoom, getHeaders, normalizedCode]);

    const submitFlag = useCallback(async () => {
        const headers = getHeaders();
        if (!headers || !flagInput.trim()) return;
        try {
            setSubmitting(true); setFlagResult(null); setError(null);
            const res = await fetch(`/api/ctf/challenges/${encodeURIComponent(normalizedCode)}/submit`, {
                method: 'POST', headers, body: JSON.stringify({ submittedFlag: flagInput.trim(), mode: 'GUIDED', learnerProfile: 'INTERMEDIATE' }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok || !data?.success || !data?.result) throw new Error(data?.error || 'Soumission impossible.');
            if (data.result.isCorrect) { setFlagResult({ ok: true, message: data.result.alreadySolved ? 'Already solved!' : 'Correct flag!', points: data.result.pointsAwarded }); await fetchRoom(); }
            else setFlagResult({ ok: false, message: data.result.message || 'Wrong flag. Try again.' });
        } catch (err) { setFlagResult({ ok: false, message: err instanceof Error ? err.message : 'Submission error.' }); } finally { setSubmitting(false); }
    }, [fetchRoom, flagInput, getHeaders, normalizedCode]);

    const copyCommand = useCallback(async (cmd: string) => {
        try { await navigator.clipboard.writeText(cmd); setCopiedCmd(true); window.setTimeout(() => setCopiedCmd(false), 1500); } catch { /* ignore */ }
    }, []);

    useEffect(() => {
        if (room?.labSession?.status !== 'RUNNING') return;
        const interval = window.setInterval(() => { void refreshLabSession(); }, 15_000);
        return () => window.clearInterval(interval);
    }, [refreshLabSession, room?.labSession?.sessionId, room?.labSession?.status]);

    // ─── Derived view values ──────────────────────────────────────────────────

    const vm = useMemo(() => {
        if (!room) return null;
        const status = room.status;
        const isCompleted = status === 'COMPLETED';
        const isInProgress = status === 'IN_PROGRESS';
        const isUnlocked = status === 'UNLOCKED';
        const isLocked = status === 'LOCKED';
        const workflowMode: WorkflowMode = room.workflowMode === 'TASK_VALIDATION' ? 'TASK_VALIDATION' : 'FLAG_ONLY';
        const isTaskValidationWorkflow = workflowMode === 'TASK_VALIDATION';

        const steps = room.guidedSteps || [];
        const totalSteps = Math.max(steps.length, room.totalSteps || 0);
        const currentStep = room.currentGuidedStep || (isCompleted ? totalSteps : 1);
        const progressPct = totalSteps > 0 ? (isCompleted ? 100 : Math.round(((currentStep - 1) / totalSteps) * 100)) : 0;

        const labSession = room.labSession || null;
        const machineIp = labSession?.machineIp || getMachineIp(room.targetService);
        const sessionStatus = labSession?.status || 'STOPPED';
        const sessionExpiresAtMs = labSession?.expiresAt ? new Date(labSession.expiresAt).getTime() : 0;
        const sessionRemainingSec = sessionExpiresAtMs > 0 ? Math.max(0, Math.floor((sessionExpiresAtMs - nowMs) / 1000)) : Math.max(0, Number(labSession?.timeRemainingSec || 0));
        const hasRunningSession = sessionStatus === 'RUNNING' && sessionRemainingSec > 0;
        const canExtendSession = Boolean(labSession?.canExtend && hasRunningSession);
        const rawAttackboxPath = labSession?.attackboxPath || '';
        const token = localStorage.getItem('token') || '';
        const attackboxPath = rawAttackboxPath && token
            ? `${APP_URLS.labProxy.replace(/\/+$/, '')}${rawAttackboxPath.startsWith('/') ? rawAttackboxPath : `/${rawAttackboxPath}`}?token=${encodeURIComponent(token)}`
            : rawAttackboxPath || APP_URLS.ctfAttackbox;

        const showFlagTask = !isTaskValidationWorkflow;
        const flagTaskIndex = totalSteps + 1;
        const selectedTask = showFlagTask
            ? activeTask
            : Math.max(1, Math.min(activeTask || 1, Math.max(totalSteps, 1)));
        const isFlagTask = showFlagTask && selectedTask === flagTaskIndex;
        const activeStepData = steps.find((s) => s.stepNumber === selectedTask) || null;
        const isTaskDone = isCompleted || selectedTask < currentStep;
        const isTaskActive = !isCompleted && selectedTask === currentStep;
        const isTaskFuture = !isCompleted && selectedTask > currentStep;

        const hints = room.hints || [];
        const diff = DIFFICULTY_STYLES[room.difficulty] || { label: room.difficulty, color: 'var(--n-text-secondary)', bg: 'var(--n-bg-elevated)', border: 'var(--n-border)' };
        const catLabel = CATEGORY_LABELS[room.category] || room.category;

        return {
            status, isCompleted, isInProgress, isUnlocked, isLocked,
            workflowMode, isTaskValidationWorkflow, showFlagTask,
            steps, totalSteps, currentStep, progressPct, selectedTask,
            machineIp, flagTaskIndex, isFlagTask,
            labSession, sessionStatus, sessionRemainingSec, hasRunningSession, canExtendSession, attackboxPath,
            activeStepData, isTaskDone, isTaskActive, isTaskFuture,
            hints, diff, catLabel,
        };
    }, [room, activeTask, nowMs]);

    // ─── Loading / error states ───────────────────────────────────────────────

    if (authLoading || loading) {
        return (
            <div style={{ padding: '40px 24px', maxWidth: '1000px', margin: '0 auto' }}>
                <NotionSkeleton type="line" style={{ width: '200px', marginBottom: '20px' }} />
                <NotionSkeleton type="stat" style={{ height: '80px', marginBottom: '24px' }} />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '20px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <NotionSkeleton type="card" style={{ height: '200px' }} />
                        <NotionSkeleton type="card" style={{ height: '120px' }} />
                    </div>
                    <NotionSkeleton type="card" style={{ height: '300px' }} />
                </div>
            </div>
        );
    }

    if (!room || !vm) {
        return (
            <div style={{ padding: '80px 24px', display: 'flex', justifyContent: 'center' }}>
                <div style={{ maxWidth: '440px', width: '100%' }}>
                    <Card style={{ padding: '20px', borderColor: 'var(--n-danger-border)', background: 'var(--n-danger-bg)' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                            <AlertCircle size={18} style={{ color: 'var(--n-danger)', flexShrink: 0, marginTop: '1px' }} />
                            <div>
                                <p style={{ fontWeight: 600, color: 'var(--n-text-primary)', marginBottom: '4px', fontSize: '14px' }}>
                                    Impossible de charger la room
                                </p>
                                <p style={{ fontSize: '13px', color: 'var(--n-text-secondary)', marginBottom: '16px' }}>
                                    {error || 'Erreur inconnue.'}
                                </p>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button onClick={() => void fetchRoom()} style={{
                                        padding: '7px 16px',
                                        borderRadius: '6px',
                                        border: 'none',
                                        background: 'var(--n-accent)',
                                        color: '#fff',
                                        fontSize: '12px',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                    }}>Réessayer</button>
                                    <Link href={APP_URLS.studentCtf} style={{
                                        padding: '7px 16px',
                                        borderRadius: '6px',
                                        border: '1px solid var(--n-border)',
                                        background: 'var(--n-bg-primary)',
                                        color: 'var(--n-text-secondary)',
                                        fontSize: '12px',
                                        fontWeight: 500,
                                        textDecoration: 'none',
                                    }}>Retour</Link>
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        );
    }

    // ─── Session status color ─────────────────────────────────────────────────
    const sessionStatusColor = vm.sessionStatus === 'RUNNING' ? '#22c55e'
        : vm.sessionStatus === 'PROVISIONING' ? '#f59e0b'
        : vm.sessionStatus === 'FAILED' ? '#ef4444'
        : 'var(--n-text-tertiary)';

    // ─── Aside (task list + machine panel) ───────────────────────────────────

    const aside = (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {/* Task navigation */}
            <Card style={{ overflow: 'hidden', padding: 0 }}>
                <div style={{ padding: '10px 14px 8px', borderBottom: '1px solid var(--n-border)' }}>
                    <p style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--n-text-tertiary)' }}>Tasks</p>
                </div>
                <div style={{ padding: '4px 0' }}>
                    {vm.steps.map((step) => {
                        const isDone = vm.isCompleted || step.stepNumber < vm.currentStep;
                        const isActive = !vm.isCompleted && step.stepNumber === vm.currentStep;
                        const isFuture = !vm.isCompleted && step.stepNumber > vm.currentStep;
                        const isSelected = vm.selectedTask === step.stepNumber;

                        return (
                            <button
                                key={step.stepNumber}
                                onClick={() => !isFuture && navigateToTask(step.stepNumber)}
                                disabled={isFuture}
                                style={{
                                    width: '100%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    padding: '8px 14px',
                                    textAlign: 'left',
                                    border: 'none',
                                    borderRight: `2px solid ${isSelected ? 'var(--n-accent)' : 'transparent'}`,
                                    background: isSelected ? 'var(--n-accent-light)' : 'transparent',
                                    cursor: isFuture ? 'not-allowed' : 'pointer',
                                    opacity: isFuture ? 0.4 : 1,
                                    transition: 'background 0.1s',
                                }}
                                onMouseEnter={e => { if (!isSelected && !isFuture) e.currentTarget.style.background = 'var(--n-bg-hover)'; }}
                                onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                            >
                                <div style={{
                                    width: '18px',
                                    height: '18px',
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0,
                                    fontSize: '9px',
                                    fontWeight: 800,
                                    background: isDone ? 'var(--n-success-bg)' : isActive ? 'var(--n-accent-light)' : 'var(--n-bg-elevated)',
                                    color: isDone ? 'var(--n-success)' : isActive ? 'var(--n-accent)' : 'var(--n-text-tertiary)',
                                    border: `1px solid ${isDone ? 'var(--n-success-border)' : isActive ? 'var(--n-accent-border)' : 'var(--n-border)'}`,
                                }}>
                                    {isDone ? <CheckCircle2 size={10} /> : step.stepNumber}
                                </div>
                                <span style={{
                                    fontSize: '12px',
                                    fontWeight: isSelected ? 600 : 400,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    color: isDone ? 'var(--n-success)' : isActive || isSelected ? 'var(--n-accent)' : isFuture ? 'var(--n-text-tertiary)' : 'var(--n-text-secondary)',
                                }}>
                                    {step.stepTitle}
                                </span>
                            </button>
                        );
                    })}

                    {/* Flag task */}
                    {vm.showFlagTask && vm.totalSteps > 0 && (
                        <>
                            <div style={{ margin: '4px 14px', borderTop: '1px solid var(--n-border)' }} />
                            <button
                                onClick={() => (vm.isCompleted || vm.currentStep >= vm.totalSteps) && navigateToTask(vm.flagTaskIndex)}
                                disabled={!vm.isCompleted && vm.currentStep < vm.totalSteps}
                                style={{
                                    width: '100%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    padding: '8px 14px',
                                    textAlign: 'left',
                                    border: 'none',
                                    borderRight: `2px solid ${vm.selectedTask === vm.flagTaskIndex ? 'var(--n-accent)' : 'transparent'}`,
                                    background: vm.selectedTask === vm.flagTaskIndex ? 'var(--n-accent-light)' : 'transparent',
                                    opacity: (!vm.isCompleted && vm.currentStep < vm.totalSteps) ? 0.4 : 1,
                                    cursor: (!vm.isCompleted && vm.currentStep < vm.totalSteps) ? 'not-allowed' : 'pointer',
                                }}
                            >
                                <div style={{
                                    width: '18px',
                                    height: '18px',
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0,
                                    background: vm.isCompleted ? 'var(--n-success-bg)' : 'var(--n-bg-elevated)',
                                    border: `1px solid ${vm.isCompleted ? 'var(--n-success-border)' : 'var(--n-border)'}`,
                                }}>
                                    {vm.isCompleted
                                        ? <Trophy size={10} style={{ color: 'var(--n-success)' }} />
                                        : <Flag size={10} style={{ color: 'var(--n-text-tertiary)' }} />}
                                </div>
                                <span style={{
                                    fontSize: '12px',
                                    fontWeight: 500,
                                    color: vm.isCompleted ? 'var(--n-success)' : 'var(--n-text-tertiary)',
                                }}>Find the Flag</span>
                            </button>
                        </>
                    )}
                </div>
            </Card>

            {/* Machine panel */}
            <Card style={{ padding: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '12px' }}>
                    <Monitor size={12} style={{ color: 'var(--n-info)' }} />
                    <p style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--n-text-tertiary)' }}>Machine cible</p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '12px' }}>
                    {[
                        { label: 'Service', value: room.targetService, color: 'var(--n-info)' },
                        { label: 'Session', value: vm.sessionStatus, color: sessionStatusColor },
                        { label: 'IP / Host', value: vm.machineIp, color: 'var(--n-accent)', mono: true },
                        { label: 'Temps restant', value: vm.labSession ? formatRemainingTime(vm.sessionRemainingSec) : '--:--', color: vm.sessionRemainingSec < 300 && vm.hasRunningSession ? 'var(--n-danger)' : 'var(--n-text-primary)', mono: true },
                    ].map(({ label, value, color, mono }) => (
                        <div key={label} style={{
                            padding: '8px 10px',
                            borderRadius: '5px',
                            background: 'var(--n-bg-elevated)',
                            border: '1px solid var(--n-border)',
                        }}>
                            <p style={{ fontSize: '9px', color: 'var(--n-text-tertiary)', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
                            <p style={{ fontSize: '12px', fontWeight: 600, color, fontFamily: mono ? 'var(--n-font-mono)' : undefined }}>{value}</p>
                        </div>
                    ))}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <Link href={`${APP_URLS.studentCtf}/${encodeURIComponent(normalizedCode)}/terminal`} style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        padding: '8px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 600,
                        textDecoration: 'none',
                        background: vm.hasRunningSession ? 'var(--n-info)' : 'var(--n-bg-elevated)',
                        color: vm.hasRunningSession ? '#fff' : 'var(--n-text-secondary)',
                        border: vm.hasRunningSession ? 'none' : '1px solid var(--n-border)',
                        transition: 'opacity 0.15s',
                    }}
                        onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
                        onMouseLeave={e => (e.currentTarget.style.opacity = '1')}>
                        <Terminal size={12} /> Open AttackBox
                    </Link>
                    <a href={vm.attackboxPath} target="_blank" rel="noreferrer" style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        padding: '7px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 500,
                        textDecoration: 'none',
                        background: 'var(--n-bg-primary)',
                        color: 'var(--n-text-secondary)',
                        border: '1px solid var(--n-border)',
                    }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--n-bg-hover)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'var(--n-bg-primary)')}>
                        <ExternalLink size={11} /> AttackBox (onglet)
                    </a>
                    {vm.hasRunningSession ? (
                        <>
                            <button onClick={() => void extendSession()} disabled={submitting || !vm.canExtendSession} style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                                padding: '7px', borderRadius: '6px', fontSize: '12px', fontWeight: 500,
                                background: 'var(--n-accent-light)', border: '1px solid var(--n-accent-border)', color: 'var(--n-accent)',
                                cursor: submitting || !vm.canExtendSession ? 'not-allowed' : 'pointer',
                                opacity: submitting || !vm.canExtendSession ? 0.4 : 1,
                            }}>
                                {submitting ? <RefreshCw size={11} style={{ animation: 'spin 1s linear infinite' }} /> : <ArrowRight size={11} />} Extend +60m
                            </button>
                            <button onClick={() => void resetSession()} disabled={submitting} style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                                padding: '7px', borderRadius: '6px', fontSize: '12px', fontWeight: 500,
                                background: 'var(--n-bg-primary)', border: '1px solid var(--n-border)', color: 'var(--n-text-secondary)',
                                cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.4 : 1,
                            }}
                                onMouseEnter={e => (e.currentTarget.style.background = 'var(--n-bg-hover)')}
                                onMouseLeave={e => (e.currentTarget.style.background = 'var(--n-bg-primary)')}>
                                <RefreshCw size={11} /> Reset Machine
                            </button>
                            <button onClick={() => void terminateSession()} disabled={submitting} style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                                padding: '7px', borderRadius: '6px', fontSize: '12px', fontWeight: 500,
                                background: 'var(--n-danger-bg)', border: '1px solid var(--n-danger-border)', color: 'var(--n-danger)',
                                cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.4 : 1,
                            }}>
                                {submitting ? <RefreshCw size={11} style={{ animation: 'spin 1s linear infinite' }} /> : <AlertCircle size={11} />} Terminate
                            </button>
                        </>
                    ) : (
                        <button onClick={() => void startRoom()} disabled={submitting} style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                            padding: '8px', borderRadius: '6px', fontSize: '12px', fontWeight: 600,
                            background: 'var(--n-accent)', color: '#fff', border: 'none',
                            cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.6 : 1,
                        }}>
                            {submitting ? <RefreshCw size={11} style={{ animation: 'spin 1s linear infinite' }} /> : <Zap size={11} />} Start Machine
                        </button>
                    )}
                </div>
            </Card>

            {/* Quick links */}
            <Card style={{ padding: '8px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <Link href={APP_URLS.studentCtfLeaderboard} style={{
                        display: 'flex', alignItems: 'center', gap: '7px',
                        padding: '7px 10px', borderRadius: '5px',
                        fontSize: '12px', color: 'var(--n-text-secondary)', textDecoration: 'none',
                    }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--n-bg-hover)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                        <Trophy size={12} style={{ color: 'var(--n-accent)' }} /> Leaderboard
                    </Link>
                    {room.relatedWorkshopPath && (
                        <Link href={room.relatedWorkshopPath} style={{
                            display: 'flex', alignItems: 'center', gap: '7px',
                            padding: '7px 10px', borderRadius: '5px',
                            fontSize: '12px', color: 'var(--n-text-secondary)', textDecoration: 'none',
                        }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'var(--n-bg-hover)')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                            <BookOpen size={12} style={{ color: 'var(--n-info)' }} /> Revoir la théorie
                        </Link>
                    )}
                    <Link href={`${APP_URLS.studentCtf}/${encodeURIComponent(normalizedCode)}/remediation`} style={{
                        display: 'flex', alignItems: 'center', gap: '7px',
                        padding: '7px 10px', borderRadius: '5px',
                        fontSize: '12px', color: 'var(--n-text-secondary)', textDecoration: 'none',
                    }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--n-bg-hover)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                        <Shield size={12} style={{ color: 'var(--n-accent)' }} /> Remédiation
                    </Link>
                </div>
            </Card>
        </div>
    );

    // ─── Locked state ─────────────────────────────────────────────────────────

    if (vm.isLocked) {
        return (
            <div style={{ minHeight: 'calc(100vh - 48px)', background: 'var(--n-bg-primary)' }}>
                {/* Header */}
                <div style={{ borderBottom: '1px solid var(--n-border)', padding: '28px 24px 20px' }}>
                    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--n-text-tertiary)', marginBottom: '12px' }}>
                            <Link href="/student" style={{ color: 'var(--n-text-tertiary)', textDecoration: 'none' }}>Mon Parcours</Link>
                            <ChevronRight size={11} />
                            <Link href={APP_URLS.studentCtf} style={{ color: 'var(--n-text-tertiary)', textDecoration: 'none' }}>Security Labs</Link>
                            <ChevronRight size={11} />
                            <span style={{ color: 'var(--n-text-secondary)' }}>{room.code}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                            <Lock size={14} style={{ color: 'var(--n-text-tertiary)' }} />
                            <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--n-text-tertiary)' }}>Room verrouillée</span>
                        </div>
                        <h1 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--n-text-primary)', letterSpacing: '-0.01em', marginBottom: '10px' }}>{room.title}</h1>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            <Pill color="var(--n-text-secondary)" bg="var(--n-bg-elevated)" border="var(--n-border)">{room.code}</Pill>
                            <Pill color={vm.diff.color} bg={vm.diff.bg} border={vm.diff.border}>{vm.diff.label}</Pill>
                            <Pill color="var(--n-text-secondary)" bg="var(--n-bg-elevated)" border="var(--n-border)">{vm.catLabel}</Pill>
                        </div>
                    </div>
                </div>
                <div style={{ maxWidth: '900px', margin: '0 auto', padding: '24px' }}>
                    <Card style={{ padding: '24px', borderColor: 'var(--n-warning-border)', background: 'var(--n-warning-bg)' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                            <div style={{
                                width: '40px', height: '40px', borderRadius: '8px', flexShrink: 0,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                background: 'var(--n-accent-light)', border: '1px solid var(--n-accent-border)',
                            }}>
                                <Lock size={18} style={{ color: 'var(--n-accent)' }} />
                            </div>
                            <div>
                                <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--n-text-primary)', marginBottom: '6px' }}>Room verrouillée</h2>
                                <p style={{ fontSize: '13px', color: 'var(--n-text-secondary)', marginBottom: '16px' }}>
                                    Terminez le prérequis{' '}
                                    <span style={{ fontFamily: 'var(--n-font-mono)', color: 'var(--n-accent)', fontWeight: 600 }}>
                                        {room.prerequisiteChallengeCode}
                                    </span>{' '}
                                    pour débloquer cette room.
                                </p>
                                <Link href={APP_URLS.studentCtf} style={{
                                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                                    padding: '8px 18px', borderRadius: '6px',
                                    background: 'var(--n-accent)', color: '#fff',
                                    fontSize: '13px', fontWeight: 600, textDecoration: 'none',
                                }}>
                                    Voir toutes les rooms
                                </Link>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        );
    }

    // ─── Main layout ──────────────────────────────────────────────────────────

    return (
        <div style={{ minHeight: 'calc(100vh - 48px)', background: 'var(--n-bg-primary)' }}>

            {/* ── PAGE HEADER ── */}
            <div style={{ borderBottom: '1px solid var(--n-border)', padding: '28px 24px 20px', background: 'var(--n-bg-primary)' }}>
                <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
                    {/* Breadcrumb */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--n-text-tertiary)', marginBottom: '12px' }}>
                        <Link href="/student" style={{ color: 'var(--n-text-tertiary)', textDecoration: 'none' }}
                              onMouseEnter={e => (e.currentTarget.style.color = 'var(--n-text-primary)')}
                              onMouseLeave={e => (e.currentTarget.style.color = 'var(--n-text-tertiary)')}>
                            Mon Parcours
                        </Link>
                        <ChevronRight size={11} />
                        <Link href={APP_URLS.studentCtf} style={{ color: 'var(--n-text-tertiary)', textDecoration: 'none' }}
                              onMouseEnter={e => (e.currentTarget.style.color = 'var(--n-text-primary)')}
                              onMouseLeave={e => (e.currentTarget.style.color = 'var(--n-text-tertiary)')}>
                            Security Labs
                        </Link>
                        <ChevronRight size={11} />
                        <span style={{ color: 'var(--n-text-secondary)' }}>{room.code}</span>
                    </div>

                    {/* Status dot + title row */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', marginBottom: '10px' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            {/* Status chip */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                                <span style={{
                                    width: '7px', height: '7px', borderRadius: '50%', flexShrink: 0,
                                    background: vm.isCompleted ? 'var(--n-success)' : vm.isInProgress ? 'var(--n-accent)' : 'var(--n-danger)',
                                }} />
                                <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--n-text-tertiary)' }}>
                                    Security Lab
                                </span>
                            </div>
                            <h1 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--n-text-primary)', letterSpacing: '-0.01em', lineHeight: 1.2, marginBottom: '6px' }}>
                                {room.title}
                            </h1>
                            <p style={{ fontSize: '13px', color: 'var(--n-text-secondary)', lineHeight: 1.5, maxWidth: '600px', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                                {room.description}
                            </p>
                        </div>
                        <button onClick={() => void fetchRoom()} disabled={refreshing} style={{
                            padding: '8px', borderRadius: '6px', border: '1px solid var(--n-border)',
                            background: 'var(--n-bg-primary)', color: 'var(--n-text-tertiary)',
                            cursor: refreshing ? 'not-allowed' : 'pointer', flexShrink: 0,
                        }}>
                            <RefreshCw size={15} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
                        </button>
                    </div>

                    {/* Meta pills */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: vm.totalSteps > 0 && (vm.isInProgress || vm.isCompleted) ? '12px' : '0' }}>
                        <Pill color="var(--n-text-secondary)" bg="var(--n-bg-elevated)" border="var(--n-border)">{room.code}</Pill>
                        <Pill color={vm.diff.color} bg={vm.diff.bg} border={vm.diff.border}>{vm.diff.label}</Pill>
                        <Pill color="var(--n-text-secondary)" bg="var(--n-bg-elevated)" border="var(--n-border)">{vm.catLabel}</Pill>
                        <Pill color="var(--n-text-secondary)" bg="var(--n-bg-elevated)" border="var(--n-border)">{room.points} pts</Pill>
                        <Pill color="var(--n-text-secondary)" bg="var(--n-bg-elevated)" border="var(--n-border)">~{room.estimatedMinutes} min</Pill>
                        {vm.isCompleted && (
                            <Pill color="var(--n-success)" bg="var(--n-success-bg)" border="var(--n-success-border)">
                                <CheckCircle2 size={10} /> Completed
                            </Pill>
                        )}
                        {vm.isInProgress && (
                            <Pill color="var(--n-accent)" bg="var(--n-accent-light)" border="var(--n-accent-border)">
                                <Flame size={10} /> In Progress
                            </Pill>
                        )}
                    </div>

                    {/* Progress bar */}
                    {vm.totalSteps > 0 && (vm.isInProgress || vm.isCompleted) && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', maxWidth: '500px' }}>
                            <div style={{ flex: 1 }}>
                                <NotionProgress value={vm.progressPct} max={100} variant={vm.isCompleted ? 'success' : 'accent'} size="default" />
                            </div>
                            <span style={{ fontSize: '11px', color: 'var(--n-text-tertiary)', fontFamily: 'var(--n-font-mono)', flexShrink: 0 }}>
                                {vm.isCompleted ? vm.totalSteps : vm.currentStep - 1}/{vm.totalSteps} tasks
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* ── CONTENT GRID ── */}
            <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '20px 24px 48px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '20px', alignItems: 'flex-start' }}>
                    {/* Main content */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        {/* Error banner */}
                        {error && (
                            <div style={{
                                padding: '12px 14px',
                                borderRadius: '6px',
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: '10px',
                                background: 'var(--n-danger-bg)',
                                border: '1px solid var(--n-danger-border)',
                                color: 'var(--n-danger)',
                                fontSize: '13px',
                            }}>
                                <AlertCircle size={15} style={{ flexShrink: 0, marginTop: '1px' }} />
                                <p>{error}</p>
                            </div>
                        )}

                        {/* UNLOCKED → Start */}
                        {vm.isUnlocked && (
                            <Card style={{ padding: '24px' }}>
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                                    <div style={{
                                        width: '40px', height: '40px', borderRadius: '8px', flexShrink: 0,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        background: 'var(--n-accent-light)', border: '1px solid var(--n-accent-border)',
                                    }}>
                                        <Zap size={20} style={{ color: 'var(--n-accent)' }} />
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <h2 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--n-text-primary)', marginBottom: '6px' }}>Ready to start?</h2>
                                        <p style={{ fontSize: '13px', color: 'var(--n-text-secondary)', lineHeight: 1.5, marginBottom: '14px' }}>{room.description}</p>
                                        {room.learningObjectives.length > 0 && (
                                            <div style={{ marginBottom: '16px' }}>
                                                <p style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--n-text-tertiary)', marginBottom: '8px' }}>
                                                    What you'll learn
                                                </p>
                                                <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                                    {room.learningObjectives.map((obj, i) => (
                                                        <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '7px', fontSize: '13px', color: 'var(--n-text-secondary)' }}>
                                                            <ChevronRight size={13} style={{ color: 'var(--n-accent)', marginTop: '1px', flexShrink: 0 }} />
                                                            {obj}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px' }}>
                                            <Link href={`${APP_URLS.studentCtf}/${encodeURIComponent(normalizedCode)}/terminal`} style={{
                                                padding: '8px 16px', borderRadius: '6px',
                                                fontSize: '13px', fontWeight: 500,
                                                display: 'inline-flex', alignItems: 'center', gap: '6px',
                                                border: '1px solid var(--n-border)', background: 'var(--n-bg-primary)',
                                                color: 'var(--n-text-secondary)', textDecoration: 'none',
                                            }}>
                                                <Terminal size={13} style={{ color: 'var(--n-info)' }} /> Open AttackBox
                                            </Link>
                                            <button onClick={() => void startRoom()} disabled={submitting} style={{
                                                padding: '8px 20px', borderRadius: '6px',
                                                fontSize: '13px', fontWeight: 600,
                                                display: 'inline-flex', alignItems: 'center', gap: '7px',
                                                border: 'none', background: 'var(--n-accent)', color: '#fff',
                                                cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.6 : 1,
                                            }}>
                                                {submitting ? <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Zap size={13} />}
                                                {submitting ? 'Starting…' : 'Start Room'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        )}

                        {/* Active task content */}
                        {(vm.isInProgress || vm.isCompleted) && !vm.isFlagTask && vm.activeStepData && (
                            <TaskCard
                                step={vm.activeStepData}
                                machineIp={vm.machineIp}
                                isDone={vm.isTaskDone}
                                isActive={vm.isTaskActive}
                                isFuture={vm.isTaskFuture}
                                isCompleted={vm.isCompleted}
                                totalSteps={vm.totalSteps}
                                submitting={submitting}
                                workflowMode={vm.workflowMode}
                                onAdvance={advanceTask}
                                stepAnswer={stepAnswers[vm.activeStepData.stepNumber] || ''}
                                onStepAnswerChange={(value) => setStepAnswers((prev) => ({ ...prev, [vm.activeStepData!.stepNumber]: value }))}
                                onSubmitAnswer={submitStepAnswer}
                                stepResult={stepResult}
                                onCopy={copyCommand}
                                copiedCmd={copiedCmd}
                            />
                        )}

                        {/* Hints */}
                        {(vm.isInProgress || vm.isCompleted) && !vm.isFlagTask && vm.isTaskActive && vm.hints.length > 0 && (
                            <HintsCard hints={vm.hints} submitting={submitting} hintError={hintError} onUnlock={unlockHint} />
                        )}

                        {/* Flag task */}
                        {(vm.isInProgress || vm.isCompleted) && vm.showFlagTask && vm.isFlagTask && (
                            <FlagTaskCard
                                room={room}
                                machineIp={vm.machineIp}
                                isCompleted={vm.isCompleted}
                                flagInput={flagInput}
                                setFlagInput={setFlagInput}
                                flagResult={flagResult}
                                submitting={submitting}
                                onSubmit={submitFlag}
                                normalizedCode={normalizedCode}
                                hints={vm.hints}
                                onUnlockHint={unlockHint}
                                hintError={hintError}
                            />
                        )}

                        {/* Completion card */}
                        {vm.isCompleted && (vm.isFlagTask || vm.isTaskValidationWorkflow) && (
                            <Card style={{ padding: '28px', borderColor: 'var(--n-success-border)', background: 'var(--n-success-bg)', textAlign: 'center' }}>
                                <div style={{ width: '52px', height: '52px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', background: 'var(--n-success-bg)', border: '2px solid var(--n-success)' }}>
                                    <Trophy size={26} style={{ color: 'var(--n-success)' }} />
                                </div>
                                <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--n-text-primary)', marginBottom: '6px' }}>Room Completed!</h2>
                                <p style={{ fontSize: '13px', color: 'var(--n-text-secondary)', marginBottom: '20px' }}>
                                    You've successfully compromised the target and captured the flag.
                                </p>
                                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '10px' }}>
                                    <Link href={`${APP_URLS.studentCtf}/${encodeURIComponent(normalizedCode)}/remediation`} style={{
                                        padding: '9px 20px', borderRadius: '6px', fontSize: '13px', fontWeight: 600,
                                        display: 'inline-flex', alignItems: 'center', gap: '6px',
                                        background: 'var(--n-accent)', color: '#fff', textDecoration: 'none',
                                    }}>
                                        <Shield size={14} /> View Remediation
                                    </Link>
                                    <Link href={APP_URLS.studentCtf} style={{
                                        padding: '9px 20px', borderRadius: '6px', fontSize: '13px', fontWeight: 500,
                                        border: '1px solid var(--n-border)', background: 'var(--n-bg-primary)',
                                        color: 'var(--n-text-secondary)', textDecoration: 'none',
                                    }}>
                                        All Rooms
                                    </Link>
                                </div>
                            </Card>
                        )}
                    </div>

                    {/* Sidebar */}
                    <div style={{ position: 'sticky', top: '68px', alignSelf: 'flex-start' }}>
                        {aside}
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── TaskCard ─────────────────────────────────────────────────────────────────

function TaskCard({
    step, machineIp, isDone, isActive, isFuture, isCompleted, totalSteps,
    submitting, workflowMode, onAdvance, stepAnswer, onStepAnswerChange,
    onSubmitAnswer, stepResult, onCopy, copiedCmd,
}: {
    step: GuidedStep; machineIp: string; isDone: boolean; isActive: boolean;
    isFuture: boolean; isCompleted: boolean; totalSteps: number; submitting: boolean;
    workflowMode: WorkflowMode; onAdvance: () => void; stepAnswer: string;
    onStepAnswerChange: (value: string) => void; onSubmitAnswer: () => void;
    stepResult: { ok: boolean; message: string } | null; onCopy: (cmd: string) => void; copiedCmd: boolean;
}) {
    const processedCmd = step.commandTemplate ? substituteIp(step.commandTemplate, machineIp) : null;
    const processedDesc = substituteIp(step.stepDescription, machineIp);
    const expectsLongAnswer = step.stepType === 'EXPLANATION';

    const borderColor = isDone ? 'var(--n-success-border)' : isActive ? 'var(--n-accent-border)' : 'var(--n-border)';
    const stripeColor = isDone ? 'var(--n-success)' : isActive ? 'var(--n-accent)' : 'var(--n-border-strong)';

    return (
        <div style={{
            background: 'var(--n-bg-primary)',
            border: `1px solid ${borderColor}`,
            borderLeft: `3px solid ${stripeColor}`,
            borderRadius: '8px',
            padding: '20px',
            opacity: isFuture ? 0.6 : 1,
        }}>
            {/* Task header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '14px' }}>
                <div style={{
                    width: '34px', height: '34px', borderRadius: '7px', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '13px', fontWeight: 800,
                    background: isDone ? 'var(--n-success-bg)' : isActive ? 'var(--n-accent-light)' : 'var(--n-bg-elevated)',
                    color: isDone ? 'var(--n-success)' : isActive ? 'var(--n-accent)' : 'var(--n-text-tertiary)',
                    border: `1px solid ${isDone ? 'var(--n-success-border)' : isActive ? 'var(--n-accent-border)' : 'var(--n-border)'}`,
                }}>
                    {isDone ? <CheckCircle2 size={16} /> : step.stepNumber}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '3px' }}>
                        <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--n-text-primary)' }}>{step.stepTitle}</h2>
                        {isDone && !isCompleted && (
                            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--n-success)' }}>Done</span>
                        )}
                        {isActive && (
                            <span style={{
                                fontSize: '10px', fontWeight: 700, padding: '2px 7px', borderRadius: '4px',
                                background: 'var(--n-accent-light)', color: 'var(--n-accent)', border: '1px solid var(--n-accent-border)',
                            }}>
                                Current task
                            </span>
                        )}
                    </div>
                    <p style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--n-text-tertiary)' }}>
                        Task {step.stepNumber} / {totalSteps}
                    </p>
                </div>
            </div>

            {/* Instructions */}
            <p style={{ fontSize: '13px', lineHeight: 1.6, whiteSpace: 'pre-wrap', color: 'var(--n-text-secondary)', marginBottom: processedCmd || step.expectedOutput || step.hintText ? '14px' : '0' }}>
                {processedDesc}
            </p>

            {/* Command template */}
            {processedCmd && (
                <div style={{ marginTop: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <p style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--n-text-tertiary)' }}>Command</p>
                        <button onClick={() => onCopy(processedCmd)} style={{
                            display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px',
                            color: copiedCmd ? 'var(--n-success)' : 'var(--n-text-tertiary)',
                            background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px',
                        }}>
                            <Copy size={11} /> {copiedCmd ? 'Copied!' : 'Copy'}
                        </button>
                    </div>
                    <pre style={{
                        borderRadius: '6px', padding: '12px 14px',
                        fontSize: '12px', lineHeight: 1.5,
                        overflowX: 'auto', whiteSpace: 'pre-wrap',
                        fontFamily: 'var(--n-font-mono)',
                        background: 'rgba(0,0,0,0.85)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        color: '#86efac',
                    }}>
                        {processedCmd}
                    </pre>
                </div>
            )}

            {/* Expected output */}
            {step.expectedOutput && (
                <div style={{ marginTop: '10px' }}>
                    <p style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--n-text-tertiary)', marginBottom: '6px' }}>
                        Expected Output
                    </p>
                    <pre style={{
                        borderRadius: '6px', padding: '10px 12px',
                        fontSize: '11px', overflowX: 'auto', whiteSpace: 'pre-wrap',
                        fontFamily: 'var(--n-font-mono)',
                        background: 'rgba(0,0,0,0.7)',
                        border: '1px solid rgba(255,255,255,0.07)',
                        color: 'rgba(200,200,200,0.7)',
                    }}>
                        {substituteIp(step.expectedOutput, machineIp)}
                    </pre>
                </div>
            )}

            {/* Step hint */}
            {step.hintText && isActive && (
                <div style={{
                    marginTop: '12px',
                    display: 'flex', alignItems: 'flex-start', gap: '8px',
                    padding: '10px 12px', borderRadius: '6px',
                    background: 'var(--n-accent-light)', border: '1px solid var(--n-accent-border)',
                }}>
                    <Lightbulb size={13} style={{ color: 'var(--n-accent)', flexShrink: 0, marginTop: '1px' }} />
                    <p style={{ fontSize: '12px', lineHeight: 1.5, color: 'var(--n-accent)' }}>
                        {substituteIp(step.hintText, machineIp)}
                    </p>
                </div>
            )}

            {/* Task answer validation */}
            {isActive && !isCompleted && workflowMode === 'TASK_VALIDATION' && (
                <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {stepResult && (
                        <div style={{
                            padding: '10px 14px', borderRadius: '6px', fontSize: '13px',
                            background: stepResult.ok ? 'var(--n-success-bg)' : 'var(--n-danger-bg)',
                            border: `1px solid ${stepResult.ok ? 'var(--n-success-border)' : 'var(--n-danger-border)'}`,
                            color: stepResult.ok ? 'var(--n-success)' : 'var(--n-danger)',
                            display: 'flex', alignItems: 'center', gap: '8px',
                        }}>
                            {stepResult.ok ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                            <span style={{ fontWeight: 600 }}>{stepResult.message}</span>
                        </div>
                    )}
                    <div style={{ display: 'flex', gap: '8px', flexDirection: expectsLongAnswer ? 'column' : 'row' }}>
                        {expectsLongAnswer ? (
                            <textarea
                                value={stepAnswer}
                                onChange={(e) => onStepAnswerChange(e.target.value)}
                                placeholder="Enter your answer"
                                style={{
                                    minHeight: '100px', padding: '10px 12px', borderRadius: '6px',
                                    fontSize: '13px', color: 'var(--n-text-primary)',
                                    background: 'var(--n-bg-primary)', border: '1px solid var(--n-border)',
                                    outline: 'none', fontFamily: 'inherit', resize: 'vertical',
                                }}
                            />
                        ) : (
                            <input
                                type="text"
                                value={stepAnswer}
                                onChange={(e) => onStepAnswerChange(e.target.value)}
                                placeholder="Enter your answer"
                                style={{
                                    flex: 1, padding: '9px 12px', borderRadius: '6px',
                                    fontSize: '13px', color: 'var(--n-text-primary)',
                                    background: 'var(--n-bg-primary)', border: '1px solid var(--n-border)',
                                    outline: 'none',
                                }}
                                onKeyDown={(e) => e.key === 'Enter' && onSubmitAnswer()}
                            />
                        )}
                        <button
                            onClick={onSubmitAnswer}
                            disabled={submitting || !stepAnswer.trim()}
                            style={{
                                padding: '9px 18px', borderRadius: '6px', fontSize: '13px', fontWeight: 600,
                                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                                border: 'none', background: 'var(--n-accent)', color: '#fff',
                                cursor: submitting || !stepAnswer.trim() ? 'not-allowed' : 'pointer',
                                opacity: submitting || !stepAnswer.trim() ? 0.5 : 1,
                            }}>
                            {submitting ? <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={13} />}
                            Verify
                        </button>
                    </div>
                </div>
            )}

            {/* Manual progression */}
            {isActive && !isCompleted && workflowMode === 'FLAG_ONLY' && (
                <div style={{ marginTop: '16px' }}>
                    <button
                        onClick={onAdvance}
                        disabled={submitting}
                        style={{
                            padding: '9px 20px', borderRadius: '6px', fontSize: '13px', fontWeight: 600,
                            display: 'inline-flex', alignItems: 'center', gap: '7px',
                            border: 'none', background: 'var(--n-accent)', color: '#fff',
                            cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.5 : 1,
                        }}>
                        {submitting ? <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <ArrowRight size={13} />}
                        {submitting ? 'Loading…' : 'Mark Complete & Next'}
                    </button>
                </div>
            )}
        </div>
    );
}

// ─── HintsCard ────────────────────────────────────────────────────────────────

function HintsCard({ hints, submitting, hintError, onUnlock }: {
    hints: HintInfo[]; submitting: boolean; hintError: string | null; onUnlock: (n: number) => void;
}) {
    const [open, setOpen] = useState(false);

    return (
        <div style={{ background: 'var(--n-bg-primary)', border: '1px solid var(--n-border)', borderRadius: '8px', padding: '14px' }}>
            <button
                onClick={() => setOpen((v) => !v)}
                style={{
                    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    border: 'none', background: 'none', cursor: 'pointer', padding: 0,
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Lightbulb size={15} style={{ color: 'var(--n-accent)' }} />
                    <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--n-text-primary)' }}>Hints</span>
                    <span style={{ fontSize: '12px', color: 'var(--n-text-tertiary)' }}>
                        ({hints.filter((h) => h.unlocked).length}/{hints.length} unlocked)
                    </span>
                </div>
                <ChevronRight size={15} style={{
                    color: 'var(--n-text-tertiary)',
                    transform: open ? 'rotate(90deg)' : 'rotate(0)',
                    transition: 'transform 0.15s',
                }} />
            </button>

            {open && (
                <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {hintError && (
                        <p style={{
                            fontSize: '12px', padding: '8px 10px', borderRadius: '5px',
                            color: 'var(--n-danger)', background: 'var(--n-danger-bg)', border: '1px solid var(--n-danger-border)',
                        }}>{hintError}</p>
                    )}
                    {hints.map((hint) => (
                        <div key={hint.hintNumber} style={{
                            padding: '12px', borderRadius: '6px',
                            background: 'var(--n-bg-elevated)', border: '1px solid var(--n-border)',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                                <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--n-text-primary)' }}>Hint {hint.hintNumber}</p>
                                {hint.unlocked ? (
                                    <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--n-success)' }}>Unlocked</span>
                                ) : (
                                    <button
                                        onClick={() => onUnlock(hint.hintNumber)}
                                        disabled={submitting || hint.eligible === false}
                                        style={{
                                            padding: '4px 10px', borderRadius: '5px', fontSize: '11px', fontWeight: 600,
                                            background: 'var(--n-accent-light)', border: '1px solid var(--n-accent-border)',
                                            color: 'var(--n-accent)', cursor: submitting || hint.eligible === false ? 'not-allowed' : 'pointer',
                                            opacity: submitting || hint.eligible === false ? 0.5 : 1,
                                        }}>
                                        Unlock (−{hint.costPoints} pts)
                                    </button>
                                )}
                            </div>
                            {!hint.unlocked && hint.lockedReason && (
                                <p style={{ marginTop: '5px', fontSize: '11px', color: 'var(--n-accent)' }}>{hint.lockedReason}</p>
                            )}
                            {!hint.unlocked && hint.unlockPolicy && (
                                <p style={{ marginTop: '4px', fontSize: '10px', color: 'var(--n-text-tertiary)' }}>
                                    Disponible après {hint.unlockPolicy.minMinutes} min ou {hint.unlockPolicy.minFailedAttempts} essais.
                                    Actuel: {hint.unlockPolicy.elapsedMinutes} min / {hint.unlockPolicy.failedAttempts} essais.
                                </p>
                            )}
                            {hint.unlocked && hint.hintText && (
                                <p style={{ marginTop: '8px', fontSize: '13px', lineHeight: 1.5, color: 'var(--n-text-secondary)' }}>{hint.hintText}</p>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ─── FlagTaskCard ─────────────────────────────────────────────────────────────

function FlagTaskCard({
    room, machineIp, isCompleted, flagInput, setFlagInput, flagResult,
    submitting, onSubmit, normalizedCode, hints, onUnlockHint, hintError,
}: {
    room: RoomDetail; machineIp: string; isCompleted: boolean; flagInput: string;
    setFlagInput: (v: string) => void; flagResult: { ok: boolean; message: string; points?: number } | null;
    submitting: boolean; onSubmit: () => void; normalizedCode: string;
    hints: HintInfo[]; onUnlockHint: (n: number) => void; hintError: string | null;
}) {
    return (
        <div style={{
            background: 'var(--n-bg-primary)',
            border: `1px solid ${isCompleted ? 'var(--n-success-border)' : 'var(--n-accent-border)'}`,
            borderLeft: `3px solid ${isCompleted ? 'var(--n-success)' : 'var(--n-accent)'}`,
            borderRadius: '8px',
            padding: '20px',
        }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '16px' }}>
                <div style={{
                    width: '36px', height: '36px', borderRadius: '7px', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: isCompleted ? 'var(--n-success-bg)' : 'var(--n-accent-light)',
                    border: `1px solid ${isCompleted ? 'var(--n-success-border)' : 'var(--n-accent-border)'}`,
                }}>
                    {isCompleted
                        ? <Trophy size={16} style={{ color: 'var(--n-success)' }} />
                        : <Flag size={15} style={{ color: 'var(--n-accent)' }} />}
                </div>
                <div>
                    <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--n-text-primary)', marginBottom: '3px' }}>Find the Flag</h2>
                    <p style={{ fontSize: '13px', color: 'var(--n-text-secondary)' }}>Submit the flag you found in the target system.</p>
                </div>
            </div>

            {/* Target info */}
            <div style={{ marginBottom: '14px', padding: '12px', borderRadius: '6px', background: 'var(--n-bg-elevated)', border: '1px solid var(--n-border)' }}>
                <p style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--n-text-tertiary)', marginBottom: '5px' }}>Target Info</p>
                <p style={{ fontSize: '12px', fontFamily: 'var(--n-font-mono)', color: 'var(--n-info)', marginBottom: '3px' }}>
                    {substituteIp(room.targetEndpoint, machineIp)}
                </p>
                <p style={{ fontSize: '11px', color: 'var(--n-text-tertiary)' }}>
                    Service: <span style={{ color: 'var(--n-text-secondary)' }}>{room.targetService}</span>
                    {' · '}Machine IP: <span style={{ fontFamily: 'var(--n-font-mono)', color: 'var(--n-accent)' }}>{machineIp}</span>
                </p>
            </div>

            {/* Flag format */}
            <div style={{ marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--n-text-tertiary)' }}>
                <Flag size={12} style={{ color: 'var(--n-accent)' }} />
                Flag format: <span style={{ fontFamily: 'var(--n-font-mono)', color: 'var(--n-accent)' }}>PMP{'{'}&hellip;{'}'}</span>
                {' '}or check <span style={{ fontFamily: 'var(--n-font-mono)', color: 'var(--n-text-secondary)' }}>user.txt</span> / <span style={{ fontFamily: 'var(--n-font-mono)', color: 'var(--n-text-secondary)' }}>root.txt</span>
            </div>

            {/* Result */}
            {flagResult && (
                <div style={{
                    marginBottom: '12px', padding: '10px 14px', borderRadius: '6px', fontSize: '13px',
                    background: flagResult.ok ? 'var(--n-success-bg)' : 'var(--n-danger-bg)',
                    border: `1px solid ${flagResult.ok ? 'var(--n-success-border)' : 'var(--n-danger-border)'}`,
                    color: flagResult.ok ? 'var(--n-success)' : 'var(--n-danger)',
                    display: 'flex', alignItems: 'center', gap: '8px',
                }}>
                    {flagResult.ok ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                    <span style={{ fontWeight: 600, flex: 1 }}>{flagResult.message}</span>
                    {flagResult.ok && typeof flagResult.points === 'number' && (
                        <span style={{ fontFamily: 'var(--n-font-mono)', color: 'var(--n-accent)', fontWeight: 700 }}>+{flagResult.points} pts</span>
                    )}
                </div>
            )}

            {/* Input or completion actions */}
            {!isCompleted ? (
                <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                        type="text"
                        value={flagInput}
                        onChange={(e) => setFlagInput(e.target.value)}
                        placeholder="PMP{...}"
                        style={{
                            flex: 1, padding: '9px 12px', borderRadius: '6px', fontSize: '13px',
                            fontFamily: 'var(--n-font-mono)', color: 'var(--n-text-primary)',
                            background: 'var(--n-bg-primary)', border: '1px solid var(--n-border)', outline: 'none',
                        }}
                        onKeyDown={(e) => e.key === 'Enter' && onSubmit()}
                    />
                    <button
                        onClick={onSubmit}
                        disabled={submitting || !flagInput.trim()}
                        style={{
                            padding: '9px 18px', borderRadius: '6px', fontSize: '13px', fontWeight: 600,
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
                            border: 'none', background: 'var(--n-accent)', color: '#fff',
                            cursor: submitting || !flagInput.trim() ? 'not-allowed' : 'pointer',
                            opacity: submitting || !flagInput.trim() ? 0.5 : 1,
                        }}>
                        {submitting ? <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={13} />}
                        Submit Flag
                    </button>
                </div>
            ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                    <Link href={`${APP_URLS.studentCtf}/${encodeURIComponent(normalizedCode)}/remediation`} style={{
                        padding: '9px 20px', borderRadius: '6px', fontSize: '13px', fontWeight: 600,
                        display: 'inline-flex', alignItems: 'center', gap: '6px',
                        background: 'var(--n-accent)', color: '#fff', textDecoration: 'none',
                    }}>
                        <Shield size={13} /> View Remediation
                    </Link>
                    <Link href={APP_URLS.studentCtfLeaderboard} style={{
                        padding: '9px 20px', borderRadius: '6px', fontSize: '13px', fontWeight: 500,
                        display: 'inline-flex', alignItems: 'center', gap: '6px',
                        border: '1px solid var(--n-border)', background: 'var(--n-bg-primary)',
                        color: 'var(--n-text-secondary)', textDecoration: 'none',
                    }}>
                        <Trophy size={13} style={{ color: 'var(--n-accent)' }} /> Leaderboard
                    </Link>
                </div>
            )}

            {/* Hints on flag task */}
            {hints.length > 0 && !isCompleted && (
                <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--n-border)' }}>
                    <HintsCard hints={hints} submitting={submitting} hintError={hintError} onUnlock={onUnlockHint} />
                </div>
            )}
        </div>
    );
}
