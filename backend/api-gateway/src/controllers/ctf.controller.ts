import { Request, Response } from 'express';
import { query } from '../config/database';
import {
    awardCtfBadges,
    calculatePoints,
    unlockNextChallenges,
    validateFlag,
} from '../services/ctfEvaluation.service';
import {
    CTF_CHALLENGES,
    CTF_TOTAL_ACTIVE_CHALLENGES,
    CtfChallengeSeed,
} from '../data/ctfChallenges';
import { logger } from '../utils/logger';

type CtfMode = 'GUIDED' | 'FREE';

type CtfStatus = 'LOCKED' | 'UNLOCKED' | 'IN_PROGRESS' | 'COMPLETED';

let seedInitialized = false;
let seedInFlight: Promise<void> | null = null;

function getStudentId(req: Request): string | null {
    return (req as any).user?.userId || null;
}

function parseMode(value: unknown): CtfMode {
    return String(value || 'GUIDED').toUpperCase() === 'FREE' ? 'FREE' : 'GUIDED';
}

function normalizeIntArray(value: unknown): number[] {
    if (Array.isArray(value)) {
        return value.map((entry) => Number(entry)).filter((entry) => Number.isInteger(entry) && entry > 0);
    }

    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (!trimmed || trimmed === '{}') {
            return [];
        }

        return trimmed
            .replace('{', '')
            .replace('}', '')
            .split(',')
            .map((entry) => Number(entry.trim()))
            .filter((entry) => Number.isInteger(entry) && entry > 0);
    }

    return [];
}

async function isPrerequisiteCompleted(studentId: string, prerequisiteCode: string | null): Promise<boolean> {
    if (!prerequisiteCode) {
        return true;
    }

    const result = await query(
        `SELECT EXISTS (
            SELECT 1
            FROM learning.ctf_submissions s
            JOIN learning.ctf_challenges c ON c.id = s.challenge_id
            WHERE s.student_id = $1
              AND s.is_correct = true
              AND c.challenge_code = $2
        ) AS prerequisite_met`,
        [studentId, prerequisiteCode]
    );

    return Boolean(result.rows[0]?.prerequisite_met);
}

async function upsertChallengeSeed(challenge: CtfChallengeSeed): Promise<void> {
    const challengeResult = await query(
        `INSERT INTO learning.ctf_challenges (
            challenge_code,
            title,
            description,
            category,
            difficulty,
            points,
            flag_value,
            prerequisite_challenge_code,
            target_service,
            target_endpoint,
            vulnerability_type,
            attack_vector,
            learning_objectives,
            estimated_minutes,
            is_active
        )
        VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8,
            $9, $10, $11, $12, $13::jsonb, $14, $15
        )
        ON CONFLICT (challenge_code)
        DO UPDATE SET
            title = EXCLUDED.title,
            description = EXCLUDED.description,
            category = EXCLUDED.category,
            difficulty = EXCLUDED.difficulty,
            points = EXCLUDED.points,
            flag_value = EXCLUDED.flag_value,
            prerequisite_challenge_code = EXCLUDED.prerequisite_challenge_code,
            target_service = EXCLUDED.target_service,
            target_endpoint = EXCLUDED.target_endpoint,
            vulnerability_type = EXCLUDED.vulnerability_type,
            attack_vector = EXCLUDED.attack_vector,
            learning_objectives = EXCLUDED.learning_objectives,
            estimated_minutes = EXCLUDED.estimated_minutes,
            is_active = EXCLUDED.is_active,
            updated_at = NOW()
        RETURNING id`,
        [
            challenge.code,
            challenge.title,
            challenge.description,
            challenge.category,
            challenge.difficulty,
            challenge.points,
            challenge.flagValue,
            challenge.prerequisiteChallengeCode || null,
            challenge.targetService,
            challenge.targetEndpoint,
            challenge.vulnerabilityType,
            challenge.attackVector,
            JSON.stringify(challenge.learningObjectives || []),
            challenge.estimatedMinutes,
            challenge.isActive,
        ]
    );

    const challengeId = challengeResult.rows[0]?.id;
    if (!challengeId) {
        return;
    }

    await query('DELETE FROM learning.ctf_guided_steps WHERE challenge_id = $1', [challengeId]);
    await query('DELETE FROM learning.ctf_hints WHERE challenge_id = $1', [challengeId]);

    for (const step of challenge.guidedSteps) {
        await query(
            `INSERT INTO learning.ctf_guided_steps (
                challenge_id,
                step_number,
                step_title,
                step_description,
                step_type,
                command_template,
                expected_output,
                hint_text
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
                challengeId,
                step.stepNumber,
                step.stepTitle,
                step.stepDescription,
                step.stepType,
                step.commandTemplate || null,
                step.expectedOutput || null,
                step.hintText || null,
            ]
        );
    }

    for (const hint of challenge.hints) {
        await query(
            `INSERT INTO learning.ctf_hints (challenge_id, hint_number, hint_text, cost_points)
             VALUES ($1, $2, $3, $4)`,
            [challengeId, hint.hintNumber, hint.hintText, hint.costPoints]
        );
    }
}

async function seedCtfChallengesIfNeeded(): Promise<void> {
    const countResult = await query('SELECT COUNT(*)::INTEGER AS count FROM learning.ctf_challenges');
    const challengeCount = parseInt(countResult.rows[0]?.count, 10) || 0;

    if (challengeCount >= CTF_TOTAL_ACTIVE_CHALLENGES) {
        return;
    }

    for (const challenge of CTF_CHALLENGES) {
        await upsertChallengeSeed(challenge);
    }

    logger.info('CTF challenge seed completed', {
        seededChallenges: CTF_CHALLENGES.length,
    });
}

async function ensureCtfSeeded(): Promise<void> {
    if (seedInitialized) {
        return;
    }

    if (!seedInFlight) {
        seedInFlight = seedCtfChallengesIfNeeded()
            .then(() => {
                seedInitialized = true;
            })
            .catch((error: any) => {
                logger.error('Failed to seed CTF content', { error: error.message });
                throw error;
            })
            .finally(() => {
                seedInFlight = null;
            });
    }

    await seedInFlight;
}

async function getChallengeByCode(challengeCode: string) {
    const challengeResult = await query(
        `SELECT *
         FROM learning.ctf_challenges
         WHERE challenge_code = $1
           AND is_active = true
         LIMIT 1`,
        [challengeCode]
    );

    return challengeResult.rows[0] || null;
}

function serializeChallenge(challenge: any) {
    return {
        id: challenge.id,
        code: challenge.challenge_code,
        title: challenge.title,
        description: challenge.description,
        category: challenge.category,
        difficulty: challenge.difficulty,
        points: Number(challenge.points),
        prerequisiteChallengeCode: challenge.prerequisite_challenge_code,
        targetService: challenge.target_service,
        targetEndpoint: challenge.target_endpoint,
        vulnerabilityType: challenge.vulnerability_type,
        attackVector: challenge.attack_vector,
        learningObjectives: Array.isArray(challenge.learning_objectives)
            ? challenge.learning_objectives
            : [],
        estimatedMinutes: Number(challenge.estimated_minutes || 15),
        isActive: Boolean(challenge.is_active),
    };
}

export const getChallenges = async (req: Request, res: Response) => {
    try {
        await ensureCtfSeeded();

        const studentId = getStudentId(req);
        if (!studentId) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }

        const [challengeRows, progressRows, completedRows] = await Promise.all([
            query(
                `SELECT
                    c.*,
                    COALESCE(s.solve_count, 0)::INTEGER AS solve_count
                 FROM learning.ctf_challenges c
                 LEFT JOIN (
                    SELECT challenge_id, COUNT(DISTINCT student_id)::INTEGER AS solve_count
                    FROM learning.ctf_submissions
                    WHERE is_correct = true
                    GROUP BY challenge_id
                 ) s ON s.challenge_id = c.id
                 WHERE c.is_active = true
                 ORDER BY c.category ASC, c.challenge_code ASC`
            ),
            query(
                `SELECT challenge_id, status, mode_preference, current_guided_step, hints_unlocked, started_at, completed_at
                 FROM learning.ctf_student_progress
                 WHERE student_id = $1`,
                [studentId]
            ),
            query(
                `SELECT DISTINCT c.challenge_code
                 FROM learning.ctf_submissions s
                 JOIN learning.ctf_challenges c ON c.id = s.challenge_id
                 WHERE s.student_id = $1
                   AND s.is_correct = true`,
                [studentId]
            ),
        ]);

        const progressByChallengeId = new Map(progressRows.rows.map((row) => [row.challenge_id, row]));
        const completedCodes = new Set(completedRows.rows.map((row) => row.challenge_code));

        const challenges = challengeRows.rows.map((challenge) => {
            const progress = progressByChallengeId.get(challenge.id);
            const prerequisiteCode = challenge.prerequisite_challenge_code || null;

            const inferredStatus: CtfStatus = progress?.status
                || (!prerequisiteCode || completedCodes.has(prerequisiteCode)
                    ? 'UNLOCKED'
                    : 'LOCKED');

            return {
                ...serializeChallenge(challenge),
                status: inferredStatus,
                modePreference: progress?.mode_preference || 'GUIDED',
                currentGuidedStep: Number(progress?.current_guided_step || 1),
                hintsUnlocked: normalizeIntArray(progress?.hints_unlocked),
                startedAt: progress?.started_at || null,
                completedAt: progress?.completed_at || null,
                solveCount: Number(challenge.solve_count || 0),
            };
        });

        res.json({
            success: true,
            challenges,
            total: challenges.length,
        });
    } catch (error: any) {
        logger.error('CTF getChallenges failed', { error: error.message });
        res.status(500).json({ success: false, error: 'Failed to fetch CTF challenges' });
    }
};

export const getChallengeDetail = async (req: Request, res: Response) => {
    try {
        await ensureCtfSeeded();

        const studentId = getStudentId(req);
        if (!studentId) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }

        const challengeCode = req.params.code;
        const challenge = await getChallengeByCode(challengeCode);

        if (!challenge) {
            return res.status(404).json({ success: false, error: 'Challenge not found' });
        }

        const progressResult = await query(
            `SELECT *
             FROM learning.ctf_student_progress
             WHERE student_id = $1
               AND challenge_id = $2
             LIMIT 1`,
            [studentId, challenge.id]
        );
        const progress = progressResult.rows[0] || null;

        const prerequisiteMet = await isPrerequisiteCompleted(studentId, challenge.prerequisite_challenge_code || null);
        const unlocked = progress?.status !== 'LOCKED' && prerequisiteMet;

        const challengePayload = serializeChallenge(challenge);
        const mode = parseMode(req.query.mode || progress?.mode_preference || 'GUIDED');

        if (!unlocked && !progress) {
            return res.status(403).json({
                success: false,
                error: 'Challenge is locked. Complete prerequisite first.',
                challenge: {
                    ...challengePayload,
                    status: 'LOCKED',
                },
            });
        }

        const hintRows = await query(
            `SELECT hint_number, hint_text, cost_points
             FROM learning.ctf_hints
             WHERE challenge_id = $1
             ORDER BY hint_number ASC`,
            [challenge.id]
        );

        const hintsUnlocked = normalizeIntArray(progress?.hints_unlocked);
        const hints = hintRows.rows.map((row) => {
            const hintNumber = Number(row.hint_number);
            const unlockedHint = hintsUnlocked.includes(hintNumber);

            return {
                hintNumber,
                costPoints: Number(row.cost_points || 10),
                unlocked: unlockedHint,
                hintText: unlockedHint ? row.hint_text : null,
            };
        });

        if (mode === 'GUIDED') {
            const stepsResult = await query(
                `SELECT step_number, step_title, step_description, step_type, command_template, expected_output, hint_text
                 FROM learning.ctf_guided_steps
                 WHERE challenge_id = $1
                 ORDER BY step_number ASC`,
                [challenge.id]
            );

            const totalSteps = stepsResult.rows.length;
            const currentGuidedStep = Math.max(1, Number(progress?.current_guided_step || 1));
            const maxVisibleStep = progress?.status === 'COMPLETED'
                ? totalSteps
                : Math.min(currentGuidedStep, totalSteps);

            const guidedSteps = stepsResult.rows
                .filter((step) => Number(step.step_number) <= maxVisibleStep)
                .map((step) => ({
                    stepNumber: Number(step.step_number),
                    stepTitle: step.step_title,
                    stepDescription: step.step_description,
                    stepType: step.step_type,
                    commandTemplate: step.command_template,
                    expectedOutput: step.expected_output,
                    hintText: step.hint_text,
                }));

            return res.json({
                success: true,
                challenge: {
                    ...challengePayload,
                    status: progress?.status || 'UNLOCKED',
                    started: Boolean(progress),
                    mode,
                    currentGuidedStep,
                    totalSteps,
                    hintsUnlocked,
                    hints,
                    guidedSteps,
                },
            });
        }

        return res.json({
            success: true,
            challenge: {
                ...challengePayload,
                status: progress?.status || 'UNLOCKED',
                started: Boolean(progress),
                mode,
                freeModeDescription: CTF_CHALLENGES.find((item) => item.code === challenge.challenge_code)?.freeModeDescription
                    || challenge.description,
                hints,
                hintsUnlocked,
            },
        });
    } catch (error: any) {
        logger.error('CTF getChallengeDetail failed', { error: error.message });
        res.status(500).json({ success: false, error: 'Failed to fetch challenge detail' });
    }
};

export const startChallenge = async (req: Request, res: Response) => {
    try {
        await ensureCtfSeeded();

        const studentId = getStudentId(req);
        if (!studentId) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }

        const challengeCode = req.params.code;
        const mode = parseMode(req.body?.mode);

        const challenge = await getChallengeByCode(challengeCode);
        if (!challenge) {
            return res.status(404).json({ success: false, error: 'Challenge not found' });
        }

        const prerequisiteMet = await isPrerequisiteCompleted(studentId, challenge.prerequisite_challenge_code || null);
        if (!prerequisiteMet) {
            return res.status(403).json({
                success: false,
                error: `Challenge locked. Complete prerequisite ${challenge.prerequisite_challenge_code}`,
            });
        }

        const progressResult = await query(
            `INSERT INTO learning.ctf_student_progress
                (student_id, challenge_id, status, mode_preference, current_guided_step, started_at)
             VALUES
                ($1, $2, 'IN_PROGRESS', $3, 1, NOW())
             ON CONFLICT (student_id, challenge_id)
             DO UPDATE SET
                status = CASE
                    WHEN learning.ctf_student_progress.status = 'COMPLETED' THEN learning.ctf_student_progress.status
                    ELSE 'IN_PROGRESS'
                END,
                mode_preference = EXCLUDED.mode_preference,
                started_at = COALESCE(learning.ctf_student_progress.started_at, NOW()),
                updated_at = NOW()
             RETURNING status, mode_preference, current_guided_step, started_at, completed_at`,
            [studentId, challenge.id, mode]
        );

        res.json({
            success: true,
            challengeCode,
            progress: progressResult.rows[0],
        });
    } catch (error: any) {
        logger.error('CTF startChallenge failed', { error: error.message });
        res.status(500).json({ success: false, error: 'Failed to start challenge' });
    }
};

export const advanceGuidedStep = async (req: Request, res: Response) => {
    try {
        await ensureCtfSeeded();

        const studentId = getStudentId(req);
        if (!studentId) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }

        const challengeCode = req.params.code;
        const challenge = await getChallengeByCode(challengeCode);

        if (!challenge) {
            return res.status(404).json({ success: false, error: 'Challenge not found' });
        }

        const progressResult = await query(
            `SELECT *
             FROM learning.ctf_student_progress
             WHERE student_id = $1
               AND challenge_id = $2
             LIMIT 1`,
            [studentId, challenge.id]
        );

        const progress = progressResult.rows[0];
        if (!progress) {
            return res.status(400).json({ success: false, error: 'Challenge not started yet' });
        }

        if (progress.mode_preference !== 'GUIDED') {
            return res.status(400).json({ success: false, error: 'Current challenge mode is not GUIDED' });
        }

        const stepCountResult = await query(
            `SELECT COUNT(*)::INTEGER AS total_steps
             FROM learning.ctf_guided_steps
             WHERE challenge_id = $1`,
            [challenge.id]
        );

        const totalSteps = parseInt(stepCountResult.rows[0]?.total_steps, 10) || 1;
        const nextStep = Math.min(totalSteps, Number(progress.current_guided_step || 1) + 1);

        const updateResult = await query(
            `UPDATE learning.ctf_student_progress
             SET
                current_guided_step = $3,
                status = CASE
                    WHEN status = 'UNLOCKED' THEN 'IN_PROGRESS'
                    ELSE status
                END,
                updated_at = NOW()
             WHERE student_id = $1
               AND challenge_id = $2
             RETURNING current_guided_step, status`,
            [studentId, challenge.id, nextStep]
        );

        res.json({
            success: true,
            currentGuidedStep: Number(updateResult.rows[0]?.current_guided_step || nextStep),
            totalSteps,
            status: updateResult.rows[0]?.status || progress.status,
        });
    } catch (error: any) {
        logger.error('CTF advanceGuidedStep failed', { error: error.message });
        res.status(500).json({ success: false, error: 'Failed to advance guided step' });
    }
};

export const submitFlag = async (req: Request, res: Response) => {
    try {
        await ensureCtfSeeded();

        const studentId = getStudentId(req);
        if (!studentId) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }

        const challengeCode = req.params.code;
        // Backward compatible payload: frontend may send {flag} or {submittedFlag}.
        const submittedFlag = String(req.body?.submittedFlag ?? req.body?.flag ?? '').trim();
        if (!submittedFlag) {
            return res.status(400).json({ success: false, error: 'submittedFlag is required' });
        }

        const challenge = await getChallengeByCode(challengeCode);
        if (!challenge) {
            return res.status(404).json({ success: false, error: 'Challenge not found' });
        }

        const prerequisiteMet = await isPrerequisiteCompleted(studentId, challenge.prerequisite_challenge_code || null);
        if (!prerequisiteMet) {
            return res.status(403).json({
                success: false,
                error: `Challenge locked. Complete prerequisite ${challenge.prerequisite_challenge_code}`,
            });
        }

        const mode = parseMode(req.body?.mode);

        const progressUpsert = await query(
            `INSERT INTO learning.ctf_student_progress
                (student_id, challenge_id, status, mode_preference, current_guided_step, started_at)
             VALUES ($1, $2, 'IN_PROGRESS', $3, 1, NOW())
             ON CONFLICT (student_id, challenge_id)
             DO UPDATE SET
                status = CASE
                    WHEN learning.ctf_student_progress.status = 'LOCKED' THEN 'IN_PROGRESS'
                    ELSE learning.ctf_student_progress.status
                END,
                mode_preference = COALESCE(learning.ctf_student_progress.mode_preference, EXCLUDED.mode_preference),
                started_at = COALESCE(learning.ctf_student_progress.started_at, NOW()),
                updated_at = NOW()
             RETURNING *`,
            [studentId, challenge.id, mode]
        );

        const progress = progressUpsert.rows[0];
        const hintsUnlocked = normalizeIntArray(progress?.hints_unlocked);
        const hintsUsed = hintsUnlocked.length;

        const hintCostResult = hintsUsed > 0
            ? await query(
                `SELECT COALESCE(SUM(cost_points), 0)::INTEGER AS total_hint_cost
                 FROM learning.ctf_hints
                 WHERE challenge_id = $1
                   AND hint_number = ANY($2::int[])`,
                [challenge.id, hintsUnlocked]
            )
            : { rows: [{ total_hint_cost: 0 }] } as any;

        const totalHintCost = parseInt(hintCostResult.rows[0]?.total_hint_cost, 10) || 0;

        const isCorrect = validateFlag(submittedFlag, challenge.flag_value);

        const existingCorrectResult = await query(
            `SELECT EXISTS (
                SELECT 1
                FROM learning.ctf_submissions
                WHERE student_id = $1
                  AND challenge_id = $2
                  AND is_correct = true
            ) AS already_solved`,
            [studentId, challenge.id]
        );

        const alreadySolved = Boolean(existingCorrectResult.rows[0]?.already_solved);

        let isFirstBlood = false;
        let pointsAwarded = 0;
        let unlockedCount = 0;
        let awardedBadges: string[] = [];

        if (isCorrect && !alreadySolved) {
            const firstBloodResult = await query(
                `SELECT COUNT(*)::INTEGER AS solved_count
                 FROM learning.ctf_submissions
                 WHERE challenge_id = $1
                   AND is_correct = true`,
                [challenge.id]
            );

            const solvedCount = parseInt(firstBloodResult.rows[0]?.solved_count, 10) || 0;
            isFirstBlood = solvedCount === 0;
            pointsAwarded = calculatePoints(
                Number(challenge.points),
                hintsUsed,
                totalHintCost,
                isFirstBlood
            );
        }

        await query(
            `INSERT INTO learning.ctf_submissions
                (student_id, challenge_id, submitted_flag, is_correct, mode, points_awarded, hints_used, is_first_blood, submitted_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
            [
                studentId,
                challenge.id,
                submittedFlag,
                isCorrect,
                mode,
                pointsAwarded,
                hintsUsed,
                isFirstBlood,
            ]
        );

        if (isCorrect && !alreadySolved) {
            await query(
                `UPDATE learning.ctf_student_progress
                 SET
                    status = 'COMPLETED',
                    current_guided_step = GREATEST(
                        current_guided_step,
                        COALESCE((
                            SELECT MAX(step_number)
                            FROM learning.ctf_guided_steps
                            WHERE challenge_id = $2
                        ), current_guided_step)
                    ),
                    completed_at = NOW(),
                    updated_at = NOW()
                 WHERE student_id = $1
                   AND challenge_id = $2`,
                [studentId, challenge.id]
            );

            unlockedCount = await unlockNextChallenges(studentId, challenge.challenge_code);
            awardedBadges = await awardCtfBadges(studentId);
        }

        res.json({
            success: true,
            result: {
                challengeCode,
                isCorrect,
                alreadySolved,
                mode,
                pointsAwarded,
                hintsUsed,
                isFirstBlood,
                unlockedCount,
                awardedBadges,
            },
        });
    } catch (error: any) {
        logger.error('CTF submitFlag failed', { error: error.message });
        res.status(500).json({ success: false, error: 'Failed to submit flag' });
    }
};

export const unlockHint = async (req: Request, res: Response) => {
    try {
        await ensureCtfSeeded();

        const studentId = getStudentId(req);
        if (!studentId) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }

        const challengeCode = req.params.code;
        const hintNumber = Number(req.params.number);
        if (!Number.isInteger(hintNumber) || hintNumber <= 0) {
            return res.status(400).json({ success: false, error: 'Invalid hint number' });
        }

        const challenge = await getChallengeByCode(challengeCode);
        if (!challenge) {
            return res.status(404).json({ success: false, error: 'Challenge not found' });
        }

        const progressResult = await query(
            `SELECT *
             FROM learning.ctf_student_progress
             WHERE student_id = $1
               AND challenge_id = $2
             LIMIT 1`,
            [studentId, challenge.id]
        );
        const progress = progressResult.rows[0];

        if (!progress) {
            return res.status(400).json({ success: false, error: 'Start challenge first before unlocking hints' });
        }

        const hintResult = await query(
            `SELECT hint_number, hint_text, cost_points
             FROM learning.ctf_hints
             WHERE challenge_id = $1
               AND hint_number = $2
             LIMIT 1`,
            [challenge.id, hintNumber]
        );

        if ((hintResult.rowCount ?? 0) === 0) {
            return res.status(404).json({ success: false, error: 'Hint not found' });
        }

        const currentHints = normalizeIntArray(progress.hints_unlocked);
        const alreadyUnlocked = currentHints.includes(hintNumber);

        if (!alreadyUnlocked) {
            await query(
                `UPDATE learning.ctf_student_progress
                 SET
                    hints_unlocked = CASE
                        WHEN hints_unlocked @> ARRAY[$3]::INTEGER[] THEN hints_unlocked
                        ELSE array_append(hints_unlocked, $3)
                    END,
                    updated_at = NOW()
                 WHERE student_id = $1
                   AND challenge_id = $2`,
                [studentId, challenge.id, hintNumber]
            );
        }

        res.json({
            success: true,
            hint: {
                hintNumber,
                hintText: hintResult.rows[0].hint_text,
                costPoints: Number(hintResult.rows[0].cost_points || 10),
                alreadyUnlocked,
            },
        });
    } catch (error: any) {
        logger.error('CTF unlockHint failed', { error: error.message });
        res.status(500).json({ success: false, error: 'Failed to unlock hint' });
    }
};

export const getProgress = async (req: Request, res: Response) => {
    try {
        await ensureCtfSeeded();

        const studentId = getStudentId(req);
        if (!studentId) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }

        const [progressRows, scoreRows, solvedRows, totalRows] = await Promise.all([
            query(
                `SELECT
                    p.status,
                    p.mode_preference,
                    p.current_guided_step,
                    p.hints_unlocked,
                    p.started_at,
                    p.completed_at,
                    c.challenge_code,
                    c.title,
                    c.points,
                    c.category,
                    c.difficulty
                 FROM learning.ctf_student_progress p
                 JOIN learning.ctf_challenges c ON c.id = p.challenge_id
                 WHERE p.student_id = $1
                 ORDER BY c.challenge_code ASC`,
                [studentId]
            ),
            query(
                `SELECT COALESCE(SUM(points_awarded), 0)::INTEGER AS total_points
                 FROM learning.ctf_submissions
                 WHERE student_id = $1
                   AND is_correct = true`,
                [studentId]
            ),
            query(
                `SELECT COUNT(DISTINCT challenge_id)::INTEGER AS solved_count
                 FROM learning.ctf_submissions
                 WHERE student_id = $1
                   AND is_correct = true`,
                [studentId]
            ),
            query(
                `SELECT COUNT(*)::INTEGER AS total_count
                 FROM learning.ctf_challenges
                 WHERE is_active = true`
            ),
        ]);

        const progress = progressRows.rows.map((row) => ({
            challengeCode: row.challenge_code,
            title: row.title,
            category: row.category,
            difficulty: row.difficulty,
            points: Number(row.points || 0),
            status: row.status,
            modePreference: row.mode_preference,
            currentGuidedStep: Number(row.current_guided_step || 1),
            hintsUnlocked: normalizeIntArray(row.hints_unlocked),
            startedAt: row.started_at,
            completedAt: row.completed_at,
        }));

        res.json({
            success: true,
            progress,
            summary: {
                totalPoints: parseInt(scoreRows.rows[0]?.total_points, 10) || 0,
                solvedChallenges: parseInt(solvedRows.rows[0]?.solved_count, 10) || 0,
                totalChallenges: parseInt(totalRows.rows[0]?.total_count, 10) || 0,
            },
        });
    } catch (error: any) {
        logger.error('CTF getProgress failed', { error: error.message });
        res.status(500).json({ success: false, error: 'Failed to fetch CTF progress' });
    }
};

export const getLeaderboard = async (req: Request, res: Response) => {
    try {
        await ensureCtfSeeded();

        const requestedLimit = parseInt(String(req.query.limit || '50'), 10);
        const limit = Number.isFinite(requestedLimit)
            ? Math.max(1, Math.min(200, requestedLimit))
            : 50;

        const result = await query(
            `SELECT student_id, username, first_name, last_name, challenges_solved, total_points, first_bloods, rank
             FROM learning.ctf_leaderboard
             ORDER BY rank ASC
             LIMIT $1`,
            [limit]
        );

        res.json({
            success: true,
            leaderboard: result.rows,
            total: result.rows.length,
        });
    } catch (error: any) {
        logger.error('CTF getLeaderboard failed', { error: error.message });
        res.status(500).json({ success: false, error: 'Failed to fetch CTF leaderboard' });
    }
};

export const getAdminSubmissions = async (_req: Request, res: Response) => {
    try {
        await ensureCtfSeeded();

        const result = await query(
            `SELECT
                s.id,
                s.submitted_flag,
                s.is_correct,
                s.mode,
                s.points_awarded,
                s.hints_used,
                s.is_first_blood,
                s.submitted_at,
                c.challenge_code,
                c.title,
                u.id AS student_id,
                u.username,
                u.first_name,
                u.last_name
             FROM learning.ctf_submissions s
             JOIN learning.ctf_challenges c ON c.id = s.challenge_id
             JOIN users.users u ON u.id = s.student_id
             ORDER BY s.submitted_at DESC
             LIMIT 1000`
        );

        res.json({
            success: true,
            submissions: result.rows,
            total: result.rows.length,
        });
    } catch (error: any) {
        logger.error('CTF getAdminSubmissions failed', { error: error.message });
        res.status(500).json({ success: false, error: 'Failed to fetch CTF submissions' });
    }
};

export const getAdminAnalytics = async (_req: Request, res: Response) => {
    try {
        await ensureCtfSeeded();

        const [challengeStats, blockedStudents] = await Promise.all([
            query(
                `SELECT
                    c.challenge_code,
                    c.title,
                    c.category,
                    c.difficulty,
                    c.points,
                    COUNT(s.id)::INTEGER AS attempts,
                    COUNT(*) FILTER (WHERE s.is_correct = true)::INTEGER AS successful_submissions,
                    COUNT(DISTINCT CASE WHEN s.is_correct = true THEN s.student_id END)::INTEGER AS unique_solvers,
                    COALESCE(ROUND(
                        (COUNT(*) FILTER (WHERE s.is_correct = true)::NUMERIC / NULLIF(COUNT(s.id), 0)) * 100,
                        2
                    ), 0) AS resolution_rate,
                    COALESCE(ROUND(AVG(
                        EXTRACT(EPOCH FROM (p.completed_at - p.started_at)) / 60
                    ) FILTER (
                        WHERE p.completed_at IS NOT NULL AND p.started_at IS NOT NULL
                    ), 2), 0) AS avg_completion_minutes
                 FROM learning.ctf_challenges c
                 LEFT JOIN learning.ctf_submissions s ON s.challenge_id = c.id
                 LEFT JOIN learning.ctf_student_progress p
                    ON p.challenge_id = c.id
                    AND p.student_id = s.student_id
                 WHERE c.is_active = true
                 GROUP BY c.id, c.challenge_code, c.title, c.category, c.difficulty, c.points
                 ORDER BY c.challenge_code ASC`
            ),
            query(
                `SELECT
                    u.id AS student_id,
                    u.username,
                    u.first_name,
                    u.last_name,
                    c.challenge_code,
                    c.title,
                    p.started_at,
                    ROUND(EXTRACT(EPOCH FROM (NOW() - p.started_at)) / 3600, 2) AS hours_in_progress
                 FROM learning.ctf_student_progress p
                 JOIN users.users u ON u.id = p.student_id
                 JOIN learning.ctf_challenges c ON c.id = p.challenge_id
                 WHERE p.status = 'IN_PROGRESS'
                   AND p.started_at IS NOT NULL
                   AND p.started_at < (NOW() - INTERVAL '2 HOURS')
                 ORDER BY hours_in_progress DESC
                 LIMIT 200`
            ),
        ]);

        res.json({
            success: true,
            analytics: {
                challengeStats: challengeStats.rows,
                blockedStudents: blockedStudents.rows,
            },
        });
    } catch (error: any) {
        logger.error('CTF getAdminAnalytics failed', { error: error.message });
        res.status(500).json({ success: false, error: 'Failed to fetch CTF analytics' });
    }
};

export const resetStudentProgress = async (req: Request, res: Response) => {
    try {
        await ensureCtfSeeded();

        const { studentId } = req.params;
        if (!studentId) {
            return res.status(400).json({ success: false, error: 'studentId is required' });
        }

        const userCheck = await query(
            `SELECT id
             FROM users.users
             WHERE id = $1
               AND role = 'ROLE_ETUDIANT'
             LIMIT 1`,
            [studentId]
        );

        if ((userCheck.rowCount ?? 0) === 0) {
            return res.status(404).json({ success: false, error: 'Student not found' });
        }

        const deletedSubmissions = await query(
            `DELETE FROM learning.ctf_submissions
             WHERE student_id = $1
             RETURNING id`,
            [studentId]
        );

        const deletedProgress = await query(
            `DELETE FROM learning.ctf_student_progress
             WHERE student_id = $1
             RETURNING id`,
            [studentId]
        );

        await query(
            `INSERT INTO learning.ctf_student_progress
                (student_id, challenge_id, status, mode_preference, current_guided_step)
             SELECT $1, c.id, 'UNLOCKED', 'GUIDED', 1
             FROM learning.ctf_challenges c
             WHERE c.is_active = true
               AND c.prerequisite_challenge_code IS NULL
             ON CONFLICT (student_id, challenge_id) DO NOTHING`,
            [studentId]
        );

        res.json({
            success: true,
            message: 'CTF progression reset completed',
            deleted: {
                submissions: deletedSubmissions.rowCount || 0,
                progressRows: deletedProgress.rowCount || 0,
            },
        });
    } catch (error: any) {
        logger.error('CTF resetStudentProgress failed', { error: error.message });
        res.status(500).json({ success: false, error: 'Failed to reset student CTF progress' });
    }
};
