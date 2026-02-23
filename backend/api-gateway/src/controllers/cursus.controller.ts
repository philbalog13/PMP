/**
 * Cursus Controller – PMP
 * Handles cursus listing, detail, module content, progress and quiz submission.
 */
import { Request, Response } from 'express';
import { query } from '../config/database';
import { logger } from '../utils/logger';
import { awardQuizBadges } from '../services/ctfEvaluation.service';

/* ------------------------------------------------------------------ */
/*  LIST ALL PUBLISHED CURSUS                                          */
/* ------------------------------------------------------------------ */
export const listCursus = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.userId;

        const result = await query(
            `SELECT id, title, description, icon, color, level,
                    estimated_hours, tags, module_count, created_at
             FROM learning.cursus
             WHERE is_published = true
             ORDER BY created_at ASC`
        );

        // Attach student progress summary per cursus
        let progressMap: Record<string, { completed: number; total: number }> = {};
        if (userId) {
            const prog = await query(
                `SELECT cursus_id,
                        COUNT(DISTINCT chapter_id) FILTER (WHERE status = 'COMPLETED')::int AS completed
                 FROM learning.cursus_progress
                 WHERE student_id = $1
                 GROUP BY cursus_id`,
                [userId]
            );
            for (const row of prog.rows) {
                progressMap[row.cursus_id] = { completed: row.completed, total: 0 };
            }
        }

        // Count total chapters per cursus
        const chapterCounts = await query(
            `SELECT cm.cursus_id, COUNT(cc.id)::int AS total
             FROM learning.cursus_modules cm
             JOIN learning.cursus_chapters cc ON cc.module_id = cm.id
             GROUP BY cm.cursus_id`
        );
        for (const row of chapterCounts.rows) {
            if (!progressMap[row.cursus_id]) progressMap[row.cursus_id] = { completed: 0, total: 0 };
            progressMap[row.cursus_id].total = row.total;
        }

        const cursus = result.rows.map((row) => ({
            ...row,
            progress: progressMap[row.id] || { completed: 0, total: 0 }
        }));

        res.json({ success: true, cursus, total: cursus.length });
    } catch (error: any) {
        logger.error('List cursus error', { error: error.message });
        res.status(500).json({ success: false, error: 'Failed to fetch cursus' });
    }
};

/* ------------------------------------------------------------------ */
/*  GET CURSUS DETAIL (modules list)                                   */
/* ------------------------------------------------------------------ */
export const getCursusDetail = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const userId = (req as any).user?.userId;

        const cursusResult = await query(
            `SELECT id, title, description, icon, color, level,
                    estimated_hours, tags, module_count, created_at
             FROM learning.cursus WHERE id = $1 AND is_published = true`,
            [id]
        );
        if ((cursusResult.rowCount ?? 0) === 0) {
            return res.status(404).json({ success: false, error: 'Cursus not found' });
        }

        const modulesResult = await query(
            `SELECT id, title, description, module_order, estimated_minutes,
                    difficulty, chapter_count
             FROM learning.cursus_modules
             WHERE cursus_id = $1
             ORDER BY module_order ASC`,
            [id]
        );

        // Quizzes for this cursus
        const quizzesResult = await query(
            `SELECT id, module_id, title, is_final_evaluation
             FROM learning.cursus_quizzes
             WHERE cursus_id = $1
             ORDER BY is_final_evaluation ASC`,
            [id]
        );

        // Student progress – group by module for accurate per-module counts
        let completedChapters: Set<string> = new Set();
        let completedByModule: Record<string, number> = {};
        let quizScoreByModule: Record<string, number> = {};
        if (userId) {
            const prog = await query(
                `SELECT chapter_id, module_id FROM learning.cursus_progress
                 WHERE student_id = $1 AND cursus_id = $2 AND status = 'COMPLETED' AND chapter_id IS NOT NULL`,
                [userId, id]
            );
            completedChapters = new Set(prog.rows.map((r) => r.chapter_id));
            for (const row of prog.rows) {
                if (row.module_id) {
                    completedByModule[row.module_id] = (completedByModule[row.module_id] || 0) + 1;
                }
            }
            // Best quiz score per module
            const quizScores = await query(
                `SELECT q.module_id, MAX(qs.score) AS best_score
                 FROM learning.cursus_quiz_submissions qs
                 JOIN learning.cursus_quizzes q ON q.id = qs.quiz_id
                 WHERE qs.student_id = $1 AND q.cursus_id = $2
                 GROUP BY q.module_id`,
                [userId, id]
            ).catch(() => ({ rows: [] as any[] }));
            for (const row of quizScores.rows) {
                if (row.module_id) quizScoreByModule[row.module_id] = Number(row.best_score || 0);
            }
        }

        const modules = modulesResult.rows.map((mod) => {
            const completed = completedByModule[mod.id] || 0;
            const total = mod.chapter_count || 1;
            const chapterPct = Math.round((completed / total) * 100);
            const quizScore = quizScoreByModule[mod.id] ?? -1; // -1 = not attempted
            // Mastery = 60% chapters read + 40% quiz score (if attempted)
            const mastery = quizScore >= 0
                ? Math.round(chapterPct * 0.6 + quizScore * 0.4)
                : Math.round(chapterPct * 0.6);
            return {
                ...mod,
                quiz: quizzesResult.rows.find((q) => q.module_id === mod.id) || null,
                completedChapters: completed,
                quizBestScore: quizScore,
                masteryScore: mastery,
            };
        });

        const finalQuiz = quizzesResult.rows.find((q) => q.is_final_evaluation) || null;

        res.json({
            success: true,
            cursus: cursusResult.rows[0],
            modules,
            finalQuiz,
            progress: { completed: completedChapters.size }
        });
    } catch (error: any) {
        logger.error('Get cursus detail error', { error: error.message });
        res.status(500).json({ success: false, error: 'Failed to fetch cursus detail' });
    }
};

/* ------------------------------------------------------------------ */
/*  GET MODULE CONTENT (chapters, quiz, exercise)                      */
/* ------------------------------------------------------------------ */
export const getModuleContent = async (req: Request, res: Response) => {
    try {
        const { id, moduleId } = req.params;
        const userId = (req as any).user?.userId;

        const modResult = await query(
            `SELECT m.id, m.title, m.description, m.module_order, m.estimated_minutes,
                    m.difficulty, m.chapter_count, c.title AS cursus_title
             FROM learning.cursus_modules m
             JOIN learning.cursus c ON c.id = m.cursus_id
             WHERE m.id = $1 AND m.cursus_id = $2`,
            [moduleId, id]
        );
        if ((modResult.rowCount ?? 0) === 0) {
            return res.status(404).json({ success: false, error: 'Module not found' });
        }

        const [chaptersResult, quizResult, exerciseResult] = await Promise.all([
            query(
                `SELECT id, title, content, key_points, chapter_order, estimated_minutes
                 FROM learning.cursus_chapters
                 WHERE module_id = $1
                 ORDER BY chapter_order ASC`,
                [moduleId]
            ),
            query(
                `SELECT q.id, q.title, q.pass_percentage, q.time_limit_minutes,
                        json_agg(json_build_object(
                            'id', qq.id, 'question', qq.question,
                            'options', qq.options, 'questionOrder', qq.question_order
                        ) ORDER BY qq.question_order) AS questions
                 FROM learning.cursus_quizzes q
                 LEFT JOIN learning.cursus_quiz_questions qq ON qq.quiz_id = q.id
                 WHERE q.module_id = $1 AND q.is_final_evaluation = false
                 GROUP BY q.id`,
                [moduleId]
            ),
            query(
                `SELECT id, title, type, description, instructions, hints, estimated_minutes
                 FROM learning.cursus_exercises
                 WHERE module_id = $1`,
                [moduleId]
            )
        ]);

        // Student progress for this module
        let completedChapterIds: string[] = [];
        if (userId) {
            const prog = await query(
                `SELECT chapter_id FROM learning.cursus_progress
                 WHERE student_id = $1 AND cursus_id = $2 AND module_id = $3
                   AND status = 'COMPLETED' AND chapter_id IS NOT NULL`,
                [userId, id, moduleId]
            );
            completedChapterIds = prog.rows.map((r) => r.chapter_id);
        }

        res.json({
            success: true,
            module: modResult.rows[0],
            chapters: chaptersResult.rows,
            quiz: quizResult.rows[0] || null,
            exercise: exerciseResult.rows[0] || null,
            completedChapterIds
        });
    } catch (error: any) {
        logger.error('Get module content error', { error: error.message });
        res.status(500).json({ success: false, error: 'Failed to fetch module content' });
    }
};

/* ------------------------------------------------------------------ */
/*  SAVE CHAPTER PROGRESS                                              */
/* ------------------------------------------------------------------ */
export const saveProgress = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.userId;
        const { id } = req.params;
        const { moduleId, chapterId } = req.body;

        if (!moduleId || !chapterId) {
            return res.status(400).json({ success: false, error: 'moduleId and chapterId are required' });
        }

        await query(
            `INSERT INTO learning.cursus_progress
             (student_id, cursus_id, module_id, chapter_id, status, completed_at)
             VALUES ($1, $2, $3, $4, 'COMPLETED', NOW())
             ON CONFLICT (student_id, cursus_id, module_id, chapter_id) DO NOTHING`,
            [userId, id, moduleId, chapterId]
        );

        res.json({ success: true, message: 'Progress saved' });
    } catch (error: any) {
        logger.error('Save cursus progress error', { error: error.message });
        res.status(500).json({ success: false, error: 'Failed to save progress' });
    }
};

/* ------------------------------------------------------------------ */
/*  SUBMIT CURSUS QUIZ                                                 */
/* ------------------------------------------------------------------ */
export const submitCursusQuiz = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.userId;
        const { id, quizId } = req.params;
        const { answers, timeTakenSeconds } = req.body;

        if (!answers || !Array.isArray(answers)) {
            return res.status(400).json({ success: false, error: 'answers array is required' });
        }

        // Load quiz with correct answers – also validate it belongs to the cursus
        const quizResult = await query(
            `SELECT q.id, q.title, q.pass_percentage, q.cursus_id,
                    qq.id AS question_id, qq.correct_option_index, qq.explanation, qq.question_order
             FROM learning.cursus_quizzes q
             JOIN learning.cursus_quiz_questions qq ON qq.quiz_id = q.id
             WHERE q.id = $1 AND q.cursus_id = $2
             ORDER BY qq.question_order ASC`,
            [quizId, id]
        );

        if ((quizResult.rowCount ?? 0) === 0) {
            return res.status(404).json({ success: false, error: 'Quiz not found for this cursus' });
        }

        const questions = quizResult.rows;
        const passPercentage = questions[0].pass_percentage;
        const cursusId = questions[0].cursus_id;

        let score = 0;
        const results = questions.map((q, i) => {
            const userAnswer = answers[i] ?? -1;
            const correct = userAnswer === q.correct_option_index;
            if (correct) score++;
            return {
                questionId: q.question_id,
                correct,
                correctAnswer: q.correct_option_index,
                userAnswer,
                explanation: q.explanation
            };
        });

        const maxScore = questions.length;
        const percentage = Math.round((score / maxScore) * 100);
        const passed = percentage >= passPercentage;

        // Get attempt number
        const attemptResult = await query(
            `SELECT COALESCE(MAX(attempt_number), 0) + 1 AS attempt
             FROM learning.cursus_quiz_results
             WHERE student_id = $1 AND quiz_id = $2`,
            [userId, quizId]
        );
        const attemptNumber = attemptResult.rows[0]?.attempt || 1;

        await query(
            `INSERT INTO learning.cursus_quiz_results
             (student_id, quiz_id, score, max_score, percentage, passed, answers, time_taken_seconds, attempt_number)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [userId, quizId, score, maxScore, percentage, passed,
                JSON.stringify(results), timeTakenSeconds || null, attemptNumber]
        );

        // Auto-trigger quiz badges (fire & forget – errors are logged internally)
        let awardedBadges: string[] = [];
        if (passed) {
            awardedBadges = await awardQuizBadges(userId, quizId, passed, percentage);
        }

        res.json({
            success: true,
            score, maxScore, percentage, passed,
            passPercentage,
            attemptNumber,
            results,
            awardedBadges
        });
    } catch (error: any) {
        logger.error('Submit cursus quiz error', { error: error.message });
        res.status(500).json({ success: false, error: 'Failed to submit quiz' });
    }
};

/**
 * POST /api/cursus/:id/exercise/:exerciseId/submit
 * Auto-corrects a free-text exercise answer using keyword matching.
 */
export const submitExerciseAnswer = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.userId;
        if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

        const { id: cursusId, exerciseId } = req.params;
        const { answerText } = req.body;

        if (!answerText || typeof answerText !== 'string' || !answerText.trim()) {
            return res.status(400).json({ success: false, error: 'answerText is required' });
        }

        // Load exercise with keywords
        const exResult = await query(
            `SELECT e.id, e.title, e.expected_keywords
             FROM learning.cursus_exercises e
             JOIN learning.cursus_modules m ON m.id = e.module_id
             WHERE e.id = $1 AND m.cursus_id = $2 AND e.is_active = true`,
            [exerciseId, cursusId]
        );

        if ((exResult.rowCount ?? 0) === 0) {
            return res.status(404).json({ success: false, error: 'Exercise not found' });
        }

        const exercise = exResult.rows[0];
        const expectedKeywords: string[] = Array.isArray(exercise.expected_keywords)
            ? exercise.expected_keywords
            : [];

        const lower = answerText.toLowerCase();
        const matchedKeywords: string[] = [];
        const missingKeywords: string[] = [];

        for (const kw of expectedKeywords) {
            if (lower.includes(kw.toLowerCase())) {
                matchedKeywords.push(kw);
            } else {
                missingKeywords.push(kw);
            }
        }

        const score = expectedKeywords.length > 0
            ? Math.round((matchedKeywords.length / expectedKeywords.length) * 100)
            : 50; // No keywords defined → give partial credit

        await query(
            `INSERT INTO learning.cursus_exercise_attempts
                (student_id, exercise_id, answer_text, score, matched_keywords, missing_keywords)
             VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb)`,
            [userId, exerciseId, answerText.trim(), score,
                JSON.stringify(matchedKeywords), JSON.stringify(missingKeywords)]
        );

        // Count total attempts for this exercise
        const countResult = await query(
            `SELECT COUNT(*)::INTEGER AS attempt_count,
                    MIN(created_at) AS first_attempt_at
             FROM learning.cursus_exercise_attempts
             WHERE student_id = $1 AND exercise_id = $2`,
            [userId, exerciseId]
        );
        const attemptCount = countResult.rows[0]?.attempt_count || 1;
        const firstAttemptAt: Date | null = countResult.rows[0]?.first_attempt_at || null;
        const minutesElapsed = firstAttemptAt
            ? Math.floor((Date.now() - new Date(firstAttemptAt).getTime()) / 60000)
            : 0;
        const solutionEligible = attemptCount >= 2 || minutesElapsed >= 30;

        let feedback = '';
        if (score >= 80) {
            feedback = 'Excellente réponse ! Vous avez bien identifié les concepts clés.';
        } else if (score >= 50) {
            feedback = `Bonne base. Il manque encore ${missingKeywords.slice(0, 3).join(', ')}.`;
        } else {
            feedback = `Réponse incomplète. Pensez à couvrir : ${missingKeywords.slice(0, 4).join(', ')}.`;
        }

        return res.json({
            success: true,
            score,
            feedback,
            matchedConcepts: matchedKeywords,
            missingConcepts: missingKeywords,
            attemptCount,
            solutionEligible,
        });
    } catch (error: any) {
        logger.error('Submit exercise answer error', { error: error.message });
        res.status(500).json({ success: false, error: 'Failed to submit exercise answer' });
    }
};

/**
 * GET /api/cursus/:id/exercise/:exerciseId/solution
 * Returns sample solution if student has >= 2 attempts or >= 30 min elapsed.
 */
export const getExerciseSolution = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.userId;
        if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

        const { id: cursusId, exerciseId } = req.params;

        const exResult = await query(
            `SELECT e.id, e.title, e.sample_solution
             FROM learning.cursus_exercises e
             JOIN learning.cursus_modules m ON m.id = e.module_id
             WHERE e.id = $1 AND m.cursus_id = $2 AND e.is_active = true`,
            [exerciseId, cursusId]
        );

        if ((exResult.rowCount ?? 0) === 0) {
            return res.status(404).json({ success: false, error: 'Exercise not found' });
        }

        const attemptsResult = await query(
            `SELECT COUNT(*)::INTEGER AS attempt_count,
                    MIN(created_at) AS first_attempt_at
             FROM learning.cursus_exercise_attempts
             WHERE student_id = $1 AND exercise_id = $2`,
            [userId, exerciseId]
        );

        const attemptCount = attemptsResult.rows[0]?.attempt_count || 0;
        const firstAttemptAt: Date | null = attemptsResult.rows[0]?.first_attempt_at || null;
        const minutesElapsed = firstAttemptAt
            ? Math.floor((Date.now() - new Date(firstAttemptAt).getTime()) / 60000)
            : 0;

        if (attemptCount < 2 && minutesElapsed < 30) {
            return res.status(403).json({
                success: false,
                error: 'Solution not yet available. Complete at least 2 attempts or wait 30 minutes.',
                attemptCount,
                minutesElapsed,
            });
        }

        const exercise = exResult.rows[0];
        return res.json({
            success: true,
            solution: exercise.sample_solution || 'Aucun corrigé disponible pour cet exercice.',
            attemptCount,
        });
    } catch (error: any) {
        logger.error('Get exercise solution error', { error: error.message });
        res.status(500).json({ success: false, error: 'Failed to fetch exercise solution' });
    }
};
