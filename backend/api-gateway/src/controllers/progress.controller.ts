/**
 * Progress Controller - PMP
 * Student progress, quizzes, badges, lab controls and certificate flows.
 */
import { Request, Response } from 'express';
import { query } from '../config/database';
import { logger } from '../utils/logger';
import {
    QuizQuestion,
    evaluateQuizSubmission,
    normalizeSubmittedAnswers,
    sanitizeQuizQuestions
} from '../services/quizEvaluation.service';
import {
    BADGES,
    DEFAULT_LAB_CONDITIONS,
    DEFAULT_QUIZZES,
    DEFAULT_WORKSHOP_CATALOG,
    DEFAULT_WORKSHOP_CONTENT,
    DEFAULT_WORKSHOPS,
    LabConditions,
    QuizDefinition,
    WorkshopCatalogEntry,
    WorkshopContent
} from '../data/learningDefaults';

const defaultWorkshopMap = new Map(DEFAULT_WORKSHOP_CATALOG.map((w) => [w.id, w]));
let inMemoryLabConditions: LabConditions = { ...DEFAULT_LAB_CONDITIONS };

function safeParseInt(value: unknown, fallback: number): number {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
        return fallback;
    }
    return Math.floor(parsed);
}

function parseOptions(optionsValue: unknown): string[] {
    if (Array.isArray(optionsValue)) {
        return optionsValue.map((value) => String(value));
    }

    if (typeof optionsValue === 'string') {
        try {
            const parsed = JSON.parse(optionsValue);
            if (Array.isArray(parsed)) {
                return parsed.map((value) => String(value));
            }
        } catch {
            // Ignore parse errors and fallback to split.
        }

        return optionsValue
            .split('||')
            .map((entry) => entry.trim())
            .filter((entry) => entry.length > 0);
    }

    return [];
}

function normalizeLabConditionsPayload(
    payload: Record<string, unknown>,
    current: LabConditions
): LabConditions {
    const latencyMs = Math.min(Math.max(safeParseInt(payload.latencyMs ?? payload.latency, current.latencyMs), 0), 5000);
    const authFailureRate = Math.min(Math.max(safeParseInt(payload.authFailureRate ?? payload.authFailRate, current.authFailureRate), 0), 100);
    const hsmLatencyMs = Math.min(Math.max(safeParseInt(payload.hsmLatencyMs ?? payload.hsmLatency, current.hsmLatencyMs), 0), 5000);

    return {
        ...current,
        latencyMs,
        authFailureRate,
        fraudInjection: payload.fraudInjection !== undefined ? Boolean(payload.fraudInjection) : current.fraudInjection,
        hsmLatencyMs,
        networkErrors: payload.networkErrors !== undefined ? Boolean(payload.networkErrors) : current.networkErrors,
        updatedAt: new Date().toISOString()
    };
}

async function getActiveWorkshops(): Promise<WorkshopCatalogEntry[]> {
    try {
        const result = await query(
            `SELECT id, title, description, sections, quiz_id, difficulty, estimated_minutes, module_order
             FROM learning.workshops
             WHERE is_active = true
             ORDER BY module_order ASC, id ASC`
        );

        if ((result.rowCount ?? 0) > 0) {
            return result.rows.map((row) => ({
                id: row.id,
                title: row.title,
                description: row.description || '',
                sections: Math.max(parseInt(row.sections, 10) || 1, 1),
                quizId: row.quiz_id || null,
                difficulty: row.difficulty || null,
                estimatedMinutes: row.estimated_minutes ? parseInt(row.estimated_minutes, 10) : null,
                moduleOrder: Math.max(parseInt(row.module_order, 10) || 1, 1)
            }));
        }
    } catch (error: any) {
        logger.warn('Learning workshop catalog unavailable, falling back to defaults', { error: error.message });
    }

    return DEFAULT_WORKSHOP_CATALOG;
}

async function getWorkshopById(workshopId: string): Promise<WorkshopCatalogEntry | null> {
    try {
        const result = await query(
            `SELECT id, title, description, sections, quiz_id, difficulty, estimated_minutes, module_order
             FROM learning.workshops
             WHERE id = $1 AND is_active = true
             LIMIT 1`,
            [workshopId]
        );

        if ((result.rowCount ?? 0) > 0) {
            const row = result.rows[0];
            return {
                id: row.id,
                title: row.title,
                description: row.description || '',
                sections: Math.max(parseInt(row.sections, 10) || 1, 1),
                quizId: row.quiz_id || null,
                difficulty: row.difficulty || null,
                estimatedMinutes: row.estimated_minutes ? parseInt(row.estimated_minutes, 10) : null,
                moduleOrder: Math.max(parseInt(row.module_order, 10) || 1, 1)
            };
        }
    } catch (error: any) {
        logger.warn('Learning workshop lookup unavailable, falling back to defaults', {
            workshopId,
            error: error.message
        });
    }

    return defaultWorkshopMap.get(workshopId) || null;
}

async function getQuizDefinitionById(quizId: string): Promise<QuizDefinition | null> {
    try {
        const result = await query(
            `SELECT
                quiz_id,
                workshop_id,
                quiz_title,
                pass_percentage,
                time_limit_minutes,
                question_id,
                question_text,
                options,
                correct_option_index,
                explanation,
                question_order
             FROM learning.quiz_questions
             WHERE quiz_id = $1
             ORDER BY question_order ASC, question_id ASC`,
            [quizId]
        );

        if ((result.rowCount ?? 0) > 0) {
            const rows = result.rows;
            const header = rows[0];
            const questions: QuizQuestion[] = rows.map((row) => ({
                id: row.question_id,
                question: row.question_text,
                options: parseOptions(row.options),
                correctOptionIndex: Math.max(parseInt(row.correct_option_index, 10) || 0, 0),
                explanation: row.explanation || ''
            }));

            return {
                id: header.quiz_id,
                title: header.quiz_title || header.quiz_id,
                workshopId: header.workshop_id,
                passPercentage: Math.min(Math.max(parseInt(header.pass_percentage, 10) || 80, 1), 100),
                timeLimitMinutes: header.time_limit_minutes !== null
                    ? Math.max(parseInt(header.time_limit_minutes, 10) || 0, 0)
                    : null,
                questions
            };
        }
    } catch (error: any) {
        logger.warn('Quiz question bank table unavailable, using fallback quiz definitions', {
            quizId,
            error: error.message
        });
    }

    return DEFAULT_QUIZZES[quizId] || null;
}

async function loadQuizDefinition(quizId: string, workshopId?: string): Promise<QuizDefinition | null> {
    const byQuizId = await getQuizDefinitionById(quizId);
    if (byQuizId) {
        return byQuizId;
    }

    if (workshopId) {
        const workshop = await getWorkshopById(workshopId);
        if (workshop?.quizId) {
            return getQuizDefinitionById(workshop.quizId);
        }
    }

    return null;
}

async function getWorkshopContentById(workshopId: string): Promise<WorkshopContent | null> {
    try {
        const result = await query(
            `SELECT
                workshop_id,
                workshop_title,
                workshop_description,
                section_id,
                section_title,
                section_content,
                section_order
             FROM learning.workshop_lessons
             WHERE workshop_id = $1
             ORDER BY section_order ASC, section_id ASC`,
            [workshopId]
        );

        if ((result.rowCount ?? 0) > 0) {
            const header = result.rows[0];
            return {
                workshopId: header.workshop_id,
                title: header.workshop_title || header.workshop_id,
                description: header.workshop_description || '',
                sections: result.rows.map((row) => ({
                    id: row.section_id,
                    title: row.section_title,
                    content: row.section_content || ''
                }))
            };
        }
    } catch (error: any) {
        logger.warn('Workshop lesson table unavailable, using fallback content', {
            workshopId,
            error: error.message
        });
    }

    return DEFAULT_WORKSHOP_CONTENT[workshopId] || null;
}

async function readLabConditionsFromDb(): Promise<LabConditions | null> {
    try {
        const result = await query(
            `SELECT
                latency_ms,
                auth_failure_rate,
                fraud_injection,
                hsm_latency_ms,
                network_errors,
                updated_by,
                updated_at
             FROM learning.lab_environment_state
             ORDER BY updated_at DESC
             LIMIT 1`
        );

        if ((result.rowCount ?? 0) === 0) {
            return null;
        }

        const row = result.rows[0];
        return {
            latencyMs: Math.max(parseInt(row.latency_ms, 10) || 0, 0),
            authFailureRate: Math.max(parseInt(row.auth_failure_rate, 10) || 0, 0),
            fraudInjection: Boolean(row.fraud_injection),
            hsmLatencyMs: Math.max(parseInt(row.hsm_latency_ms, 10) || 0, 0),
            networkErrors: Boolean(row.network_errors),
            updatedBy: row.updated_by || null,
            updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString()
        };
    } catch (error: any) {
        logger.warn('Lab state table unavailable, using in-memory fallback', {
            error: error.message
        });
        return null;
    }
}

async function persistLabConditionsToDb(state: LabConditions): Promise<void> {
    try {
        await query(
            `INSERT INTO learning.lab_environment_state
             (latency_ms, auth_failure_rate, fraud_injection, hsm_latency_ms, network_errors, updated_by)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [
                state.latencyMs,
                state.authFailureRate,
                state.fraudInjection,
                state.hsmLatencyMs,
                state.networkErrors,
                state.updatedBy
            ]
        );
    } catch (error: any) {
        logger.warn('Could not persist lab state in DB, keeping in-memory state only', {
            error: error.message
        });
    }
}

async function resolveLabConditions(): Promise<LabConditions> {
    const dbState = await readLabConditionsFromDb();
    if (dbState) {
        inMemoryLabConditions = dbState;
    }

    return inMemoryLabConditions;
}

async function getCertificateEligibility(studentId: string): Promise<{
    eligible: boolean;
    completedWorkshops: number;
    totalWorkshops: number;
    passedQuizzes: number;
    requiredQuizzes: number;
}> {
    const workshops = await getActiveWorkshops();
    const requiredQuizIds = workshops
        .map((workshop) => workshop.quizId)
        .filter((quizId): quizId is string => Boolean(quizId));

    const [completedResult, passedResult] = await Promise.all([
        query(
            `SELECT COUNT(*)::integer AS count
             FROM learning.student_progress
             WHERE student_id = $1 AND status = 'COMPLETED'`,
            [studentId]
        ),
        requiredQuizIds.length > 0
            ? query(
                `SELECT COUNT(DISTINCT quiz_id)::integer AS count
                 FROM learning.quiz_results
                 WHERE student_id = $1
                   AND passed = true
                   AND quiz_id = ANY($2::text[])`,
                [studentId, requiredQuizIds]
            )
            : Promise.resolve({ rows: [{ count: 0 }] } as any)
    ]);

    const completedWorkshops = parseInt(completedResult.rows[0]?.count, 10) || 0;
    const passedQuizzes = parseInt(passedResult.rows[0]?.count, 10) || 0;

    return {
        eligible:
            workshops.length > 0 &&
            completedWorkshops >= workshops.length &&
            passedQuizzes >= requiredQuizIds.length,
        completedWorkshops,
        totalWorkshops: workshops.length,
        passedQuizzes,
        requiredQuizzes: requiredQuizIds.length
    };
}

function buildCertificateCode(studentId: string): string {
    const studentFragment = studentId.replace(/-/g, '').slice(0, 8).toUpperCase();
    const dateFragment = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    return `PMP-${dateFragment}-${studentFragment}`;
}

async function issueCertificateIfEligible(studentId: string): Promise<any | null> {
    const eligibility = await getCertificateEligibility(studentId);
    if (!eligibility.eligible) {
        return null;
    }

    const certificateCode = buildCertificateCode(studentId);

    try {
        const existing = await query(
            `SELECT id, student_id, certificate_code, issued_at, metadata
             FROM learning.certificates
             WHERE student_id = $1
             LIMIT 1`,
            [studentId]
        );

        if ((existing.rowCount ?? 0) > 0) {
            return existing.rows[0];
        }

        const inserted = await query(
            `INSERT INTO learning.certificates
             (student_id, certificate_code, metadata)
             VALUES ($1, $2, $3)
             ON CONFLICT (student_id) DO UPDATE SET certificate_code = learning.certificates.certificate_code
             RETURNING id, student_id, certificate_code, issued_at, metadata`,
            [
                studentId,
                certificateCode,
                JSON.stringify({
                    level: 'PMP_LEARNING_CORE',
                    completedWorkshops: eligibility.completedWorkshops,
                    passedQuizzes: eligibility.passedQuizzes
                })
            ]
        );

        return inserted.rows[0];
    } catch (error: any) {
        logger.warn('Certificate table unavailable, returning ephemeral certificate payload', {
            error: error.message,
            studentId
        });

        return {
            id: null,
            student_id: studentId,
            certificate_code: certificateCode,
            issued_at: new Date().toISOString(),
            metadata: {
                level: 'PMP_LEARNING_CORE',
                storage: 'ephemeral'
            }
        };
    }
}

/**
 * Get my progress (all workshops)
 */
export const getMyProgress = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.userId;

        const [workshops, result] = await Promise.all([
            getActiveWorkshops(),
            query(
                `SELECT workshop_id, status, progress_percent, current_section, total_sections,
                        started_at, completed_at, time_spent_minutes, last_accessed_at
                 FROM learning.student_progress
                 WHERE student_id = $1`,
                [userId]
            )
        ]);

        const progressRowsByWorkshopId = new Map(result.rows.map((row) => [row.workshop_id, row]));
        const activeWorkshopIds = new Set(workshops.map((workshop) => workshop.id));

        const progressMap: Record<string, any> = {};
        for (const workshop of workshops) {
            const dbProgress = progressRowsByWorkshopId.get(workshop.id);
            progressMap[workshop.id] = dbProgress || {
                workshop_id: workshop.id,
                status: 'NOT_STARTED',
                progress_percent: 0,
                current_section: 0,
                total_sections: workshop.sections,
                time_spent_minutes: 0
            };

            progressMap[workshop.id].title = workshop.title;
            progressMap[workshop.id].description = workshop.description;
            progressMap[workshop.id].difficulty = workshop.difficulty;
            progressMap[workshop.id].estimated_minutes = workshop.estimatedMinutes;
            progressMap[workshop.id].quiz_id = workshop.quizId;
            progressMap[workshop.id].module_order = workshop.moduleOrder;
        }

        res.json({
            success: true,
            progress: progressMap,
            workshopsCompleted: result.rows.filter(
                (row) => row.status === 'COMPLETED' && activeWorkshopIds.has(row.workshop_id)
            ).length,
            totalWorkshops: workshops.length
        });
    } catch (error: any) {
        logger.error('Get my progress error', { error: error.message });
        res.status(500).json({ success: false, error: 'Failed to fetch progress' });
    }
};

/**
 * Get active workshops catalog
 */
export const getWorkshopsCatalog = async (_req: Request, res: Response) => {
    try {
        const workshops = await getActiveWorkshops();

        res.json({
            success: true,
            workshops,
            total: workshops.length
        });
    } catch (error: any) {
        logger.error('Get workshops catalog error', { error: error.message });
        res.status(500).json({ success: false, error: 'Failed to fetch workshops catalog' });
    }
};

/**
 * Get workshop theory content
 */
export const getWorkshopContent = async (req: Request, res: Response) => {
    try {
        const { workshopId } = req.params;
        const workshop = await getWorkshopById(workshopId);

        if (!workshop) {
            return res.status(404).json({ success: false, error: 'Workshop not found' });
        }

        const content = await getWorkshopContentById(workshopId);
        if (!content) {
            return res.status(404).json({ success: false, error: 'Workshop content not found' });
        }

        res.json({
            success: true,
            workshop: {
                id: workshop.id,
                title: workshop.title,
                description: workshop.description,
                sections: workshop.sections,
                quizId: workshop.quizId,
                difficulty: workshop.difficulty,
                estimatedMinutes: workshop.estimatedMinutes,
                moduleOrder: workshop.moduleOrder
            },
            content
        });
    } catch (error: any) {
        logger.error('Get workshop content error', { error: error.message });
        res.status(500).json({ success: false, error: 'Failed to fetch workshop content' });
    }
};

/**
 * Get leaderboard
 */
export const getLeaderboard = async (req: Request, res: Response) => {
    try {
        const requestedLimit = parseInt(req.query.limit as string, 10);
        const limit = Number.isFinite(requestedLimit)
            ? Math.min(Math.max(requestedLimit, 1), 100)
            : 10;

        const result = await query(
            `WITH badge_stats AS (
                SELECT
                    student_id,
                    SUM(xp_awarded)::integer as total_xp,
                    COUNT(*)::integer as badge_count
                FROM learning.badges
                GROUP BY student_id
             ),
             workshop_stats AS (
                SELECT
                    student_id,
                    COUNT(DISTINCT workshop_id)::integer as workshops_completed
                FROM learning.student_progress
                WHERE status = 'COMPLETED'
                GROUP BY student_id
             )
             SELECT
                u.id, u.username, u.first_name, u.last_name,
                COALESCE(bs.total_xp, 0)::integer as total_xp,
                COALESCE(bs.badge_count, 0)::integer as badge_count,
                COALESCE(ws.workshops_completed, 0)::integer as workshops_completed
             FROM users.users u
             LEFT JOIN badge_stats bs ON u.id = bs.student_id
             LEFT JOIN workshop_stats ws ON u.id = ws.student_id
             WHERE u.role = 'ROLE_ETUDIANT'
             ORDER BY total_xp DESC, workshops_completed DESC
             LIMIT $1`,
            [limit]
        );

        const leaderboard = result.rows.map((row, index) => ({
            rank: index + 1,
            ...row
        }));

        res.json({
            success: true,
            leaderboard
        });
    } catch (error: any) {
        logger.error('Get leaderboard error', { error: error.message });
        res.status(500).json({ success: false, error: 'Failed to fetch leaderboard' });
    }
};

/**
 * Save workshop progress
 */
export const saveWorkshopProgress = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.userId;
        const { workshopId } = req.params;
        const { currentSection, timeSpentMinutes } = req.body;

        const workshop = await getWorkshopById(workshopId);
        if (!workshop) {
            return res.status(400).json({ success: false, error: 'Invalid workshop ID' });
        }

        const parsedCurrentSection = Number(currentSection);
        if (!Number.isFinite(parsedCurrentSection) || parsedCurrentSection < 0) {
            return res.status(400).json({ success: false, error: 'currentSection must be a non-negative number' });
        }
        const normalizedCurrentSection = Math.min(Math.floor(parsedCurrentSection), workshop.sections);

        const parsedTimeSpent = Number(timeSpentMinutes ?? 0);
        if (!Number.isFinite(parsedTimeSpent) || parsedTimeSpent < 0) {
            return res.status(400).json({ success: false, error: 'timeSpentMinutes must be a non-negative number' });
        }
        const normalizedTimeSpent = Math.floor(parsedTimeSpent);

        const progressPercent = Math.min(
            Math.round((normalizedCurrentSection / workshop.sections) * 100),
            100
        );
        const status = progressPercent >= 100 ? 'COMPLETED' : 'IN_PROGRESS';

        const result = await query(
            `INSERT INTO learning.student_progress
             (student_id, workshop_id, status, progress_percent, current_section, total_sections,
              started_at, time_spent_minutes, last_accessed_at)
             VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7, NOW())
             ON CONFLICT (student_id, workshop_id) DO UPDATE SET
                status = $3,
                progress_percent = $4,
                current_section = $5,
                total_sections = $6,
                time_spent_minutes = learning.student_progress.time_spent_minutes + $7,
                last_accessed_at = NOW(),
                completed_at = CASE WHEN $3 = 'COMPLETED' THEN NOW() ELSE learning.student_progress.completed_at END,
                updated_at = NOW()
             RETURNING *`,
            [userId, workshopId, status, progressPercent, normalizedCurrentSection, workshop.sections, normalizedTimeSpent]
        );

        res.json({
            success: true,
            message: 'Progress saved',
            progress: result.rows[0]
        });
    } catch (error: any) {
        logger.error('Save workshop progress error', { error: error.message });
        res.status(500).json({ success: false, error: 'Failed to save progress' });
    }
};

/**
 * Mark workshop as completed
 */
export const completeWorkshop = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.userId;
        const { workshopId } = req.params;

        const workshop = await getWorkshopById(workshopId);
        if (!workshop) {
            return res.status(400).json({ success: false, error: 'Invalid workshop ID' });
        }

        await query(
            `INSERT INTO learning.student_progress
             (student_id, workshop_id, status, progress_percent, current_section, total_sections, completed_at)
             VALUES ($1, $2, 'COMPLETED', 100, $3, $3, NOW())
             ON CONFLICT (student_id, workshop_id) DO UPDATE SET
                status = 'COMPLETED',
                progress_percent = 100,
                current_section = $3,
                total_sections = $3,
                completed_at = NOW(),
                updated_at = NOW()`,
            [userId, workshopId, workshop.sections]
        );

        await awardBadge(userId, 'WORKSHOP_COMPLETE');

        const completedCount = await query(
            `SELECT COUNT(*)::integer AS count
             FROM learning.student_progress
             WHERE student_id = $1 AND status = 'COMPLETED'`,
            [userId]
        );

        const workshops = await getActiveWorkshops();
        if (parseInt(completedCount.rows[0].count, 10) >= workshops.length) {
            await awardBadge(userId, 'ALL_WORKSHOPS');
        }

        await issueCertificateIfEligible(userId);

        res.json({
            success: true,
            message: 'Workshop completed',
            workshopId
        });
    } catch (error: any) {
        logger.error('Complete workshop error', { error: error.message });
        res.status(500).json({ success: false, error: 'Failed to complete workshop' });
    }
};

/**
 * Get quiz definition (without correct answers)
 */
export const getQuizDefinition = async (req: Request, res: Response) => {
    try {
        const { quizId } = req.params;
        const quiz = await loadQuizDefinition(quizId);

        if (!quiz) {
            return res.status(404).json({ success: false, error: 'Quiz not found' });
        }

        const attemptsResult = await query(
            `SELECT COUNT(*)::integer AS attempts
             FROM learning.quiz_results
             WHERE student_id = $1 AND quiz_id = $2`,
            [(req as any).user?.userId, quiz.id]
        );

        res.json({
            success: true,
            quiz: {
                id: quiz.id,
                title: quiz.title,
                workshopId: quiz.workshopId,
                passPercentage: quiz.passPercentage,
                timeLimitMinutes: quiz.timeLimitMinutes,
                questions: sanitizeQuizQuestions(quiz.questions),
                questionCount: quiz.questions.length,
                attempts: parseInt(attemptsResult.rows[0]?.attempts, 10) || 0
            }
        });
    } catch (error: any) {
        logger.error('Get quiz definition error', { error: error.message });
        res.status(500).json({ success: false, error: 'Failed to fetch quiz definition' });
    }
};

/**
 * Submit quiz answers
 */
export const submitQuiz = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.userId;
        const { quizId } = req.params;
        const { answers, timeTakenSeconds, workshopId } = req.body || {};

        const normalizedAnswers = normalizeSubmittedAnswers(answers);
        if (normalizedAnswers.length === 0) {
            return res.status(400).json({ success: false, error: 'Answers are required' });
        }

        let workshop: WorkshopCatalogEntry | null = null;
        if (workshopId) {
            workshop = await getWorkshopById(String(workshopId));
            if (!workshop) {
                return res.status(400).json({ success: false, error: 'Invalid workshop ID' });
            }
        }

        const quiz = await loadQuizDefinition(quizId, workshop?.id);
        if (!quiz || quiz.questions.length === 0) {
            return res.status(404).json({ success: false, error: 'Quiz definition not found' });
        }

        if (workshop && quiz.workshopId && workshop.id !== quiz.workshopId) {
            return res.status(400).json({ success: false, error: 'Quiz does not belong to the selected workshop' });
        }

        const normalizedTimeTakenSeconds = timeTakenSeconds === undefined || timeTakenSeconds === null
            ? null
            : Number(timeTakenSeconds);

        if (
            normalizedTimeTakenSeconds !== null
            && (!Number.isFinite(normalizedTimeTakenSeconds) || normalizedTimeTakenSeconds < 0)
        ) {
            return res.status(400).json({ success: false, error: 'timeTakenSeconds must be a non-negative number' });
        }

        const timeTakenSecondsValue = normalizedTimeTakenSeconds === null
            ? null
            : Math.floor(normalizedTimeTakenSeconds);

        const evaluation = evaluateQuizSubmission(quiz.questions, normalizedAnswers);
        const passed = evaluation.percentage >= quiz.passPercentage;

        const attemptResult = await query(
            `SELECT COALESCE(MAX(attempt_number), 0) + 1 as attempt
             FROM learning.quiz_results
             WHERE student_id = $1 AND quiz_id = $2`,
            [userId, quiz.id]
        );
        const attemptNumber = attemptResult.rows[0].attempt;

        const resolvedWorkshopId = workshop?.id || quiz.workshopId || null;

        const result = await query(
            `INSERT INTO learning.quiz_results
             (student_id, quiz_id, workshop_id, score, max_score, percentage, passed, answers, time_taken_seconds, attempt_number)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
             RETURNING id, quiz_id, workshop_id, score, max_score, percentage, passed, submitted_at, attempt_number`,
            [
                userId,
                quiz.id,
                resolvedWorkshopId,
                evaluation.correctAnswers,
                evaluation.maxScore,
                evaluation.percentage,
                passed,
                JSON.stringify({
                    submittedAnswers: normalizedAnswers,
                    questionResults: evaluation.questionResults
                }),
                timeTakenSecondsValue,
                attemptNumber
            ]
        );

        const isFirstQuiz = attemptNumber === 1;
        if (isFirstQuiz) {
            await awardBadge(userId, 'FIRST_QUIZ');
        }

        if (evaluation.percentage === 100) {
            await awardBadge(userId, 'PERFECT_SCORE');
        }

        if (timeTakenSecondsValue && timeTakenSecondsValue < 300) {
            await awardBadge(userId, 'FAST_LEARNER');
        }

        const passedQuizzes = await query(
            `SELECT COUNT(DISTINCT quiz_id) as count
             FROM learning.quiz_results
             WHERE student_id = $1 AND passed = true`,
            [userId]
        );
        if (parseInt(passedQuizzes.rows[0].count, 10) >= 5) {
            await awardBadge(userId, 'QUIZ_MASTER');
        }

        if (passed && resolvedWorkshopId) {
            const completedWorkshop = await getWorkshopById(resolvedWorkshopId);
            if (completedWorkshop) {
                await query(
                    `INSERT INTO learning.student_progress
                     (student_id, workshop_id, status, progress_percent, current_section, total_sections, completed_at, started_at, last_accessed_at)
                     VALUES ($1, $2, 'COMPLETED', 100, $3, $3, NOW(), COALESCE((
                        SELECT started_at
                        FROM learning.student_progress
                        WHERE student_id = $1 AND workshop_id = $2
                     ), NOW()), NOW())
                     ON CONFLICT (student_id, workshop_id) DO UPDATE SET
                        status = 'COMPLETED',
                        progress_percent = 100,
                        current_section = $3,
                        total_sections = $3,
                        completed_at = NOW(),
                        last_accessed_at = NOW(),
                        updated_at = NOW()`,
                    [userId, resolvedWorkshopId, completedWorkshop.sections]
                );

                await awardBadge(userId, 'WORKSHOP_COMPLETE');

                const completedCount = await query(
                    `SELECT COUNT(*)::integer AS count
                     FROM learning.student_progress
                     WHERE student_id = $1 AND status = 'COMPLETED'`,
                    [userId]
                );

                const workshops = await getActiveWorkshops();
                if (parseInt(completedCount.rows[0].count, 10) >= workshops.length) {
                    await awardBadge(userId, 'ALL_WORKSHOPS');
                }
            }
        }

        await issueCertificateIfEligible(userId);

        res.json({
            success: true,
            result: result.rows[0],
            passed,
            passPercentage: quiz.passPercentage,
            review: evaluation.questionResults,
            message: passed
                ? 'Felicitations ! Quiz reussi.'
                : `Quiz echoue. Score minimum requis: ${quiz.passPercentage}%`
        });
    } catch (error: any) {
        logger.error('Submit quiz error', { error: error.message });
        res.status(500).json({ success: false, error: 'Failed to submit quiz' });
    }
};

/**
 * Get quiz results
 */
export const getQuizResults = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.userId;
        const { quizId } = req.params;

        const result = await query(
            `SELECT id, quiz_id, workshop_id, score, max_score, percentage, passed,
                    answers, submitted_at, time_taken_seconds, attempt_number
             FROM learning.quiz_results
             WHERE student_id = $1 AND quiz_id = $2
             ORDER BY submitted_at DESC`,
            [userId, quizId]
        );

        if ((result.rowCount ?? 0) === 0) {
            return res.status(404).json({ success: false, error: 'No quiz results found' });
        }

        res.json({
            success: true,
            results: result.rows,
            bestScore: Math.max(...result.rows.map((r) => r.percentage)),
            attempts: result.rows.length
        });
    } catch (error: any) {
        logger.error('Get quiz results error', { error: error.message });
        res.status(500).json({ success: false, error: 'Failed to fetch quiz results' });
    }
};

/**
 * Get my badges
 */
export const getMyBadges = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.userId;

        const result = await query(
            `SELECT badge_type, badge_name, badge_description, badge_icon, xp_awarded, earned_at
             FROM learning.badges
             WHERE student_id = $1
             ORDER BY earned_at DESC`,
            [userId]
        );

        const earnedBadges = new Set(result.rows.map((badge) => badge.badge_type));
        const allBadges = Object.entries(BADGES).map(([type, badge]) => ({
            type,
            name: badge.name,
            description: badge.description,
            icon: badge.icon,
            xp: badge.xp,
            earned: earnedBadges.has(type),
            earnedAt: result.rows.find((row) => row.badge_type === type)?.earned_at
        }));

        res.json({
            success: true,
            badges: allBadges,
            earned: result.rows.length,
            total: Object.keys(BADGES).length,
            totalXP: result.rows.reduce((sum, badge) => sum + (badge.xp_awarded || 0), 0)
        });
    } catch (error: any) {
        logger.error('Get my badges error', { error: error.message });
        res.status(500).json({ success: false, error: 'Failed to fetch badges' });
    }
};

/**
 * Get my statistics
 */
export const getMyStats = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.userId;

        const [
            workshops,
            progressResult,
            quizAggregateResult,
            recentQuizResult,
            badgesResult
        ] = await Promise.all([
            getActiveWorkshops(),
            query(
                `SELECT status, COUNT(*) as count, SUM(time_spent_minutes) as time
                 FROM learning.student_progress
                 WHERE student_id = $1
                 GROUP BY status`,
                [userId]
            ),
            query(
                `SELECT
                    COUNT(*) as total_quizzes,
                    COUNT(CASE WHEN passed THEN 1 END) as quizzes_passed,
                    AVG(percentage) as avg_score,
                    MAX(percentage) as best_score
                 FROM learning.quiz_results
                 WHERE student_id = $1`,
                [userId]
            ),
            query(
                `SELECT quiz_id, workshop_id, score, max_score, percentage, passed, submitted_at, time_taken_seconds, attempt_number
                 FROM learning.quiz_results
                 WHERE student_id = $1
                 ORDER BY submitted_at DESC
                 LIMIT 20`,
                [userId]
            ),
            query(
                `SELECT SUM(xp_awarded) as total_xp, COUNT(*) as badge_count
                 FROM learning.badges
                 WHERE student_id = $1`,
                [userId]
            )
        ]);

        const workshopStats = {
            notStarted: 0,
            inProgress: 0,
            completed: 0,
            totalTime: 0
        };

        progressResult.rows.forEach((row) => {
            workshopStats.totalTime += parseInt(row.time, 10) || 0;
            switch (row.status) {
                case 'NOT_STARTED':
                    workshopStats.notStarted = parseInt(row.count, 10);
                    break;
                case 'IN_PROGRESS':
                    workshopStats.inProgress = parseInt(row.count, 10);
                    break;
                case 'COMPLETED':
                    workshopStats.completed = parseInt(row.count, 10);
                    break;
                default:
                    break;
            }
        });

        res.json({
            success: true,
            stats: {
                workshops: {
                    ...workshopStats,
                    total: workshops.length
                },
                quizzes: {
                    total: parseInt(quizAggregateResult.rows[0]?.total_quizzes, 10) || 0,
                    passed: parseInt(quizAggregateResult.rows[0]?.quizzes_passed, 10) || 0,
                    avgScore: Math.round(Number(quizAggregateResult.rows[0]?.avg_score) || 0),
                    bestScore: parseInt(quizAggregateResult.rows[0]?.best_score, 10) || 0
                },
                quizResults: recentQuizResult.rows,
                badges: {
                    earned: parseInt(badgesResult.rows[0]?.badge_count, 10) || 0,
                    total: Object.keys(BADGES).length
                },
                totalXP: parseInt(badgesResult.rows[0]?.total_xp, 10) || 0
            }
        });
    } catch (error: any) {
        logger.error('Get my stats error', { error: error.message });
        res.status(500).json({ success: false, error: 'Failed to fetch statistics' });
    }
};

/**
 * Get current lab conditions
 */
export const getLabConditions = async (_req: Request, res: Response) => {
    try {
        const conditions = await resolveLabConditions();

        res.json({
            success: true,
            conditions
        });
    } catch (error: any) {
        logger.error('Get lab conditions error', { error: error.message });
        res.status(500).json({ success: false, error: 'Failed to fetch lab conditions' });
    }
};

/**
 * Update lab conditions (trainer)
 */
export const updateLabConditions = async (req: Request, res: Response) => {
    try {
        const current = await resolveLabConditions();
        const payload = (req.body || {}) as Record<string, unknown>;
        const updated = normalizeLabConditionsPayload(payload, current);
        updated.updatedBy = (req as any).user?.userId || null;

        inMemoryLabConditions = updated;
        await persistLabConditionsToDb(updated);

        res.json({
            success: true,
            message: 'Lab conditions updated',
            conditions: updated
        });
    } catch (error: any) {
        logger.error('Update lab conditions error', { error: error.message });
        res.status(500).json({ success: false, error: 'Failed to update lab conditions' });
    }
};

/**
 * Reset lab conditions (trainer)
 */
export const resetLabConditions = async (req: Request, res: Response) => {
    try {
        const resetState: LabConditions = {
            ...DEFAULT_LAB_CONDITIONS,
            updatedBy: (req as any).user?.userId || null,
            updatedAt: new Date().toISOString()
        };

        inMemoryLabConditions = resetState;
        await persistLabConditionsToDb(resetState);

        res.json({
            success: true,
            message: 'Lab conditions reset',
            conditions: resetState
        });
    } catch (error: any) {
        logger.error('Reset lab conditions error', { error: error.message });
        res.status(500).json({ success: false, error: 'Failed to reset lab conditions' });
    }
};

/**
 * Get (and auto-issue if eligible) student certificate
 */
export const getMyCertificate = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.userId;

        const eligibility = await getCertificateEligibility(userId);
        const certificate = eligibility.eligible
            ? await issueCertificateIfEligible(userId)
            : null;

        res.json({
            success: true,
            eligible: eligibility.eligible,
            eligibility,
            certificate
        });
    } catch (error: any) {
        logger.error('Get certificate error', { error: error.message });
        res.status(500).json({ success: false, error: 'Failed to fetch certificate' });
    }
};

/**
 * Get student progress (trainer)
 */
export const getStudentProgress = async (req: Request, res: Response) => {
    try {
        const { studentId } = req.params;

        const usersController = require('./users.controller');
        req.params.id = studentId;
        return usersController.getStudentProgress(req, res);
    } catch (error: any) {
        logger.error('Get student progress error', { error: error.message });
        res.status(500).json({ success: false, error: 'Failed to fetch student progress' });
    }
};

/**
 * Get cohort analytics (trainer)
 */
export const getCohortAnalytics = async (_req: Request, res: Response) => {
    try {
        const [workshops, studentsCount, progressStats, quizStats, badgeStats] = await Promise.all([
            getActiveWorkshops(),
            query(`SELECT COUNT(*) FROM users.users WHERE role = 'ROLE_ETUDIANT'`),
            query(
                `SELECT
                    sp.workshop_id,
                    COUNT(DISTINCT sp.student_id) as students_started,
                    COUNT(CASE WHEN sp.status = 'COMPLETED' THEN 1 END) as students_completed,
                    AVG(sp.progress_percent) as avg_progress,
                    AVG(sp.time_spent_minutes) as avg_time
                 FROM learning.student_progress sp
                 GROUP BY sp.workshop_id`
            ),
            query(
                `SELECT
                    qr.quiz_id,
                    COUNT(*) as attempts,
                    COUNT(DISTINCT qr.student_id) as unique_students,
                    AVG(qr.percentage) as avg_score,
                    COUNT(CASE WHEN qr.passed THEN 1 END) as passes
                 FROM learning.quiz_results qr
                 GROUP BY qr.quiz_id`
            ),
            query(
                `SELECT
                    badge_type,
                    COUNT(DISTINCT student_id) as students_earned
                 FROM learning.badges
                 GROUP BY badge_type`
            )
        ]);

        const workshopTitleById = new Map(workshops.map((workshop) => [workshop.id, workshop.title]));

        const recentActivity = await query(
            `SELECT
                u.username,
                u.first_name,
                u.last_name,
                'quiz_submitted' as activity_type,
                qr.quiz_id as activity_target,
                qr.percentage as activity_value,
                qr.submitted_at as activity_time
             FROM learning.quiz_results qr
             JOIN users.users u ON qr.student_id = u.id
             ORDER BY qr.submitted_at DESC
             LIMIT 10`
        );

        res.json({
            success: true,
            analytics: {
                totalStudents: parseInt(studentsCount.rows[0].count, 10),
                workshopProgress: progressStats.rows.map((row) => ({
                    workshopId: row.workshop_id,
                    title: workshopTitleById.get(row.workshop_id)
                        || DEFAULT_WORKSHOPS[row.workshop_id as keyof typeof DEFAULT_WORKSHOPS]?.title
                        || row.workshop_id,
                    studentsStarted: parseInt(row.students_started, 10),
                    studentsCompleted: parseInt(row.students_completed, 10),
                    avgProgress: Math.round(Number(row.avg_progress) || 0),
                    avgTimeMinutes: Math.round(Number(row.avg_time) || 0)
                })),
                quizPerformance: quizStats.rows.map((row) => ({
                    quizId: row.quiz_id,
                    attempts: parseInt(row.attempts, 10),
                    uniqueStudents: parseInt(row.unique_students, 10),
                    avgScore: Math.round(Number(row.avg_score) || 0),
                    passRate:
                        parseInt(row.attempts, 10) > 0
                            ? Math.round((parseInt(row.passes, 10) / parseInt(row.attempts, 10)) * 100)
                            : 0
                })),
                badgeDistribution: badgeStats.rows.map((row) => ({
                    badgeType: row.badge_type,
                    name: BADGES[row.badge_type as keyof typeof BADGES]?.name || row.badge_type,
                    studentsEarned: parseInt(row.students_earned, 10)
                })),
                recentActivity: recentActivity.rows
            }
        });
    } catch (error: any) {
        logger.error('Get cohort analytics error', { error: error.message });
        res.status(500).json({ success: false, error: 'Failed to fetch cohort analytics' });
    }
};

/**
 * Helper: Award badge to student.
 */
async function awardBadge(studentId: string, badgeType: keyof typeof BADGES): Promise<boolean> {
    try {
        const badge = BADGES[badgeType];
        if (!badge) {
            return false;
        }

        await query(
            `INSERT INTO learning.badges (student_id, badge_type, badge_name, badge_description, badge_icon, xp_awarded)
             VALUES ($1, $2, $3, $4, $5, $6)
             ON CONFLICT (student_id, badge_type) DO NOTHING`,
            [studentId, badgeType, badge.name, badge.description, badge.icon, badge.xp]
        );

        logger.info('Badge awarded', { studentId, badgeType });
        return true;
    } catch (error: any) {
        logger.error('Award badge error', { error: error.message, studentId, badgeType });
        return false;
    }
}
