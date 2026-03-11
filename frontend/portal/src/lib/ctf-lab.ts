export type CtfLabSessionStatus = 'PROVISIONING' | 'RUNNING' | 'STOPPED' | 'EXPIRED' | 'FAILED';

export interface CtfLabSession {
    sessionId: string;
    sessionCode: string;
    status: CtfLabSessionStatus;
    machineIp: string | null;
    attackboxPath: string;
    expiresAt: string;
    timeRemainingSec: number;
    canExtend: boolean;
}

export interface CtfTask {
    taskId: string;
    title: string;
    hasMachine: boolean;
    questionType: string;
    requiresFlag: boolean;
    points: number;
}
