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
import { CourseCard, CoursePageShell, CoursePill } from '@/components/course/CoursePageShell';
import { APP_URLS } from '@shared/lib/app-urls';
import { CtfLabSession, CtfTask } from '@/lib/ctf-lab';
import { normalizeCtfCode } from '@/lib/ctf-code-map';

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

const DIFFICULTY_STYLES: Record<string, { label: string; tone: 'emerald' | 'amber' | 'rose' | 'violet' | 'slate' }> = {
    BEGINNER:     { label: 'Easy',   tone: 'emerald' },
    INTERMEDIATE: { label: 'Medium', tone: 'amber'   },
    ADVANCED:     { label: 'Hard',   tone: 'rose'    },
    EXPERT:       { label: 'Expert', tone: 'violet'  },
};

const CATEGORY_LABELS: Record<string, string> = {
    HSM_ATTACK: 'HSM Attack', REPLAY_ATTACK: 'Replay Attack', '3DS_BYPASS': '3DS Bypass',
    FRAUD_CNP: 'Fraud CNP', ISO8583_MANIPULATION: 'ISO 8583', PIN_CRACKING: 'PIN Cracking',
    MITM: 'MITM', PRIVILEGE_ESCALATION: 'Privesc', CRYPTO_WEAKNESS: 'Crypto',
    EMV_CLONING: 'EMV Cloning', TOKEN_VAULT: 'Token Vault', NETWORK_ATTACK: 'Network',
    KEY_MANAGEMENT: 'Key Mgmt', ADVANCED_FRAUD: 'Adv. Fraud', SUPPLY_CHAIN: 'Supply Chain',
    BOSS: 'Boss',
};

// Machine IP map — matches Docker service names to IPs within the lab network
const TARGET_HOST_MAP: Record<string, string> = {
    'hsm-simulator':        '10.10.0.10',
    'api-gateway':          '10.10.0.1',
    'sim-network-switch':   '10.10.0.4',
    'sim-fraud-detection':  '10.10.0.7',
    'sim-auth-engine':      '10.10.0.5',
    'sim-card-service':     '10.10.0.6',
    'sim-issuer-service':   '10.10.0.8',
    'sim-acquirer-service': '10.10.0.9',
    'acs-simulator':        '10.10.0.11',
};

function getMachineIp(targetService: string): string {
    const normalized = targetService.toLowerCase().trim();
    return TARGET_HOST_MAP[normalized] || '10.10.x.x';
}

function substituteIp(text: string | null | undefined, ip: string): string {
    if (!text) return text ?? '';
    return text
        .replaceAll('MACHINE_IP', ip)
        .replaceAll('{{MACHINE_IP}}', ip)
        .replaceAll('<MACHINE_IP>', ip);
}

function formatRemainingTime(totalSeconds: number): string {
    const safeSeconds = Math.max(0, Math.floor(totalSeconds));
    const hours = Math.floor(safeSeconds / 3600);
    const minutes = Math.floor((safeSeconds % 3600) / 60);
    const seconds = safeSeconds % 60;

    if (hours > 0) {
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }

    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

// ─── Inner wrapper for Suspense ───────────────────────────────────────────────

export default function CtfRoomPage({ params }: { params: Promise<{ code: string }> }) {
    const { code } = use(params);
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <RefreshCw className="h-8 w-8 animate-spin text-orange-400" />
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

    const requestedCode = useMemo(
        () => normalizeCtfCode(decodeURIComponent(String(rawCode || ''))),
        [rawCode]
    );
    const normalizedCode = requestedCode;

    const [room, setRoom] = useState<RoomDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    // Active task index (1-based step number, or 0 = room overview, or totalSteps+1 = flag task)
    const taskParam = searchParams.get('task');
    const [activeTask, setActiveTask] = useState<number>(taskParam ? parseInt(taskParam, 10) : 1);

    // Flag submission
    const [flagInput, setFlagInput] = useState('');
    const [flagResult, setFlagResult] = useState<{ ok: boolean; message: string; points?: number } | null>(null);
    const [stepAnswers, setStepAnswers] = useState<Record<number, string>>({});
    const [stepResult, setStepResult] = useState<{ ok: boolean; message: string } | null>(null);

    // Hints
    const [hintError, setHintError] = useState<string | null>(null);

    // Copy state
    const [copiedCmd, setCopiedCmd] = useState(false);
    const [nowMs, setNowMs] = useState<number>(Date.now());

    const getHeaders = useCallback(() => {
        const token = localStorage.getItem('token');
        return token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : null;
    }, []);

    const bootstrapAttackboxAccess = useCallback(async (attackboxPath: string): Promise<boolean> => {
        const headers = getHeaders();
        if (!headers) {
            return false;
        }

        const authPath = `${String(attackboxPath || '').replace(/\/+$/, '')}/auth`;
        try {
            const response = await fetch(authPath, {
                method: 'POST',
                headers,
                cache: 'no-store',
            });
            return response.ok;
        } catch {
            return false;
        }
    }, [getHeaders]);

    const fetchRoom = useCallback(async () => {
        if (!normalizedCode) return;
        const headers = getHeaders();
        if (!headers) { setError('Session expirée.'); setLoading(false); return; }
        try {
            setError(null);
            setRefreshing(true);
            const res = await fetch(
                `/api/ctf/challenges/${encodeURIComponent(normalizedCode)}?mode=GUIDED&profile=INTERMEDIATE`,
                { headers }
            );
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

    useEffect(() => {
        if (authLoading) return;
        void fetchRoom();
    }, [authLoading, fetchRoom]);

    useEffect(() => {
        const interval = window.setInterval(() => setNowMs(Date.now()), 1000);
        return () => window.clearInterval(interval);
    }, []);

    useEffect(() => {
        const session = room?.labSession;
        if (!session || session.status !== 'RUNNING' || !session.attackboxPath) {
            return;
        }
        void bootstrapAttackboxAccess(session.attackboxPath);
    }, [room?.labSession?.attackboxPath, room?.labSession?.sessionId, room?.labSession?.status, bootstrapAttackboxAccess]);

    // Sync active task from URL
    useEffect(() => {
        const t = searchParams.get('task');
        if (t) setActiveTask(parseInt(t, 10));
    }, [searchParams]);

    const navigateToTask = useCallback((n: number) => {
        setActiveTask(n);
        setFlagResult(null);
        setStepResult(null);
        setHintError(null);
        const url = `${APP_URLS.studentCtf}/${encodeURIComponent(normalizedCode)}?task=${n}`;
        router.replace(url, { scroll: false });
    }, [normalizedCode, router]);

    const startRoom = useCallback(async () => {
        const headers = getHeaders();
        if (!headers) return;
        try {
            setSubmitting(true);
            setError(null);
            const res = await fetch(`/api/ctf/challenges/${encodeURIComponent(normalizedCode)}/start`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ mode: 'GUIDED', learnerProfile: 'INTERMEDIATE' }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok || !data?.success) throw new Error(data?.error || 'Impossible de démarrer.');
            await fetchRoom();
            // Apply session from /start response as authoritative source — fetchRoom() may
            // return labSession: null in edge cases, but the /start response always has the
            // real session (machineIp, expiresAt) which drives the IP display and timer.
            if (data.session) {
                setRoom((prev) => prev ? {
                    ...prev,
                    labSession: data.session,
                    labTasks: Array.isArray(data.tasks) ? data.tasks : (prev.labTasks ?? []),
                } : prev);
            }
            navigateToTask(1);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erreur démarrage.');
        } finally {
            setSubmitting(false);
        }
    }, [fetchRoom, getHeaders, navigateToTask, normalizedCode]);

    const refreshLabSession = useCallback(async () => {
        const headers = getHeaders();
        if (!headers || !normalizedCode) return;

        try {
            const res = await fetch(`/api/ctf/challenges/${encodeURIComponent(normalizedCode)}/session`, {
                method: 'GET',
                headers,
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok || !data?.success) {
                return;
            }

            setRoom((previous) => {
                if (!previous) {
                    return previous;
                }
                return {
                    ...previous,
                    labSession: data.session || null,
                    labTasks: Array.isArray(data.tasks) ? data.tasks : previous.labTasks,
                };
            });
        } catch {
            // passive refresh only
        }
    }, [getHeaders, normalizedCode]);

    const extendSession = useCallback(async () => {
        const headers = getHeaders();
        const sessionId = room?.labSession?.sessionId;
        if (!headers || !sessionId) return;

        try {
            setSubmitting(true);
            setError(null);
            const res = await fetch(`/api/ctf/sessions/${encodeURIComponent(sessionId)}/extend`, {
                method: 'POST',
                headers,
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok || !data?.success || !data?.session) {
                throw new Error(data?.error || 'Impossible d\'étendre la session.');
            }
            setRoom((previous) => previous ? { ...previous, labSession: data.session } : previous);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erreur extension de session.');
        } finally {
            setSubmitting(false);
        }
    }, [getHeaders, room?.labSession?.sessionId]);

    const resetSession = useCallback(async () => {
        const headers = getHeaders();
        const sessionId = room?.labSession?.sessionId;
        if (!headers || !sessionId) return;

        try {
            setSubmitting(true);
            setError(null);
            const res = await fetch(`/api/ctf/sessions/${encodeURIComponent(sessionId)}/reset`, {
                method: 'POST',
                headers,
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok || !data?.success || !data?.session) {
                throw new Error(data?.error || 'Impossible de réinitialiser la session.');
            }
            setRoom((previous) => previous ? { ...previous, labSession: data.session } : previous);
            navigateToTask(1);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erreur réinitialisation de session.');
        } finally {
            setSubmitting(false);
        }
    }, [getHeaders, navigateToTask, room?.labSession?.sessionId]);

    const terminateSession = useCallback(async () => {
        const headers = getHeaders();
        const sessionId = room?.labSession?.sessionId;
        if (!headers || !sessionId) return;

        try {
            setSubmitting(true);
            setError(null);
            const res = await fetch(`/api/ctf/sessions/${encodeURIComponent(sessionId)}`, {
                method: 'DELETE',
                headers,
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok || !data?.success || !data?.session) {
                throw new Error(data?.error || 'Impossible d\'arrêter la session.');
            }
            setRoom((previous) => previous ? { ...previous, labSession: data.session } : previous);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erreur arrêt de session.');
        } finally {
            setSubmitting(false);
        }
    }, [getHeaders, room?.labSession?.sessionId]);

    const advanceTask = useCallback(async () => {
        const headers = getHeaders();
        if (!headers) return;
        try {
            setSubmitting(true);
            setError(null);
            const res = await fetch(`/api/ctf/challenges/${encodeURIComponent(normalizedCode)}/step/next`, {
                method: 'POST',
                headers,
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok || !data?.success) throw new Error(data?.error || 'Impossible d\'avancer.');
            await fetchRoom();
            // Go to next task
            const nextStep = (room?.currentGuidedStep || activeTask) + 1;
            const total = room?.totalSteps || 0;
            if (nextStep > total) {
                // Move to flag task
                navigateToTask(total + 1);
            } else {
                navigateToTask(nextStep);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erreur avancement.');
        } finally {
            setSubmitting(false);
        }
    }, [activeTask, fetchRoom, getHeaders, navigateToTask, normalizedCode, room?.currentGuidedStep, room?.totalSteps]);

    const submitStepAnswer = useCallback(async () => {
        const headers = getHeaders();
        if (!headers || !room || room.workflowMode !== 'TASK_VALIDATION') return;

        const stepNumber = room.currentGuidedStep || activeTask || 1;
        const answer = (stepAnswers[stepNumber] || '').trim();
        if (!answer) return;

        try {
            setSubmitting(true);
            setError(null);
            setStepResult(null);

            const res = await fetch(
                `/api/ctf/challenges/${encodeURIComponent(normalizedCode)}/step/${stepNumber}/submit`,
                {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({ answer }),
                }
            );
            const data = await res.json().catch(() => ({}));
            if (!res.ok || !data?.success || !data?.result) {
                throw new Error(data?.error || 'Step validation failed.');
            }

            const result = data.result as {
                isCorrect: boolean;
                completed: boolean;
                message?: string;
                currentGuidedStep?: number;
            };

            if (!result.isCorrect) {
                setStepResult({
                    ok: false,
                    message: result.message || 'Incorrect answer. Try again.',
                });
                await fetchRoom();
                return;
            }

            setStepResult({
                ok: true,
                message: result.message || 'Correct answer.',
            });
            await fetchRoom();

            if (result.completed) {
                const finalTask = Math.max(room.totalSteps || stepNumber, stepNumber);
                navigateToTask(finalTask);
                return;
            }

            const nextStep = Math.max(stepNumber + 1, Number(result.currentGuidedStep || stepNumber + 1));
            navigateToTask(nextStep);
        } catch (err) {
            setStepResult({
                ok: false,
                message: err instanceof Error ? err.message : 'Step validation error.',
            });
        } finally {
            setSubmitting(false);
        }
    }, [activeTask, fetchRoom, getHeaders, navigateToTask, normalizedCode, room, stepAnswers]);

    const unlockHint = useCallback(async (hintNumber: number) => {
        const headers = getHeaders();
        if (!headers) return;
        try {
            setSubmitting(true);
            setHintError(null);
            const res = await fetch(`/api/ctf/challenges/${encodeURIComponent(normalizedCode)}/hint/${hintNumber}`, {
                method: 'POST',
                headers,
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok || !data?.success) throw new Error(data?.error || 'Impossible de déverrouiller.');
            await fetchRoom();
        } catch (err) {
            setHintError(err instanceof Error ? err.message : 'Erreur déverrouillage.');
        } finally {
            setSubmitting(false);
        }
    }, [fetchRoom, getHeaders, normalizedCode]);

    const submitFlag = useCallback(async () => {
        const headers = getHeaders();
        if (!headers || !flagInput.trim()) return;
        try {
            setSubmitting(true);
            setFlagResult(null);
            setError(null);
            const res = await fetch(`/api/ctf/challenges/${encodeURIComponent(normalizedCode)}/submit`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ submittedFlag: flagInput.trim(), mode: 'GUIDED', learnerProfile: 'INTERMEDIATE' }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok || !data?.success || !data?.result) throw new Error(data?.error || 'Soumission impossible.');

            if (data.result.isCorrect) {
                setFlagResult({ ok: true, message: data.result.alreadySolved ? 'Already solved!' : 'Correct flag!', points: data.result.pointsAwarded });
                await fetchRoom();
            } else {
                setFlagResult({ ok: false, message: data.result.message || 'Wrong flag. Try again.' });
            }
        } catch (err) {
            setFlagResult({ ok: false, message: err instanceof Error ? err.message : 'Submission error.' });
        } finally {
            setSubmitting(false);
        }
    }, [fetchRoom, flagInput, getHeaders, normalizedCode]);

    const copyCommand = useCallback(async (cmd: string) => {
        try {
            await navigator.clipboard.writeText(cmd);
            setCopiedCmd(true);
            window.setTimeout(() => setCopiedCmd(false), 1500);
        } catch { /* ignore */ }
    }, []);

    useEffect(() => {
        if (room?.labSession?.status !== 'RUNNING') {
            return;
        }

        const interval = window.setInterval(() => {
            void refreshLabSession();
        }, 15_000);

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
        const progressPct = totalSteps > 0
            ? isCompleted ? 100 : Math.round(((currentStep - 1) / totalSteps) * 100)
            : 0;

        const labSession = room.labSession || null;
        const machineIp = labSession?.machineIp || getMachineIp(room.targetService);
        const sessionStatus = labSession?.status || 'STOPPED';
        const sessionExpiresAtMs = labSession?.expiresAt ? new Date(labSession.expiresAt).getTime() : 0;
        const sessionRemainingSec = sessionExpiresAtMs > 0
            ? Math.max(0, Math.floor((sessionExpiresAtMs - nowMs) / 1000))
            : Math.max(0, Number(labSession?.timeRemainingSec || 0));
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

        // Current step data
        const activeStepData = steps.find((s) => s.stepNumber === selectedTask) || null;
        const isTaskDone = isCompleted || selectedTask < currentStep;
        const isTaskActive = !isCompleted && selectedTask === currentStep;
        const isTaskFuture = !isCompleted && selectedTask > currentStep;

        const hints = room.hints || [];
        const activeHints = hints; // show all hints in the flag task

        const diff = DIFFICULTY_STYLES[room.difficulty] || { label: room.difficulty, tone: 'slate' as const };
        const catLabel = CATEGORY_LABELS[room.category] || room.category;

        return {
            status, isCompleted, isInProgress, isUnlocked, isLocked,
            workflowMode, isTaskValidationWorkflow, showFlagTask,
            steps, totalSteps, currentStep, progressPct, selectedTask,
            machineIp, flagTaskIndex, isFlagTask,
            labSession, sessionStatus, sessionRemainingSec, hasRunningSession, canExtendSession, attackboxPath,
            activeStepData, isTaskDone, isTaskActive, isTaskFuture,
            hints, activeHints,
            diff, catLabel,
        };
    }, [room, activeTask, nowMs]);

    // ─── Loading / error states ───────────────────────────────────────────────

    if (authLoading || loading) {
        return (
            <CoursePageShell
                title="Chargement..."
                icon={<Shield className="h-7 w-7 text-orange-300" />}
                crumbs={[
                    { label: 'Mon Parcours', href: '/student' },
                    { label: 'Security Labs', href: APP_URLS.studentCtf },
                    { label: '...' },
                ]}
                backHref={APP_URLS.studentCtf}
                backLabel="Security Labs"
            >
                <CourseCard className="p-8">
                    <div className="flex items-center gap-3 text-slate-300">
                        <RefreshCw className="h-5 w-5 animate-spin text-orange-400" />
                        <span className="text-sm">Chargement de la room...</span>
                    </div>
                    <div className="mt-6 space-y-3 animate-pulse">
                        <div className="h-3 w-2/3 rounded bg-slate-800/70" />
                        <div className="h-3 w-full rounded bg-slate-800/50" />
                        <div className="h-3 w-5/6 rounded bg-slate-800/40" />
                    </div>
                </CourseCard>
            </CoursePageShell>
        );
    }

    if (!room || !vm) {
        return (
            <CoursePageShell
                title="Room introuvable"
                description={error || 'Cette room est introuvable.'}
                icon={<AlertCircle className="h-7 w-7 text-red-300" />}
                crumbs={[
                    { label: 'Mon Parcours', href: '/student' },
                    { label: 'Security Labs', href: APP_URLS.studentCtf },
                    { label: 'Erreur' },
                ]}
                backHref={APP_URLS.studentCtf}
                backLabel="Security Labs"
            >
                <CourseCard className="border border-red-500/20 bg-red-500/5 p-6">
                    <div className="flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 text-red-300 mt-0.5 flex-shrink-0" />
                        <div>
                            <p className="font-semibold text-white">Impossible de charger la room</p>
                            <p className="mt-1 text-sm text-red-100/80">{error || 'Erreur inconnue.'}</p>
                            <div className="mt-4 flex gap-2">
                                <button onClick={() => void fetchRoom()} className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-sm font-semibold">
                                    Réessayer
                                </button>
                                <Link href={APP_URLS.studentCtf} className="px-4 py-2 rounded-xl border border-white/10 bg-slate-900/40 text-sm font-semibold hover:bg-slate-900/60">
                                    Retour
                                </Link>
                            </div>
                        </div>
                    </div>
                </CourseCard>
            </CoursePageShell>
        );
    }

    // ─── Aside (task list + machine panel) ───────────────────────────────────

    const aside = (
        <div className="space-y-3">
            {/* Task navigation */}
            <CourseCard className="p-0 overflow-hidden">
                <div className="px-4 py-3 border-b border-white/8">
                    <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">Tasks</p>
                </div>
                <div className="py-1">
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
                                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                                    isSelected
                                        ? 'bg-orange-500/10 border-r-2 border-orange-400'
                                        : 'hover:bg-white/4'
                                } ${isFuture ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
                            >
                                <div className={`h-5 w-5 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-black ${
                                    isDone ? 'bg-emerald-500 text-slate-950' :
                                    isActive ? 'bg-orange-500 text-slate-950' :
                                    'bg-slate-800 text-slate-500 border border-slate-700'
                                }`}>
                                    {isDone ? <CheckCircle2 size={11} /> : step.stepNumber}
                                </div>
                                <span className={`text-xs font-medium truncate ${
                                    isDone ? 'text-emerald-300' :
                                    isActive ? 'text-orange-200' :
                                    isFuture ? 'text-slate-600' :
                                    'text-slate-300'
                                }`}>
                                    {step.stepTitle}
                                </span>
                            </button>
                        );
                    })}

                    {/* Flag task */}
                    {vm.showFlagTask && vm.totalSteps > 0 && (
                        <>
                            <div className="mx-4 my-1 border-t border-white/5" />
                            <button
                                onClick={() => (vm.isCompleted || vm.currentStep >= vm.totalSteps) && navigateToTask(vm.flagTaskIndex)}
                                disabled={!vm.isCompleted && vm.currentStep < vm.totalSteps}
                                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                                    vm.selectedTask === vm.flagTaskIndex
                                        ? 'bg-amber-500/10 border-r-2 border-amber-400'
                                        : 'hover:bg-white/4'
                                } ${!vm.isCompleted && vm.currentStep < vm.totalSteps ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
                            >
                                <div className={`h-5 w-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                                    vm.isCompleted ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 border border-slate-700'
                                }`}>
                                    {vm.isCompleted ? <Trophy size={11} /> : <Flag size={10} className="text-slate-500" />}
                                </div>
                                <span className={`text-xs font-medium ${vm.isCompleted ? 'text-amber-300' : 'text-slate-500'}`}>
                                    Find the Flag
                                </span>
                            </button>
                        </>
                    )}
                </div>
            </CourseCard>

            {/* Machine panel */}
            <CourseCard className="p-4">
                <div className="flex items-center gap-2 mb-3">
                    <Monitor size={14} className="text-cyan-300" />
                    <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">Machine cible</p>
                </div>
                <div className="space-y-2">
                    <div className="rounded-lg bg-slate-950/60 border border-white/8 px-3 py-2">
                        <p className="text-[10px] text-slate-500 mb-0.5">Service</p>
                        <p className="text-xs font-mono text-cyan-200">{room.targetService}</p>
                    </div>
                    <div className="rounded-lg bg-slate-950/60 border border-white/8 px-3 py-2">
                        <p className="text-[10px] text-slate-500 mb-0.5">Session</p>
                        <p className={`text-xs font-semibold ${
                            vm.sessionStatus === 'RUNNING' ? 'text-emerald-300'
                                : vm.sessionStatus === 'PROVISIONING' ? 'text-amber-300'
                                    : vm.sessionStatus === 'FAILED' ? 'text-rose-300'
                                        : 'text-slate-300'
                        }`}>
                            {vm.sessionStatus}
                        </p>
                    </div>
                    <div className="rounded-lg bg-slate-950/60 border border-white/8 px-3 py-2">
                        <p className="text-[10px] text-slate-500 mb-0.5">IP / Host</p>
                        <p className="text-xs font-mono text-emerald-300">{vm.machineIp}</p>
                    </div>
                    <div className="rounded-lg bg-slate-950/60 border border-white/8 px-3 py-2">
                        <p className="text-[10px] text-slate-500 mb-0.5">Temps restant</p>
                        <p className="text-xs font-mono text-amber-200">
                            {vm.labSession ? formatRemainingTime(vm.sessionRemainingSec) : '--:--'}
                        </p>
                    </div>
                </div>
                <div className="mt-3 space-y-2">
                    <Link
                        href={`${APP_URLS.studentCtf}/${encodeURIComponent(normalizedCode)}/terminal`}
                        className={`w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-white text-xs font-bold transition-colors ${
                            vm.hasRunningSession
                                ? 'bg-cyan-600 hover:bg-cyan-500'
                                : 'bg-slate-700/70 hover:bg-slate-700'
                        }`}
                    >
                        <Terminal size={13} />
                        Open AttackBox
                    </Link>
                    <a
                        href={vm.attackboxPath}
                        target="_blank"
                        rel="noreferrer"
                        className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-white/10 bg-slate-900/40 hover:bg-slate-900/60 text-xs font-semibold text-slate-300 transition-colors"
                    >
                        <ExternalLink size={12} />
                        AttackBox (onglet)
                    </a>
                    {vm.hasRunningSession ? (
                        <>
                            <button
                                onClick={() => void extendSession()}
                                disabled={submitting || !vm.canExtendSession}
                                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-xs font-semibold transition-colors"
                            >
                                {submitting ? <RefreshCw size={12} className="animate-spin" /> : <ArrowRight size={12} />}
                                Extend +60m
                            </button>
                            <button
                                onClick={() => void resetSession()}
                                disabled={submitting}
                                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-white/10 bg-slate-900/40 hover:bg-slate-900/60 disabled:opacity-50 text-xs font-semibold text-slate-200 transition-colors"
                            >
                                {submitting ? <RefreshCw size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                                Reset Machine
                            </button>
                            <button
                                onClick={() => void terminateSession()}
                                disabled={submitting}
                                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-rose-400/30 bg-rose-500/10 hover:bg-rose-500/20 disabled:opacity-50 text-xs font-semibold text-rose-200 transition-colors"
                            >
                                {submitting ? <RefreshCw size={12} className="animate-spin" /> : <AlertCircle size={12} />}
                                Terminate
                            </button>
                        </>
                    ) : (
                        <button
                            onClick={() => void startRoom()}
                            disabled={submitting}
                            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 disabled:opacity-60 text-white text-xs font-semibold transition-colors"
                        >
                            {submitting ? <RefreshCw size={12} className="animate-spin" /> : <Zap size={12} />}
                            Start Machine
                        </button>
                    )}
                </div>
            </CourseCard>

            {/* Quick links */}
            <CourseCard className="p-3">
                <div className="space-y-1">
                    <Link
                        href={APP_URLS.studentCtfLeaderboard}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
                    >
                        <Trophy size={12} className="text-amber-300" />
                        Leaderboard
                    </Link>
                    {room.relatedWorkshopPath && (
                        <Link
                            href={room.relatedWorkshopPath}
                            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
                        >
                            <BookOpen size={12} className="text-indigo-300" />
                            Revoir la théorie
                        </Link>
                    )}
                    <Link
                        href={`${APP_URLS.studentCtf}/${encodeURIComponent(normalizedCode)}/remediation`}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
                    >
                        <Shield size={12} className="text-emerald-300" />
                        Remédiation
                    </Link>
                </div>
            </CourseCard>
        </div>
    );

    // ─── Main content ─────────────────────────────────────────────────────────

    // Locked state
    if (vm.isLocked) {
        return (
            <CoursePageShell
                title={room.title}
                description={room.description}
                icon={<Lock className="h-7 w-7 text-slate-400" />}
                crumbs={[
                    { label: 'Mon Parcours', href: '/student' },
                    { label: 'Security Labs', href: APP_URLS.studentCtf },
                    { label: room.code },
                ]}
                backHref={APP_URLS.studentCtf}
                backLabel="Security Labs"
                meta={
                    <>
                        <CoursePill tone="slate">{room.code}</CoursePill>
                        <CoursePill tone={vm.diff.tone}>{vm.diff.label}</CoursePill>
                        <CoursePill tone="slate">{vm.catLabel}</CoursePill>
                        <CoursePill tone="slate">Locked</CoursePill>
                    </>
                }
            >
                <CourseCard className="border border-amber-500/20 bg-amber-500/5 p-8">
                    <div className="flex items-start gap-4">
                        <Lock className="h-6 w-6 text-amber-300 mt-0.5 flex-shrink-0" />
                        <div>
                            <h2 className="text-xl font-bold text-white">Room verrouillée</h2>
                            <p className="mt-2 text-sm text-slate-300">
                                Terminez le prérequis <span className="font-mono text-amber-200">{room.prerequisiteChallengeCode}</span> pour débloquer cette room.
                            </p>
                            <div className="mt-5">
                                <Link href={APP_URLS.studentCtf} className="px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-sm font-semibold inline-flex items-center gap-2">
                                    Voir toutes les rooms
                                </Link>
                            </div>
                        </div>
                    </div>
                </CourseCard>
            </CoursePageShell>
        );
    }

    return (
        <CoursePageShell
            title={room.title}
            description={room.description}
            icon={<Shield className="h-7 w-7 text-orange-300" />}
            crumbs={[
                { label: 'Mon Parcours', href: '/student' },
                { label: 'Security Labs', href: APP_URLS.studentCtf },
                { label: room.code },
            ]}
            backHref={APP_URLS.studentCtf}
            backLabel="Security Labs"
            meta={
                <>
                    <CoursePill tone="slate">{room.code}</CoursePill>
                    <CoursePill tone={vm.diff.tone}>{vm.diff.label}</CoursePill>
                    <CoursePill tone="slate">{vm.catLabel}</CoursePill>
                    <CoursePill tone="slate">{room.points} pts</CoursePill>
                    <CoursePill tone="slate">~{room.estimatedMinutes} min</CoursePill>
                    {vm.isCompleted && (
                        <CoursePill tone="emerald">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Completed
                        </CoursePill>
                    )}
                    {vm.isInProgress && (
                        <CoursePill tone="amber">
                            <Flame className="h-3.5 w-3.5" /> In Progress
                        </CoursePill>
                    )}
                </>
            }
            headerFooter={
                vm.totalSteps > 0 && (vm.isInProgress || vm.isCompleted) ? (
                    <div className="flex items-center gap-3">
                        <div className="h-1.5 flex-1 rounded-full bg-slate-800 overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all duration-700 ${vm.isCompleted ? 'bg-emerald-500' : 'bg-orange-400'}`}
                                style={{ width: `${vm.progressPct}%` }}
                            />
                        </div>
                        <span className="text-xs font-mono text-slate-400">
                            {vm.isCompleted ? vm.totalSteps : vm.currentStep - 1}/{vm.totalSteps} tasks
                        </span>
                    </div>
                ) : null
            }
            actions={
                <button
                    onClick={() => void fetchRoom()}
                    disabled={refreshing}
                    className={`px-3 py-2 rounded-xl border border-white/10 bg-slate-900/40 hover:bg-slate-900/60 text-sm inline-flex items-center gap-2 transition-colors ${refreshing ? 'opacity-60' : ''}`}
                >
                    <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                </button>
            }
            aside={aside}
        >
            <div className="space-y-5">
                {/* Error banner */}
                {error && (
                    <CourseCard className="border border-red-500/20 bg-red-500/5 p-4">
                        <div className="flex items-start gap-3">
                            <AlertCircle className="h-4 w-4 text-red-300 mt-0.5 flex-shrink-0" />
                            <p className="text-sm text-red-100/90">{error}</p>
                        </div>
                    </CourseCard>
                )}

                {/* UNLOCKED → Start */}
                {vm.isUnlocked && (
                    <CourseCard className="p-8">
                        <div className="flex items-start gap-4">
                            <div className="h-12 w-12 rounded-2xl bg-orange-500/15 border border-orange-500/25 flex items-center justify-center flex-shrink-0">
                                <Zap size={22} className="text-orange-300" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h2 className="text-xl font-black text-white">Ready to start?</h2>
                                <p className="mt-2 text-sm text-slate-300 leading-relaxed">
                                    {room.description}
                                </p>
                                {room.learningObjectives.length > 0 && (
                                    <div className="mt-4">
                                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">What you&apos;ll learn</p>
                                        <ul className="space-y-1">
                                            {room.learningObjectives.map((obj, i) => (
                                                <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                                                    <ChevronRight size={14} className="text-orange-400 flex-shrink-0 mt-0.5" />
                                                    {obj}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                                <div className="mt-6 flex flex-wrap items-center gap-3">
                                    <Link
                                        href={`${APP_URLS.studentCtf}/${encodeURIComponent(normalizedCode)}/terminal`}
                                        className="px-4 py-2.5 rounded-xl border border-white/10 bg-slate-900/40 hover:bg-slate-900/60 text-sm font-semibold inline-flex items-center gap-2"
                                    >
                                        <Terminal size={15} className="text-cyan-300" />
                                        Open AttackBox
                                    </Link>
                                    <button
                                        onClick={() => void startRoom()}
                                        disabled={submitting}
                                        className="px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 disabled:opacity-60 text-white text-sm font-bold inline-flex items-center gap-2 shadow-lg shadow-orange-900/30"
                                    >
                                        {submitting ? <RefreshCw size={15} className="animate-spin" /> : <Zap size={15} />}
                                        {submitting ? 'Starting...' : 'Start Room'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </CourseCard>
                )}

                {/* Active task content (IN_PROGRESS or COMPLETED) */}
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
                        onStepAnswerChange={(value) => setStepAnswers((prev) => ({
                            ...prev,
                            [vm.activeStepData!.stepNumber]: value,
                        }))}
                        onSubmitAnswer={submitStepAnswer}
                        stepResult={stepResult}
                        onCopy={copyCommand}
                        copiedCmd={copiedCmd}
                    />
                )}

                {/* Hints — shown on active task */}
                {(vm.isInProgress || vm.isCompleted) && !vm.isFlagTask && vm.isTaskActive && vm.hints.length > 0 && (
                    <HintsCard
                        hints={vm.hints}
                        submitting={submitting}
                        hintError={hintError}
                        onUnlock={unlockHint}
                    />
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

                {/* Completed room — full completion card */}
                {vm.isCompleted && (vm.isFlagTask || vm.isTaskValidationWorkflow) && (
                    <CourseCard className="p-8 border border-emerald-500/20 bg-emerald-500/5">
                        <div className="text-center">
                            <div className="h-16 w-16 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mx-auto mb-4">
                                <Trophy size={32} className="text-amber-300" />
                            </div>
                            <h2 className="text-2xl font-black text-white">Room Completed!</h2>
                            <p className="mt-2 text-sm text-slate-300">
                                You&apos;ve successfully compromised the target and captured the flag.
                            </p>
                            <div className="mt-6 flex flex-wrap justify-center gap-3">
                                <Link
                                    href={`${APP_URLS.studentCtf}/${encodeURIComponent(normalizedCode)}/remediation`}
                                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold inline-flex items-center gap-2"
                                >
                                    <Shield size={15} />
                                    View Remediation
                                </Link>
                                <Link
                                    href={APP_URLS.studentCtf}
                                    className="px-5 py-2.5 rounded-xl border border-white/10 bg-slate-900/40 hover:bg-slate-900/60 text-sm font-semibold inline-flex items-center gap-2"
                                >
                                    All Rooms
                                </Link>
                            </div>
                        </div>
                    </CourseCard>
                )}
            </div>
        </CoursePageShell>
    );
}

// ─── TaskCard ─────────────────────────────────────────────────────────────────

function TaskCard({
    step,
    machineIp,
    isDone,
    isActive,
    isFuture,
    isCompleted,
    totalSteps,
    submitting,
    workflowMode,
    onAdvance,
    stepAnswer,
    onStepAnswerChange,
    onSubmitAnswer,
    stepResult,
    onCopy,
    copiedCmd,
}: {
    step: GuidedStep;
    machineIp: string;
    isDone: boolean;
    isActive: boolean;
    isFuture: boolean;
    isCompleted: boolean;
    totalSteps: number;
    submitting: boolean;
    workflowMode: WorkflowMode;
    onAdvance: () => void;
    stepAnswer: string;
    onStepAnswerChange: (value: string) => void;
    onSubmitAnswer: () => void;
    stepResult: { ok: boolean; message: string } | null;
    onCopy: (cmd: string) => void;
    copiedCmd: boolean;
}) {
    const processedCmd = step.commandTemplate ? substituteIp(step.commandTemplate, machineIp) : null;
    const processedDesc = substituteIp(step.stepDescription, machineIp);
    const expectsLongAnswer = step.stepType === 'EXPLANATION';

    return (
        <CourseCard className={`p-6 md:p-8 transition-all ${
            isDone ? 'border-emerald-500/15 bg-emerald-500/3' :
            isActive ? 'border-orange-500/20' :
            isFuture ? 'border-white/5 opacity-60' :
            ''
        }`}>
            {/* Task header */}
            <div className="flex items-start gap-4 mb-5">
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 text-sm font-black ${
                    isDone ? 'bg-emerald-500 text-slate-950' :
                    isActive ? 'bg-orange-500 text-slate-950' :
                    'bg-slate-800 text-slate-300'
                }`}>
                    {isDone ? <CheckCircle2 size={18} /> : step.stepNumber}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-lg font-bold text-white">{step.stepTitle}</h2>
                        {isDone && !isCompleted && (
                            <span className="text-xs text-emerald-300 font-semibold">Done</span>
                        )}
                        {isActive && (
                            <span className="text-xs text-orange-300 font-semibold bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 rounded-full">
                                Current task
                            </span>
                        )}
                    </div>
                    <p className="mt-1 text-xs text-slate-500 font-semibold uppercase tracking-wider">
                        Task {step.stepNumber} / {totalSteps}
                    </p>
                </div>
            </div>

            {/* Instructions */}
            <div className="prose prose-invert prose-sm max-w-none">
                <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{processedDesc}</p>
            </div>

            {/* Command template */}
            {processedCmd && (
                <div className="mt-5">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Command</p>
                        <button
                            onClick={() => onCopy(processedCmd)}
                            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
                        >
                            <Copy size={12} />
                            {copiedCmd ? 'Copied!' : 'Copy'}
                        </button>
                    </div>
                    <pre className="rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3.5 text-sm text-emerald-200 overflow-x-auto whitespace-pre-wrap leading-relaxed font-mono">
                        {processedCmd}
                    </pre>
                </div>
            )}

            {/* Expected output */}
            {step.expectedOutput && (
                <div className="mt-4">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Expected Output</p>
                    <pre className="rounded-xl border border-white/8 bg-slate-950/40 px-4 py-3 text-xs text-slate-400 overflow-x-auto whitespace-pre-wrap font-mono">
                        {substituteIp(step.expectedOutput, machineIp)}
                    </pre>
                </div>
            )}

            {/* Step hint */}
            {step.hintText && isActive && (
                <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
                    <Lightbulb size={14} className="text-amber-300 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-amber-200 leading-relaxed">{substituteIp(step.hintText, machineIp)}</p>
                </div>
            )}

            {/* Task answer validation */}
            {isActive && !isCompleted && workflowMode === 'TASK_VALIDATION' && (
                <div className="mt-6 space-y-3">
                    {stepResult && (
                        <div className={`rounded-xl border px-4 py-3 text-sm ${
                            stepResult.ok
                                ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-100'
                                : 'bg-red-500/10 border-red-500/25 text-red-100'
                        }`}>
                            <p className="font-semibold flex items-center gap-2">
                                {stepResult.ok ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
                                {stepResult.message}
                            </p>
                        </div>
                    )}
                    <div className="flex flex-col sm:flex-row gap-2">
                        {expectsLongAnswer ? (
                            <textarea
                                value={stepAnswer}
                                onChange={(e) => onStepAnswerChange(e.target.value)}
                                placeholder="Enter your answer"
                                className="flex-1 min-h-[132px] px-4 py-3 rounded-xl bg-slate-950/50 border border-white/10 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                            />
                        ) : (
                            <input
                                type="text"
                                value={stepAnswer}
                                onChange={(e) => onStepAnswerChange(e.target.value)}
                                placeholder="Enter your answer"
                                className="flex-1 px-4 py-3 rounded-xl bg-slate-950/50 border border-white/10 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                                onKeyDown={(e) => e.key === 'Enter' && onSubmitAnswer()}
                            />
                        )}
                        <button
                            onClick={onSubmitAnswer}
                            disabled={submitting || !stepAnswer.trim()}
                            className="px-5 py-3 rounded-xl bg-orange-600 hover:bg-orange-500 disabled:opacity-60 text-white text-sm font-bold inline-flex items-center justify-center gap-2 shadow-lg shadow-orange-900/20"
                        >
                            {submitting ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
                            Verify
                        </button>
                    </div>
                </div>
            )}

            {/* Manual progression (legacy rooms) */}
            {isActive && !isCompleted && workflowMode === 'FLAG_ONLY' && (
                <div className="mt-6 flex items-center gap-3">
                    <button
                        onClick={onAdvance}
                        disabled={submitting}
                        className="px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 disabled:opacity-60 text-white text-sm font-bold inline-flex items-center gap-2 shadow-lg shadow-orange-900/20"
                    >
                        {submitting ? <RefreshCw size={14} className="animate-spin" /> : <ArrowRight size={14} />}
                        {submitting ? 'Loading...' : 'Mark Complete & Next'}
                    </button>
                </div>
            )}
        </CourseCard>
    );
}

// ─── HintsCard ────────────────────────────────────────────────────────────────

function HintsCard({
    hints,
    submitting,
    hintError,
    onUnlock,
}: {
    hints: HintInfo[];
    submitting: boolean;
    hintError: string | null;
    onUnlock: (n: number) => void;
}) {
    const [open, setOpen] = useState(false);

    return (
        <CourseCard className="p-5">
            <button
                onClick={() => setOpen((v) => !v)}
                className="w-full flex items-center justify-between"
            >
                <div className="flex items-center gap-2">
                    <Lightbulb size={16} className="text-amber-300" />
                    <span className="text-sm font-bold text-white">Hints</span>
                    <span className="text-xs text-slate-500">
                        ({hints.filter((h) => h.unlocked).length}/{hints.length} unlocked)
                    </span>
                </div>
                <ChevronRight size={16} className={`text-slate-500 transition-transform ${open ? 'rotate-90' : ''}`} />
            </button>

            {open && (
                <div className="mt-4 space-y-2">
                    {hintError && (
                        <p className="text-xs text-red-300 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{hintError}</p>
                    )}
                    {hints.map((hint) => (
                        <div key={hint.hintNumber} className="rounded-xl border border-white/8 bg-slate-950/40 p-4">
                            <div className="flex items-center justify-between gap-3">
                                <p className="text-sm font-semibold text-white">Hint {hint.hintNumber}</p>
                                {hint.unlocked ? (
                                    <span className="text-xs text-emerald-300 font-semibold">Unlocked</span>
                                ) : (
                                    <button
                                        onClick={() => onUnlock(hint.hintNumber)}
                                        disabled={submitting || hint.eligible === false}
                                        className="px-3 py-1.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-200 text-xs font-semibold hover:bg-amber-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        Unlock (−{hint.costPoints} pts)
                                    </button>
                                )}
                            </div>
                            {!hint.unlocked && hint.lockedReason && (
                                <p className="mt-1.5 text-xs text-amber-100/70">{hint.lockedReason}</p>
                            )}
                            {!hint.unlocked && hint.unlockPolicy && (
                                <p className="mt-1 text-[11px] text-slate-500">
                                    Disponible après {hint.unlockPolicy.minMinutes} min ou {hint.unlockPolicy.minFailedAttempts} essais.
                                    Actuel: {hint.unlockPolicy.elapsedMinutes} min / {hint.unlockPolicy.failedAttempts} essais.
                                </p>
                            )}
                            {hint.unlocked && hint.hintText && (
                                <p className="mt-2 text-sm text-slate-300 leading-relaxed">{hint.hintText}</p>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </CourseCard>
    );
}

// ─── FlagTaskCard ─────────────────────────────────────────────────────────────

function FlagTaskCard({
    room,
    machineIp,
    isCompleted,
    flagInput,
    setFlagInput,
    flagResult,
    submitting,
    onSubmit,
    normalizedCode,
    hints,
    onUnlockHint,
    hintError,
}: {
    room: RoomDetail;
    machineIp: string;
    isCompleted: boolean;
    flagInput: string;
    setFlagInput: (v: string) => void;
    flagResult: { ok: boolean; message: string; points?: number } | null;
    submitting: boolean;
    onSubmit: () => void;
    normalizedCode: string;
    hints: HintInfo[];
    onUnlockHint: (n: number) => void;
    hintError: string | null;
}) {
    return (
        <CourseCard className={`p-6 md:p-8 ${isCompleted ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-amber-500/15'}`}>
            {/* Header */}
            <div className="flex items-start gap-4 mb-6">
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    isCompleted ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 border border-amber-500/30'
                }`}>
                    {isCompleted ? <Trophy size={18} /> : <Flag size={16} className="text-amber-300" />}
                </div>
                <div>
                    <h2 className="text-lg font-bold text-white">Find the Flag</h2>
                    <p className="mt-1 text-sm text-slate-400">
                        Submit the flag you found in the target system.
                    </p>
                </div>
            </div>

            {/* Instructions */}
            <div className="mb-5 rounded-xl border border-white/8 bg-slate-950/40 p-4">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Target Info</p>
                <div className="space-y-1">
                    <p className="text-sm font-mono text-cyan-200">
                        {substituteIp(room.targetEndpoint, machineIp)}
                    </p>
                    <p className="text-xs text-slate-500">
                        Service: <span className="text-slate-300">{room.targetService}</span>
                        {' · '}Machine IP: <span className="font-mono text-emerald-300">{machineIp}</span>
                    </p>
                </div>
            </div>

            {/* Flag format hint */}
            <div className="mb-5 flex items-center gap-2 text-xs text-slate-500">
                <Flag size={12} className="text-amber-300" />
                Flag format: <span className="font-mono text-amber-200">PMP&#123;...&#125;</span>
                {' '}or check <span className="font-mono text-slate-300">user.txt</span> / <span className="font-mono text-slate-300">root.txt</span>
            </div>

            {/* Submission result */}
            {flagResult && (
                <div className={`mb-4 rounded-xl border p-4 ${
                    flagResult.ok
                        ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-100'
                        : 'bg-red-500/10 border-red-500/25 text-red-100'
                }`}>
                    <p className="text-sm font-semibold flex items-center gap-2">
                        {flagResult.ok ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
                        {flagResult.message}
                        {flagResult.ok && typeof flagResult.points === 'number' && (
                            <span className="ml-auto font-mono text-emerald-300">+{flagResult.points} pts</span>
                        )}
                    </p>
                </div>
            )}

            {/* Input */}
            {!isCompleted ? (
                <div className="flex flex-col sm:flex-row gap-2">
                    <input
                        type="text"
                        value={flagInput}
                        onChange={(e) => setFlagInput(e.target.value)}
                        placeholder="PMP{...}"
                        className="flex-1 px-4 py-3 rounded-xl bg-slate-950/50 border border-white/10 text-sm font-mono text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                        onKeyDown={(e) => e.key === 'Enter' && onSubmit()}
                    />
                    <button
                        onClick={onSubmit}
                        disabled={submitting || !flagInput.trim()}
                        className="px-5 py-3 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-sm font-bold inline-flex items-center justify-center gap-2"
                    >
                        {submitting ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
                        Submit Flag
                    </button>
                </div>
            ) : (
                <div className="flex flex-wrap gap-3">
                    <Link
                        href={`${APP_URLS.studentCtf}/${encodeURIComponent(normalizedCode)}/remediation`}
                        className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold inline-flex items-center gap-2"
                    >
                        <Shield size={14} /> View Remediation
                    </Link>
                    <Link
                        href={APP_URLS.studentCtfLeaderboard}
                        className="px-5 py-2.5 rounded-xl border border-white/10 bg-slate-900/40 hover:bg-slate-900/60 text-sm font-semibold inline-flex items-center gap-2"
                    >
                        <Trophy size={14} className="text-amber-300" /> Leaderboard
                    </Link>
                </div>
            )}

            {/* Hints on flag task */}
            {hints.length > 0 && !isCompleted && (
                <div className="mt-5 pt-5 border-t border-white/5">
                    <HintsCard hints={hints} submitting={submitting} hintError={hintError} onUnlock={onUnlockHint} />
                </div>
            )}
        </CourseCard>
    );
}
