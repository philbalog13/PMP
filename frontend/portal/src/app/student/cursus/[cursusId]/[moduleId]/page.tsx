'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, BookOpen, CheckCircle2, ChevronRight, Clock, Play, Server } from 'lucide-react';
import { useAuth } from '../../../../auth/useAuth';
import { NotionBadge, NotionCard, NotionEmptyState, NotionProgress, NotionSkeleton } from '@shared/components/notion';
import { UnitCard, UnitProgressState } from '../../types';

interface ModuleInfo {
    id: string;
    title: string;
    description: string;
    module_order: number;
    estimated_minutes: number;
    cursus_title?: string;
}

interface ModuleContentPayload {
    success: boolean;
    module?: ModuleInfo;
    uaUnits?: UnitCard[];
    error?: string;
}

const STATUS_LABEL: Record<UnitProgressState, string> = {
    LOCKED: 'Locked',
    UNLOCKED: 'Ready',
    IN_PROGRESS: 'In progress',
    COMPLETED: 'Completed',
};

function getProgressPercent(unit: UnitCard): number {
    if (!unit.taskTotal) {
        return 0;
    }
    return Math.round((unit.taskCompleted / unit.taskTotal) * 100);
}

export default function ModuleUaListPage() {
    const { isLoading: authLoading } = useAuth(true);
    const params = useParams();
    const cursusId = params?.cursusId as string;
    const moduleId = params?.moduleId as string;

    const [moduleInfo, setModuleInfo] = useState<ModuleInfo | null>(null);
    const [units, setUnits] = useState<UnitCard[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchModule = useCallback(async () => {
        if (!cursusId || !moduleId) {
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

            const response = await fetch(`/api/cursus/${cursusId}/module/${moduleId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const payload = await response.json() as ModuleContentPayload;
            if (!response.ok || !payload.success) {
                throw new Error(payload.error || 'Unable to load module.');
            }

            setModuleInfo(payload.module || null);
            setUnits(Array.isArray(payload.uaUnits) ? payload.uaUnits : []);
        } catch (fetchError) {
            setError(fetchError instanceof Error ? fetchError.message : 'Unable to load module.');
            setModuleInfo(null);
            setUnits([]);
        } finally {
            setLoading(false);
        }
    }, [cursusId, moduleId]);

    useEffect(() => {
        if (authLoading) {
            return;
        }
        void fetchModule();
    }, [authLoading, fetchModule]);

    const aggregate = useMemo(() => {
        const taskTotal = units.reduce((sum, unit) => sum + unit.taskTotal, 0);
        const taskCompleted = units.reduce((sum, unit) => sum + unit.taskCompleted, 0);
        return {
            taskTotal,
            taskCompleted,
            progress: taskTotal > 0 ? Math.round((taskCompleted / taskTotal) * 100) : 0,
        };
    }, [units]);

    if (authLoading || loading) {
        return (
            <div style={{ padding: 'var(--n-space-8) var(--n-space-6)', maxWidth: '980px', margin: '0 auto' }}>
                <NotionSkeleton type="line" width="180px" height="16px" />
                <div style={{ marginTop: 'var(--n-space-4)' }}>
                    <NotionSkeleton type="card" />
                </div>
                <div style={{ marginTop: 'var(--n-space-5)', display: 'grid', gap: 'var(--n-space-4)' }}>
                    {[...Array(3)].map((_, index) => (
                        <NotionSkeleton key={index} type="card" />
                    ))}
                </div>
            </div>
        );
    }

    if (!moduleInfo) {
        return (
            <div style={{ padding: 'var(--n-space-8) var(--n-space-6)', maxWidth: '980px', margin: '0 auto' }}>
                <NotionEmptyState
                    icon={<BookOpen size={28} />}
                    title={error || 'Module not found'}
                    description="Check the module URL or return to the cursus."
                    action={(
                        <Link
                            href={`/student/cursus/${cursusId}`}
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
                            Back to module list
                        </Link>
                    )}
                />
            </div>
        );
    }

    return (
        <div style={{ padding: 'var(--n-space-8) var(--n-space-6)', maxWidth: '980px', margin: '0 auto' }}>
            <Link
                href={`/student/cursus/${cursusId}`}
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
                Back to cursus
            </Link>

            <NotionCard padding="md" style={{ marginBottom: 'var(--n-space-5)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--n-space-4)', flexWrap: 'wrap' }}>
                    <div style={{ minWidth: '260px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--n-space-2)', marginBottom: 'var(--n-space-2)' }}>
                            <NotionBadge variant="inter">Module {moduleInfo.module_order}</NotionBadge>
                            <NotionBadge variant="default">{units.length} UA</NotionBadge>
                        </div>
                        <h1 style={{ margin: 0, fontSize: 'var(--n-text-xl)', color: 'var(--n-text-primary)' }}>{moduleInfo.title}</h1>
                        <p style={{ margin: 'var(--n-space-2) 0 0', color: 'var(--n-text-secondary)', fontSize: 'var(--n-text-sm)' }}>
                            {moduleInfo.description || 'Learning unit list with sequential tasks and optional lab machine.'}
                        </p>
                    </div>

                    <div style={{ minWidth: '220px', flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--n-text-xs)', color: 'var(--n-text-tertiary)', marginBottom: 'var(--n-space-2)' }}>
                            <span>UA task progress</span>
                            <span>{aggregate.taskCompleted}/{aggregate.taskTotal || 0} ({aggregate.progress}%)</span>
                        </div>
                        <NotionProgress value={aggregate.progress} variant={aggregate.progress === 100 ? 'success' : 'accent'} size="thick" />
                    </div>
                </div>
            </NotionCard>

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

            {units.length === 0 ? (
                <NotionEmptyState
                    icon={<BookOpen size={28} />}
                    title="No UA available in this module"
                    description="Publish at least one unit in this module to start the UA flow."
                />
            ) : (
                <div style={{ display: 'grid', gap: 'var(--n-space-4)' }}>
                    {units.map((unit) => {
                        const progress = getProgressPercent(unit);
                        const isLocked = unit.status === 'LOCKED';
                        const isCompleted = unit.status === 'COMPLETED';
                        const ctaLabel = isCompleted
                            ? 'Review UA'
                            : unit.status === 'IN_PROGRESS'
                                ? 'Continue UA'
                                : 'Start UA';

                        return (
                            <NotionCard key={unit.unitId} padding="md" variant="hover">
                                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--n-space-4)', flexWrap: 'wrap' }}>
                                    <div style={{ minWidth: '260px', flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--n-space-2)', marginBottom: 'var(--n-space-2)' }}>
                                            <NotionBadge variant={isCompleted ? 'success' : isLocked ? 'default' : 'inter'}>{STATUS_LABEL[unit.status]}</NotionBadge>
                                            {unit.unitCode && <NotionBadge variant="default">{unit.unitCode}</NotionBadge>}
                                            {unit.hasLabMachine && <NotionBadge variant="warning">Machine</NotionBadge>}
                                        </div>
                                        <h2 style={{ margin: 0, fontSize: 'var(--n-text-base)', color: 'var(--n-text-primary)' }}>{unit.title}</h2>
                                        <p style={{ margin: 'var(--n-space-2) 0 0', color: 'var(--n-text-secondary)', fontSize: 'var(--n-text-sm)' }}>
                                            {unit.summary || 'Complete all required tasks in sequence to validate this UA.'}
                                        </p>
                                    </div>

                                    <div style={{ minWidth: '240px', flex: 1 }}>
                                        <div style={{ display: 'flex', gap: 'var(--n-space-3)', marginBottom: 'var(--n-space-3)', flexWrap: 'wrap' }}>
                                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: 'var(--n-text-tertiary)', fontSize: 'var(--n-text-xs)' }}>
                                                <BookOpen size={12} /> {unit.taskCompleted}/{unit.taskTotal} tasks
                                            </span>
                                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: 'var(--n-text-tertiary)', fontSize: 'var(--n-text-xs)' }}>
                                                <Clock size={12} /> {unit.durationMinutes || 0} min
                                            </span>
                                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: 'var(--n-text-tertiary)', fontSize: 'var(--n-text-xs)' }}>
                                                <Server size={12} /> {unit.hasLabMachine ? 'Lab enabled' : 'No machine'}
                                            </span>
                                        </div>
                                        <NotionProgress value={progress} variant={isCompleted ? 'success' : 'accent'} size="thin" />
                                    </div>
                                </div>

                                <div style={{ marginTop: 'var(--n-space-4)' }}>
                                    <Link
                                        href={`/student/cursus/${cursusId}/${moduleId}/ua/${unit.unitId}`}
                                        style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            padding: '8px 14px',
                                            borderRadius: 'var(--n-radius-sm)',
                                            background: isCompleted ? 'var(--n-bg-elevated)' : 'var(--n-accent)',
                                            border: isCompleted ? '1px solid var(--n-border)' : 'none',
                                            color: isCompleted ? 'var(--n-text-secondary)' : '#fff',
                                            fontSize: 'var(--n-text-sm)',
                                            fontWeight: 600,
                                            textDecoration: 'none',
                                        }}
                                    >
                                        {isCompleted ? <CheckCircle2 size={13} /> : <Play size={13} />}
                                        {ctaLabel}
                                        <ChevronRight size={13} />
                                    </Link>
                                </div>
                            </NotionCard>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
