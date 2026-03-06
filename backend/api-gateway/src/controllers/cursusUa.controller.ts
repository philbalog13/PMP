import { Request, Response } from 'express';
import { logger } from '../utils/logger';
import {
    extendUaLabSession,
    getUaUnitDetail,
    getUaUnitSession,
    mapUaError,
    resetUaLabSession,
    startUaUnit,
    submitUaTask,
    terminateUaLabSession,
} from '../services/cursusUa.service';

function getStudentId(req: Request): string | null {
    return (req as any).user?.userId || null;
}

function handleUaError(res: Response, error: unknown, fallbackMessage: string): Response {
    const mappedError = mapUaError(error);
    if (mappedError.code === 'UA_INTERNAL_ERROR') {
        logger.error(fallbackMessage, { error: (error as any)?.message || String(error) });
    }
    return res.status(mappedError.statusCode).json({
        success: false,
        error: mappedError.message,
        code: mappedError.code,
    });
}

export const getUnitDetail = async (req: Request, res: Response) => {
    try {
        const studentId = getStudentId(req);
        if (!studentId) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }

        const { cursusId, moduleId, unitId } = req.params;
        const detail = await getUaUnitDetail(studentId, cursusId, moduleId, unitId);
        return res.json({ success: true, unit: detail });
    } catch (error) {
        return handleUaError(res, error, 'UA getUnitDetail failed');
    }
};

export const startUnit = async (req: Request, res: Response) => {
    try {
        const studentId = getStudentId(req);
        if (!studentId) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }

        const { cursusId, moduleId, unitId } = req.params;
        const detail = await startUaUnit(studentId, cursusId, moduleId, unitId);
        return res.json({ success: true, unit: detail });
    } catch (error) {
        return handleUaError(res, error, 'UA startUnit failed');
    }
};

export const submitTask = async (req: Request, res: Response) => {
    try {
        const studentId = getStudentId(req);
        if (!studentId) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }

        const { cursusId, moduleId, unitId, taskId } = req.params;
        const result = await submitUaTask(
            studentId,
            cursusId,
            moduleId,
            unitId,
            taskId,
            req.body
        );
        return res.json({ success: true, result });
    } catch (error) {
        return handleUaError(res, error, 'UA submitTask failed');
    }
};

export const getUnitSession = async (req: Request, res: Response) => {
    try {
        const studentId = getStudentId(req);
        if (!studentId) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }

        const { cursusId, moduleId, unitId } = req.params;
        const session = await getUaUnitSession(studentId, cursusId, moduleId, unitId);
        return res.json({ success: true, session });
    } catch (error) {
        return handleUaError(res, error, 'UA getUnitSession failed');
    }
};

export const extendUnitSession = async (req: Request, res: Response) => {
    try {
        const studentId = getStudentId(req);
        if (!studentId) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }

        const { unitId, sessionId } = req.params;
        const session = await extendUaLabSession(studentId, unitId, sessionId);
        return res.json({ success: true, session });
    } catch (error) {
        return handleUaError(res, error, 'UA extendUnitSession failed');
    }
};

export const resetUnitSession = async (req: Request, res: Response) => {
    try {
        const studentId = getStudentId(req);
        if (!studentId) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }

        const { unitId, sessionId } = req.params;
        const session = await resetUaLabSession(studentId, unitId, sessionId);
        return res.json({ success: true, session });
    } catch (error) {
        return handleUaError(res, error, 'UA resetUnitSession failed');
    }
};

export const terminateUnitSession = async (req: Request, res: Response) => {
    try {
        const studentId = getStudentId(req);
        if (!studentId) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }

        const { unitId, sessionId } = req.params;
        const session = await terminateUaLabSession(studentId, unitId, sessionId);
        return res.json({ success: true, session });
    } catch (error) {
        return handleUaError(res, error, 'UA terminateUnitSession failed');
    }
};
