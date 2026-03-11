'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ArrowLeft,
    CheckCircle2,
    Clock,
    Play,
    RefreshCw,
    RotateCcw,
    Server,
    SquareTerminal,
    StopCircle,
    Terminal,
} from 'lucide-react';
import { useAuth } from '../../../../../../auth/useAuth';
import { NotionBadge, NotionCard, NotionEmptyState, NotionProgress, NotionSkeleton } from '@shared/components/notion';
import { UnitDetail, UnitTask } from '../../../../types';

interface UnitDetailPayload {
    success: boolean;
    unit?: UnitDetail;
    error?: string;
}

interface TaskSubmissionPayload {
    success: boolean;
    result?: {
        isCorrect: boolean;
        message: string;
        taskStatus: string;
        unitStatus: string;
    };
    error?: string;
}

interface SessionActionPayload {
    success: boolean;
    session?: UnitDetail['lab']['session'];
    error?: string;
}

interface TaskFeedback {
    type: 'success' | 'error';
    message: string;
}

function isMarkDoneTask(task: UnitTask): boolean {
    const type = task.taskType.toUpperCase();
    const mode = String(task.answerSchema?.mode || '').toUpperCase();
    return mode === 'MARK_DONE'
        || type === 'READING'
        || type === 'CHECKLIST'
        || type === 'RESOURCE';
}

function isQuizTask(task: UnitTask): boolean {
    const type = task.taskType.toUpperCase();
    const mode = String(task.answerSchema?.mode || '').toUpperCase();
    return type === 'QUIZ' || mode.startsWith('QUIZ');
}

function getOptionLabel(option: unknown, index: number): string {
    if (typeof option === 'string') {
        return option;
    }
    if (option && typeof option === 'object') {
        const value = option as Record<string, unknown>;
        if (typeof value.label === 'string') return value.label;
        if (typeof value.text === 'string') return value.text;
        if (typeof value.value === 'string') return value.value;
    }
    return `Option ${index + 1}`;
}

function formatRemainingSeconds(totalSeconds: number): string {
    const safeSeconds = Math.max(0, totalSeconds);
    const hours = Math.floor(safeSeconds / 3600);
    const minutes = Math.floor((safeSeconds % 3600) / 60);
    const seconds = safeSeconds % 60;

    if (hours > 0) {
        return `${hours}h ${String(minutes).padStart(2, '0')}m`;
    }
    return `${minutes}m ${String(seconds).padStart(2, '0')}s`;
}

function getTaskStatusVariant(status: UnitTask['status']): 'success' | 'warning' | 'default' {
    if (status === 'COMPLETED') return 'success';
    if (status === 'IN_PROGRESS' || status === 'UNLOCKED') return 'warning';
    return 'default';
}

export default function UaDetailPage() {
    const { isLoading: authLoading } = useAuth(true);
    const params = useParams();
    const cursusId = params?.cursusId as string;
    const moduleId = params?.moduleId as string;
    const unitId = params?.unitId as string;

    const [unit, setUnit] = useState<UnitDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [taskAnswers, setTaskAnswers] = useState<Record<string, string>>({});
    const [taskFeedback, setTaskFeedback] = useState<Record<string, TaskFeedback>>({});
    const [submittingTaskId, setSubmittingTaskId] = useState<string | null>(null);
    const [startingUnit, setStartingUnit] = useState(false);
    const [sessionBusy, setSessionBusy] = useState(false);
    const [clockNow, setClockNow] = useState(Date.now());

    const fetchUnit = useCallback(async () => {
        if (!cursusId || !moduleId || !unitId) {
            return;
        }

        try {
            setLoading(true);
            setError(null);
            const token = localStorage.getItem('token');
            if (!token) {
                setError('Session expired.');
                return;
            }

            const response = await fetch(`/api/cursus/${cursusId}/module/${moduleId}/units/${unitId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const payload = await response.json() as UnitDetailPayload;
            if (!response.ok || !payload.success || !payload.unit) {
                throw new Error(payload.error || 'Unable to load this UA.');
            }

            setUnit(payload.unit);
        } catch (fetchError) {
            setError(fetchError instanceof Error ? fetchError.message : 'Unable to load this UA.');
            setUnit(null);
        } finally {
            setLoading(false);
        }
    }, [cursusId, moduleId, unitId]);

    useEffect(() => {
        if (authLoading) {
            return;
        }
        void fetchUnit();
    }, [authLoading, fetchUnit]);

    useEffect(() => {
        const timer = window.setInterval(() => setClockNow(Date.now()), 1000);
        return () => window.clearInterval(timer);
    }, []);

    const handleStartUnit = useCallback(async () => {
        if (!cursusId || !moduleId || !unitId) {
            return;
        }

        try {
            setStartingUnit(true);
            const token = localStorage.getItem('token');
            if (!token) {
                setError('Session expired.');
                return;
            }

            const response = await fetch(`/api/cursus/${cursusId}/module/${moduleId}/units/${unitId}/start`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });
            const payload = await response.json() as UnitDetailPayload;
            if (!response.ok || !payload.success || !payload.unit) {
                throw new Error(payload.error || 'Unable to start this UA.');
            }

            setUnit(payload.unit);
            setError(null);
        } catch (startError) {
            setError(startError instanceof Error ? startError.message : 'Unable to start this UA.');
        } finally {
            setStartingUnit(false);
        }
    }, [cursusId, moduleId, unitId]);

    const handleSubmitTask = useCallback(async (task: UnitTask) => {
        if (!unit || task.status === 'COMPLETED') {
            return;
        }

        const token = localStorage.getItem('token');
        if (!token) {
            setError('Session expired.');
            return;
        }

        let requestBody: Record<string, unknown>;
        if (isMarkDoneTask(task)) {
            requestBody = { done: true };
        } else if (isQuizTask(task)) {
            const selected = Number(taskAnswers[task.taskId]);
            if (!Number.isFinite(selected)) {
                setTaskFeedback((prev) => ({
                    ...prev,
                    [task.taskId]: { type: 'error', message: 'Select one answer before submitting.' },
                }));
                return;
            }
            requestBody = { selectedOptionIndex: selected };
        } else {
            const answer = (taskAnswers[task.taskId] || '').trim();
            if (!answer) {
                setTaskFeedback((prev) => ({
                    ...prev,
                    [task.taskId]: { type: 'error', message: 'Answer is required.' },
                }));
                return;
            }
            requestBody = { answer };
        }

        try {
            setSubmittingTaskId(task.taskId);
            const response = await fetch(
                `/api/cursus/${cursusId}/module/${moduleId}/units/${unit.unitId}/tasks/${task.taskId}/submit`,
                {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(requestBody),
                }
            );

            const payload = await response.json() as TaskSubmissionPayload;
            if (!response.ok || !payload.success || !payload.result) {
                throw new Error(payload.error || 'Task submission failed.');
            }

            setTaskFeedback((prev) => ({
                ...prev,
                [task.taskId]: {
                    type: payload.result?.isCorrect ? 'success' : 'error',
                    message: payload.result?.message || 'Submission saved.',
                },
            }));

            await fetchUnit();
        } catch (submitError) {
            setTaskFeedback((prev) => ({
                ...prev,
                [task.taskId]: {
                    type: 'error',
                    message: submitError instanceof Error ? submitError.message : 'Task submission failed.',
                },
            }));
        } finally {
            setSubmittingTaskId(null);
        }
    }, [cursusId, fetchUnit, moduleId, taskAnswers, unit]);

    const handleSessionAction = useCallback(async (action: 'extend' | 'reset' | 'terminate') => {
        if (!unit?.lab.session) {
            return;
        }

        const token = localStorage.getItem('token');
        if (!token) {
            setError('Session expired.');
            return;
        }

        try {
            setSessionBusy(true);
            const baseUrl = `/api/cursus/units/${unit.unitId}/sessions/${unit.lab.session.sessionId}`;
            const response = await fetch(
                action === 'terminate' ? baseUrl : `${baseUrl}/${action}`,
                {
                    method: action === 'terminate' ? 'DELETE' : 'POST',
                    headers: { Authorization: `Bearer ${token}` },
                }
            );
            const payload = await response.json() as SessionActionPayload;
            if (!response.ok || !payload.success) {
                throw new Error(payload.error || 'Session action failed.');
            }
            await fetchUnit();
        } catch (sessionError) {
            setError(sessionError instanceof Error ? sessionError.message : 'Session action failed.');
        } finally {
            setSessionBusy(false);
        }
    }, [fetchUnit, unit]);

    const sessionRemaining = useMemo(() => {
        if (!unit?.lab.session?.expiresAt) {
            return null;
        }
        const expiryMs = new Date(unit.lab.session.expiresAt).getTime();
        const remaining = Math.max(0, Math.floor((expiryMs - clockNow) / 1000));
        return formatRemainingSeconds(remaining);
    }, [clockNow, unit?.lab.session?.expiresAt]);

    if (authLoading || loading) {
        return (
            <div style={{ padding: 'var(--n-space-8) var(--n-space-6)', maxWidth: '1120px', margin: '0 auto' }}>
                <NotionSkeleton type="line" width="220px" height="16px" />
                <div style={{ marginTop: 'var(--n-space-4)' }}>
                    <NotionSkeleton type="card" />
                </div>
                <div style={{ marginTop: 'var(--n-space-4)', display: 'grid', gap: 'var(--n-space-4)' }}>
                    {[...Array(3)].map((_, index) => (
                        <NotionSkeleton key={index} type="card" />
                    ))}
                </div>
            </div>
        );
    }

    if (!unit) {
        return (
            <div style={{ padding: 'var(--n-space-8) var(--n-space-6)', maxWidth: '1120px', margin: '0 auto' }}>
                <NotionEmptyState
                    icon={<Server size={28} />}
                    title={error || 'UA not found'}
                    description="Check the URL or return to the module overview."
                    action={(
                        <Link
                            href={`/student/cursus/${cursusId}/${moduleId}`}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '8px 14px',
                                borderRadius: 'var(--n-radius-sm)',
                                border: '1px solid var(--n-border)',
                                color: 'var(--n-text-secondary)',
                                textDecoration: 'none',
                                fontSize: 'var(--n-text-sm)',
                            }}
                        >
                            <ArrowLeft size={14} />
                            Back to UA list
                        </Link>
                    )}
                />
            </div>
        );
    }

    return (
        <div style={{ padding: 'var(--n-space-8) var(--n-space-6)', maxWidth: '1120px', margin: '0 auto' }}>
            <Link
                href={`/student/cursus/${cursusId}/${moduleId}`}
                style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    color: 'var(--n-text-secondary)',
                    textDecoration: 'none',
                    fontSize: 'var(--n-text-sm)',
                    marginBottom: 'var(--n-space-5)',
                }}
            >
                <ArrowLeft size={14} />
                Back to UA list
            </Link>

            {error && (
                <div
                    style={{
                        marginBottom: 'var(--n-space-4)',
                        padding: 'var(--n-space-3)',
                        borderRadius: 'var(--n-radius-sm)',
                        border: '1px solid var(--n-danger-border)',
                        background: 'var(--n-danger-bg)',
                        color: 'var(--n-danger)',
                        fontSize: 'var(--n-text-sm)',
                    }}
                >
                    {error}
                </div>
            )}

            <NotionCard padding="md" style={{ marginBottom: 'var(--n-space-5)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--n-space-4)', flexWrap: 'wrap' }}>
                    <div style={{ minWidth: '280px', flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--n-space-2)', marginBottom: 'var(--n-space-2)' }}>
                            {unit.unitCode && <NotionBadge variant="default">{unit.unitCode}</NotionBadge>}
                            <NotionBadge variant={unit.progress.status === 'COMPLETED' ? 'success' : 'inter'}>
                                {unit.progress.status}
                            </NotionBadge>
                            {unit.lab.isEnabled && <NotionBadge variant="warning">Machine</NotionBadge>}
                        </div>
                        <h1 style={{ margin: 0, fontSize: 'var(--n-text-xl)', color: 'var(--n-text-primary)' }}>{unit.title}</h1>
                        <p style={{ margin: 'var(--n-space-2) 0 0', color: 'var(--n-text-secondary)', fontSize: 'var(--n-text-sm)' }}>
                            {unit.summary || 'Complete all required tasks to validate this UA.'}
                        </p>
                    </div>

                    <div style={{ minWidth: '220px', flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--n-text-xs)', color: 'var(--n-text-tertiary)', marginBottom: 'var(--n-space-2)' }}>
                            <span>Task progress</span>
                            <span>{unit.progress.taskCompleted}/{unit.progress.taskTotal || 0}</span>
                        </div>
                        <NotionProgress
                            value={unit.progress.taskTotal > 0 ? Math.round((unit.progress.taskCompleted / unit.progress.taskTotal) * 100) : 0}
                            variant={unit.progress.status === 'COMPLETED' ? 'success' : 'accent'}
                            size="thick"
                        />
                    </div>
                </div>
            </NotionCard>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 'var(--n-space-4)' }}>
                <NotionCard padding="md">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--n-space-4)' }}>
                        <h2 style={{ margin: 0, fontSize: 'var(--n-text-base)', color: 'var(--n-text-primary)' }}>Tasks</h2>
                        {(unit.progress.status === 'UNLOCKED' || unit.progress.status === 'LOCKED') && (
                            <button
                                onClick={() => void handleStartUnit()}
                                disabled={startingUnit}
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '8px 14px',
                                    borderRadius: 'var(--n-radius-sm)',
                                    border: 'none',
                                    background: 'var(--n-accent)',
                                    color: '#fff',
                                    cursor: startingUnit ? 'default' : 'pointer',
                                    fontSize: 'var(--n-text-sm)',
                                }}
                            >
                                <Play size={13} />
                                {startingUnit ? 'Starting...' : 'Start UA'}
                            </button>
                        )}
                    </div>

                    <div style={{ display: 'grid', gap: 'var(--n-space-3)' }}>
                        {unit.tasks.map((task) => (
                            <div
                                key={task.taskId}
                                style={{
                                    border: '1px solid var(--n-border)',
                                    borderRadius: 'var(--n-radius-sm)',
                                    padding: 'var(--n-space-4)',
                                    opacity: 1,
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--n-space-2)', flexWrap: 'wrap', marginBottom: 'var(--n-space-2)' }}>
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--n-space-2)', marginBottom: '4px' }}>
                                            <NotionBadge variant={getTaskStatusVariant(task.status)} size="sm">{task.status}</NotionBadge>
                                            <NotionBadge variant="default" size="sm">Task {task.taskOrder}</NotionBadge>
                                            {task.isRequired && <NotionBadge variant="warning" size="sm">Required</NotionBadge>}
                                        </div>
                                        <h3 style={{ margin: 0, color: 'var(--n-text-primary)', fontSize: 'var(--n-text-sm)' }}>{task.title}</h3>
                                    </div>
                                    <span style={{ fontSize: 'var(--n-text-xs)', color: 'var(--n-text-tertiary)' }}>
                                        {task.points} pts
                                    </span>
                                </div>

                                {task.prompt && (
                                    <p style={{ margin: '0 0 var(--n-space-3)', color: 'var(--n-text-secondary)', fontSize: 'var(--n-text-sm)', whiteSpace: 'pre-wrap' }}>
                                        {task.prompt}
                                    </p>
                                )}

                                {task.status === 'COMPLETED' ? (
                                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: 'var(--n-text-xs)', color: 'var(--n-success)' }}>
                                        <CheckCircle2 size={12} />
                                        Task completed
                                    </div>
                                ) : (
                                    <div style={{ display: 'grid', gap: 'var(--n-space-3)' }}>
                                        {isQuizTask(task) ? (
                                            <div style={{ display: 'grid', gap: 'var(--n-space-2)' }}>
                                                {task.options.map((option, index) => {
                                                    const selectedValue = taskAnswers[task.taskId] ?? '';
                                                    return (
                                                        <label
                                                            key={`${task.taskId}-opt-${index}`}
                                                            style={{
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '8px',
                                                                fontSize: 'var(--n-text-sm)',
                                                                color: 'var(--n-text-secondary)',
                                                            }}
                                                        >
                                                            <input
                                                                type="radio"
                                                                name={`task-${task.taskId}`}
                                                                checked={selectedValue === String(index)}
                                                                onChange={() => {
                                                                    setTaskAnswers((prev) => ({ ...prev, [task.taskId]: String(index) }));
                                                                }}
                                                            />
                                                            {getOptionLabel(option, index)}
                                                        </label>
                                                    );
                                                })}
                                            </div>
                                        ) : !isMarkDoneTask(task) && (
                                            <textarea
                                                value={taskAnswers[task.taskId] || ''}
                                                onChange={(event) => {
                                                    const value = event.target.value;
                                                    setTaskAnswers((prev) => ({ ...prev, [task.taskId]: value }));
                                                }}
                                                rows={3}
                                                placeholder={task.taskType.toUpperCase() === 'VALIDATION' ? 'Enter answer or flag...' : 'Enter your answer...'}
                                                style={{
                                                    width: '100%',
                                                    resize: 'vertical',
                                                    borderRadius: 'var(--n-radius-sm)',
                                                    border: '1px solid var(--n-border)',
                                                    background: 'var(--n-bg-primary)',
                                                    color: 'var(--n-text-primary)',
                                                    padding: 'var(--n-space-2) var(--n-space-3)',
                                                    fontSize: 'var(--n-text-sm)',
                                                }}
                                            />
                                        )}

                                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--n-space-3)', flexWrap: 'wrap' }}>
                                            <button
                                                onClick={() => void handleSubmitTask(task)}
                                                disabled={submittingTaskId === task.taskId}
                                                style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '6px',
                                                    padding: '8px 14px',
                                                    borderRadius: 'var(--n-radius-sm)',
                                                    border: 'none',
                                                    background: 'var(--n-accent)',
                                                    color: '#fff',
                                                    cursor: submittingTaskId === task.taskId ? 'default' : 'pointer',
                                                    fontSize: 'var(--n-text-sm)',
                                                    opacity: submittingTaskId === task.taskId ? 0.7 : 1,
                                                }}
                                            >
                                                {submittingTaskId === task.taskId ? <RefreshCw size={13} /> : <Play size={13} />}
                                                {isMarkDoneTask(task) ? 'Mark done' : 'Submit'}
                                            </button>

                                            {taskFeedback[task.taskId] && (
                                                <span
                                                    style={{
                                                        fontSize: 'var(--n-text-xs)',
                                                        color: taskFeedback[task.taskId].type === 'success' ? 'var(--n-success)' : 'var(--n-danger)',
                                                    }}
                                                >
                                                    {taskFeedback[task.taskId].message}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </NotionCard>
                <NotionCard padding="md">
                    <h2 style={{ margin: '0 0 var(--n-space-3)', fontSize: 'var(--n-text-base)', color: 'var(--n-text-primary)' }}>
                        Machine session
                    </h2>

                    {!unit.lab.isEnabled ? (
                        <p style={{ margin: 0, color: 'var(--n-text-secondary)', fontSize: 'var(--n-text-sm)' }}>
                            No machine is configured for this UA.
                        </p>
                    ) : !unit.lab.session ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--n-space-3)', flexWrap: 'wrap' }}>
                            <p style={{ margin: 0, color: 'var(--n-text-secondary)', fontSize: 'var(--n-text-sm)' }}>
                                No active lab session.
                            </p>
                            <button
                                onClick={() => void handleStartUnit()}
                                disabled={startingUnit}
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '8px 14px',
                                    borderRadius: 'var(--n-radius-sm)',
                                    border: 'none',
                                    background: 'var(--n-accent)',
                                    color: '#fff',
                                    cursor: startingUnit ? 'default' : 'pointer',
                                    fontSize: 'var(--n-text-sm)',
                                }}
                            >
                                <Server size={13} />
                                {startingUnit ? 'Starting machine...' : 'Start machine'}
                            </button>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gap: 'var(--n-space-3)' }}>
                            <div style={{ display: 'flex', gap: 'var(--n-space-3)', flexWrap: 'wrap' }}>
                                <NotionBadge variant="default">{unit.lab.session.status}</NotionBadge>
                                <NotionBadge variant="warning">Flow: {unit.lab.session.flowSource}</NotionBadge>
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: 'var(--n-text-xs)', color: 'var(--n-text-secondary)' }}>
                                    <Clock size={12} />
                                    {sessionRemaining || formatRemainingSeconds(unit.lab.session.timeRemainingSec)}
                                </span>
                            </div>

                            <div style={{ display: 'flex', gap: 'var(--n-space-2)', flexWrap: 'wrap' }}>
                                <a
                                    href={unit.lab.session.attackboxPath}
                                    target="_blank"
                                    rel="noreferrer"
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        padding: '8px 14px',
                                        borderRadius: 'var(--n-radius-sm)',
                                        border: '1px solid var(--n-border)',
                                        color: 'var(--n-text-secondary)',
                                        fontSize: 'var(--n-text-sm)',
                                        textDecoration: 'none',
                                    }}
                                >
                                    <Terminal size={13} />
                                    Open terminal
                                </a>

                                <button
                                    onClick={() => void handleSessionAction('extend')}
                                    disabled={sessionBusy || !unit.lab.session.canExtend}
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        padding: '8px 12px',
                                        borderRadius: 'var(--n-radius-sm)',
                                        border: '1px solid var(--n-border)',
                                        background: 'var(--n-bg-primary)',
                                        color: 'var(--n-text-secondary)',
                                        fontSize: 'var(--n-text-sm)',
                                        cursor: sessionBusy || !unit.lab.session.canExtend ? 'default' : 'pointer',
                                        opacity: sessionBusy || !unit.lab.session.canExtend ? 0.6 : 1,
                                    }}
                                >
                                    <Clock size={12} />
                                    Extend
                                </button>

                                <button
                                    onClick={() => void handleSessionAction('reset')}
                                    disabled={sessionBusy}
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        padding: '8px 12px',
                                        borderRadius: 'var(--n-radius-sm)',
                                        border: '1px solid var(--n-border)',
                                        background: 'var(--n-bg-primary)',
                                        color: 'var(--n-text-secondary)',
                                        fontSize: 'var(--n-text-sm)',
                                        cursor: sessionBusy ? 'default' : 'pointer',
                                    }}
                                >
                                    <RotateCcw size={12} />
                                    Reset
                                </button>

                                <button
                                    onClick={() => void handleSessionAction('terminate')}
                                    disabled={sessionBusy}
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        padding: '8px 12px',
                                        borderRadius: 'var(--n-radius-sm)',
                                        border: '1px solid var(--n-danger-border)',
                                        background: 'var(--n-danger-bg)',
                                        color: 'var(--n-danger)',
                                        fontSize: 'var(--n-text-sm)',
                                        cursor: sessionBusy ? 'default' : 'pointer',
                                    }}
                                >
                                    <StopCircle size={12} />
                                    Terminate
                                </button>

                                <button
                                    onClick={() => void fetchUnit()}
                                    disabled={sessionBusy}
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        padding: '8px 12px',
                                        borderRadius: 'var(--n-radius-sm)',
                                        border: '1px solid var(--n-border)',
                                        background: 'var(--n-bg-primary)',
                                        color: 'var(--n-text-secondary)',
                                        fontSize: 'var(--n-text-sm)',
                                        cursor: sessionBusy ? 'default' : 'pointer',
                                    }}
                                >
                                    <SquareTerminal size={12} />
                                    Refresh
                                </button>
                            </div>
                        </div>
                    )}
                </NotionCard>
            </div>
        </div>
    );
}
