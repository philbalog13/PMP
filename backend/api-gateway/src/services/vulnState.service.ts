import crypto from 'node:crypto';
import { db } from '../config/database';
import { logger } from '../utils/logger';

export interface VulnProfile {
    [vulnCode: string]: boolean; // true = vulnerable, false = fixed
}

export interface VulnStateSnapshot {
    vulnCode: string;
    isVulnerable: boolean;
    exploitedAt: string | null;
    fixedAt: string | null;
    defenseUnlocked: boolean;
}

export interface QuizResult {
    correct: boolean;
    explanation?: string;
    pointsEarned?: number;
    locked?: boolean;
}

export interface FlagSubmissionResult {
    correct: boolean;
    alreadyUnlocked: boolean;
    message: string;
}

export class VulnStateService {
    private static instance: VulnStateService;
    private readonly flagCache = new Map<string, { flag: string | null; loadedAtMs: number }>();
    private readonly flagCacheTtlMs = 5 * 60 * 1000;

    private constructor() {}

    public static getInstance(): VulnStateService {
        if (!VulnStateService.instance) {
            VulnStateService.instance = new VulnStateService();
        }
        return VulnStateService.instance;
    }

    public async getFlagValue(vulnCode: string): Promise<string | null> {
        const code = String(vulnCode || '').trim();
        if (!code) {
            return null;
        }

        const cached = this.flagCache.get(code);
        const now = Date.now();
        if (cached && (now - cached.loadedAtMs) < this.flagCacheTtlMs) {
            return cached.flag;
        }

        const res = await db.query(
            `SELECT flag_value
             FROM learning.vuln_catalog
             WHERE vuln_code = $1`,
            [code]
        );

        const flag = (res.rowCount ?? 0) > 0
            ? String(res.rows[0]?.flag_value || '').trim()
            : '';

        const normalized = flag || null;
        this.flagCache.set(code, { flag: normalized, loadedAtMs: now });
        return normalized;
    }

    /**
     * Initialize vulnerability state for a student:
     * all catalog vulnerabilities start as vulnerable.
     */
    private async initVulnState(studentId: string): Promise<void> {
        logger.info(`Initializing vulnerability sandbox for student ${studentId}`);

        await db.query(
            `INSERT INTO learning.student_vuln_state (student_id, vuln_code, is_vulnerable)
             SELECT $1, c.vuln_code, true
             FROM learning.vuln_catalog c
             ON CONFLICT (student_id, vuln_code) DO NOTHING`,
            [studentId]
        );
    }

    private async ensureStudentState(studentId: string): Promise<void> {
        const existingState = await db.query(
            'SELECT 1 FROM learning.student_vuln_state WHERE student_id = $1 LIMIT 1',
            [studentId]
        );

        if ((existingState.rowCount ?? 0) === 0) {
            await this.initVulnState(studentId);
        }
    }

    private async ensureVulnStateRow(studentId: string, vulnCode: string): Promise<void> {
        await db.query(
            `INSERT INTO learning.student_vuln_state (student_id, vuln_code, is_vulnerable)
             SELECT $1, c.vuln_code, true
             FROM learning.vuln_catalog c
             WHERE c.vuln_code = $2
             ON CONFLICT (student_id, vuln_code) DO NOTHING`,
            [studentId, vulnCode]
        );
    }

    public async getVulnStates(studentId: string): Promise<VulnStateSnapshot[]> {
        await this.ensureStudentState(studentId);

        const rows = await db.query(
            `SELECT
                s.vuln_code,
                s.is_vulnerable,
                s.exploited_at,
                s.fixed_at
             FROM learning.student_vuln_state s
             WHERE s.student_id = $1
             ORDER BY s.vuln_code ASC`,
            [studentId]
        );

        return rows.rows.map((row) => ({
            vulnCode: row.vuln_code,
            isVulnerable: row.is_vulnerable,
            exploitedAt: row.exploited_at,
            fixedAt: row.fixed_at,
            defenseUnlocked: row.exploited_at !== null
        }));
    }

    /**
     * Get vulnerability profile for a student.
     */
    public async getVulnProfile(studentId: string): Promise<VulnProfile> {
        const states = await this.getVulnStates(studentId);
        const profile: VulnProfile = {};

        for (const state of states) {
            profile[state.vulnCode] = state.isVulnerable;
        }

        return profile;
    }

    /**
     * Submit offensive flag to unlock defense flow for a vulnerability.
     */
    public async submitFlag(studentId: string, vulnCode: string, flag: string): Promise<FlagSubmissionResult> {
        const expectedFlag = await this.getFlagValue(vulnCode);

        if (expectedFlag === null) {
            throw new Error('Unknown vulnerability code');
        }

        const providedFlag = String(flag || '').trim();

        if (!expectedFlag) {
            throw new Error('Flag is not configured for this vulnerability');
        }

        let isCorrect = false;
        const expectedBuffer = Buffer.from(expectedFlag, 'utf8');
        const providedBuffer = Buffer.from(providedFlag, 'utf8');

        if (expectedBuffer.length === providedBuffer.length) {
            isCorrect = crypto.timingSafeEqual(expectedBuffer, providedBuffer);
        }

        if (!isCorrect) {
            return {
                correct: false,
                alreadyUnlocked: false,
                message: 'Invalid flag'
            };
        }

        await this.ensureVulnStateRow(studentId, vulnCode);

        const beforeRes = await db.query(
            `SELECT exploited_at
             FROM learning.student_vuln_state
             WHERE student_id = $1 AND vuln_code = $2`,
            [studentId, vulnCode]
        );
        const alreadyUnlocked = Boolean(beforeRes.rows[0]?.exploited_at);

        const updateRes = await db.query(
            `UPDATE learning.student_vuln_state
             SET exploited_at = COALESCE(exploited_at, NOW()),
                 updated_at = NOW()
             WHERE student_id = $1 AND vuln_code = $2
             RETURNING exploited_at`,
            [studentId, vulnCode]
        );

        const unlockedAt = updateRes.rows[0]?.exploited_at;

        return {
            correct: true,
            alreadyUnlocked,
            message: alreadyUnlocked && unlockedAt
                ? 'Flag already accepted for this vulnerability.'
                : 'Flag accepted. Defense quiz unlocked.'
        };
    }

    /**
     * Validate a defense quiz answer and fix vulnerability if correct.
     * Defense can only be submitted after offensive exploit validation.
     */
    public async submitDefenseQuiz(studentId: string, vulnCode: string, selectedOptionIndex: number): Promise<QuizResult> {
        await this.ensureVulnStateRow(studentId, vulnCode);

        const stateRes = await db.query(
            `SELECT is_vulnerable, exploited_at, fixed_at
             FROM learning.student_vuln_state
             WHERE student_id = $1 AND vuln_code = $2`,
            [studentId, vulnCode]
        );

        if ((stateRes.rowCount ?? 0) === 0) {
            throw new Error('Vulnerability state not found');
        }

        const currentState = stateRes.rows[0];

        if (!currentState.exploited_at) {
            return {
                correct: false,
                locked: true,
                pointsEarned: 0,
                explanation: 'Exploit required first: submit the correct flag to unlock defense.'
            };
        }

        const quizRes = await db.query(
            `SELECT correct_option_index, explanation
             FROM learning.defense_quizzes
             WHERE vuln_code = $1`,
            [vulnCode]
        );

        if ((quizRes.rowCount ?? 0) === 0) {
            throw new Error('Quiz not found for this vulnerability');
        }

        const quiz = quizRes.rows[0];
        const isCorrect = quiz.correct_option_index === selectedOptionIndex;

        if (isCorrect && currentState.is_vulnerable) {
            await db.query(
                `UPDATE learning.student_vuln_state
                 SET is_vulnerable = false,
                     fixed_at = COALESCE(fixed_at, NOW()),
                     fix_method = 'QUIZ',
                     updated_at = NOW()
                 WHERE student_id = $1 AND vuln_code = $2`,
                [studentId, vulnCode]
            );

            logger.info(`Student ${studentId} fixed vulnerability ${vulnCode} via quiz`);
        }

        return {
            correct: isCorrect,
            explanation: quiz.explanation,
            pointsEarned: isCorrect ? 50 : 0,
            locked: false
        };
    }

    /**
     * Reset one vulnerability (or all vulnerabilities) for a student.
     * Useful for lab replay and automated tests.
     */
    public async resetVulnState(studentId: string, vulnCode?: string): Promise<{ resetCount: number }> {
        const code = String(vulnCode || '').trim();

        if (code) {
            await this.ensureVulnStateRow(studentId, code);

            const res = await db.query(
                `UPDATE learning.student_vuln_state
                 SET is_vulnerable = true,
                     exploited_at = NULL,
                     fixed_at = NULL,
                     fix_method = NULL,
                     updated_at = NOW()
                 WHERE student_id = $1 AND vuln_code = $2`,
                [studentId, code]
            );

            return { resetCount: res.rowCount ?? 0 };
        }

        await this.ensureStudentState(studentId);

        const res = await db.query(
            `UPDATE learning.student_vuln_state
             SET is_vulnerable = true,
                 exploited_at = NULL,
                 fixed_at = NULL,
                 fix_method = NULL,
                 updated_at = NOW()
             WHERE student_id = $1`,
            [studentId]
        );

        return { resetCount: res.rowCount ?? 0 };
    }

    /**
     * Get resource override (for data isolation)
     */
    public async getResourceOverride(studentId: string, resourceType: string, resourceId: string, fieldName: string): Promise<any | null> {
        const res = await db.query(
            `SELECT new_value FROM learning.resource_overrides
             WHERE student_id = $1 AND resource_type = $2 AND resource_id = $3 AND field_name = $4`,
            [studentId, resourceType, resourceId, fieldName]
        );

        if (res.rowCount && res.rowCount > 0) {
            try {
                return JSON.parse(res.rows[0].new_value);
            } catch (_e) {
                return res.rows[0].new_value;
            }
        }
        return null;
    }

    /**
     * Get all resource overrides for one student and resource type.
     * Return shape: { [resourceId]: { [fieldName]: value } }
     */
    public async getResourceOverridesByType(studentId: string, resourceType: string): Promise<Record<string, Record<string, any>>> {
        const res = await db.query(
            `SELECT resource_id, field_name, new_value
             FROM learning.resource_overrides
             WHERE student_id = $1 AND resource_type = $2`,
            [studentId, resourceType]
        );

        const map: Record<string, Record<string, any>> = {};

        for (const row of res.rows) {
            const resourceId = String(row.resource_id);
            const fieldName = String(row.field_name);
            let parsedValue: any = row.new_value;

            try {
                parsedValue = JSON.parse(row.new_value);
            } catch (_error) {
                parsedValue = row.new_value;
            }

            if (!map[resourceId]) {
                map[resourceId] = {};
            }

            map[resourceId][fieldName] = parsedValue;
        }

        return map;
    }

    /**
     * Set resource override
     */
    public async setResourceOverride(studentId: string, resourceType: string, resourceId: string, fieldName: string, value: any): Promise<void> {
        const jsonValue = JSON.stringify(value);
        await db.query(
            `INSERT INTO learning.resource_overrides (student_id, resource_type, resource_id, field_name, new_value, updated_at)
             VALUES ($1, $2, $3, $4, $5, NOW())
             ON CONFLICT (student_id, resource_type, resource_id, field_name)
             DO UPDATE SET new_value = EXCLUDED.new_value, updated_at = NOW()`,
            [studentId, resourceType, resourceId, fieldName, jsonValue]
        );
    }
}

export const vulnStateService = VulnStateService.getInstance();
