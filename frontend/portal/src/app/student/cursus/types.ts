export type UnitProgressState = 'LOCKED' | 'UNLOCKED' | 'IN_PROGRESS' | 'COMPLETED';

export interface UnitCard {
    unitId: string;
    unitCode: string;
    title: string;
    summary: string | null;
    roomStyle: string;
    durationMinutes: number | null;
    unitOrder: number;
    taskTotal: number;
    taskCompleted: number;
    hasLabMachine: boolean;
    status: UnitProgressState;
}

export interface UnitTask {
    taskId: string;
    taskCode: string | null;
    taskOrder: number;
    title: string;
    prompt: string | null;
    taskType: string;
    points: number;
    isRequired: boolean;
    status: UnitProgressState;
    attemptCount: number;
    completedAt: string | null;
    options: unknown[];
    hints: unknown[];
    answerSchema: Record<string, unknown>;
}

export interface UnitLabSession {
    sessionId: string;
    sessionCode: string;
    status: 'PROVISIONING' | 'RUNNING' | 'STOPPED' | 'EXPIRED' | 'FAILED';
    flowSource: 'CTF' | 'UA';
    machineIp: string | null;
    attackboxPath: string;
    expiresAt: string;
    timeRemainingSec: number;
    canExtend: boolean;
}

export interface UnitProgress {
    status: UnitProgressState;
    startedAt: string | null;
    completedAt: string | null;
    lastActivityAt: string | null;
    taskCompleted: number;
    taskTotal: number;
    requiredTaskCompleted: number;
    requiredTaskTotal: number;
}

export interface UnitLabBlock {
    isEnabled: boolean;
    autoStart: boolean;
    ttlOverrideMinutes: number | null;
    session: UnitLabSession | null;
}

export interface UnitDetail {
    unitId: string;
    moduleId: string;
    cursusId: string;
    unitCode: string;
    title: string;
    summary: string | null;
    roomStyle: string;
    durationMinutes: number | null;
    contentMarkdown: string;
    learningObjectives: string[];
    validationChecklist: string[];
    resources: string[];
    unitOrder: number;
    progress: UnitProgress;
    tasks: UnitTask[];
    lab: UnitLabBlock;
}
