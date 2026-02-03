/**
 * Progress Controller - PMP
 * Student progress tracking and quiz management
 */
import { Request, Response } from 'express';
import { query } from '../config/database';
import { logger } from '../utils/logger';

// Default workshop definitions (fallback if DB catalog is unavailable)
const DEFAULT_WORKSHOPS = {
    'intro': { title: 'Introduction aux Paiements', sections: 5, quizId: 'quiz-intro' },
    'iso8583': { title: 'ISO 8583 - Messages', sections: 8, quizId: 'quiz-iso8583' },
    'hsm-keys': { title: 'HSM et Gestion des Clés', sections: 6, quizId: 'quiz-hsm' },
    '3ds-flow': { title: 'Flux 3D Secure', sections: 7, quizId: 'quiz-3ds' },
    'fraud-detection': { title: 'Détection de Fraude', sections: 5, quizId: 'quiz-fraud' },
    'emv': { title: 'Cartes EMV', sections: 6, quizId: 'quiz-emv' }
};

// Badge definitions
const BADGES = {
    'FIRST_LOGIN': { name: 'Bienvenue !', description: 'Première connexion', icon: 'star', xp: 10 },
    'FIRST_QUIZ': { name: 'Premier Quiz', description: 'Passer son premier quiz', icon: 'clipboard-check', xp: 20 },
    'QUIZ_MASTER': { name: 'Quiz Master', description: '5 quiz réussis', icon: 'award', xp: 50 },
    'PERFECT_SCORE': { name: 'Score Parfait', description: '100% à un quiz', icon: 'trophy', xp: 100 },
    'WORKSHOP_COMPLETE': { name: 'Atelier Terminé', description: 'Terminer un atelier', icon: 'book-open', xp: 30 },
    'ALL_WORKSHOPS': { name: 'Expert Monétique', description: 'Tous les ateliers terminés', icon: 'graduation-cap', xp: 200 },
    'FAST_LEARNER': { name: 'Apprenti Rapide', description: 'Quiz en moins de 5 minutes', icon: 'zap', xp: 25 },
    'STREAK_7': { name: 'Semaine Complète', description: '7 jours consécutifs', icon: 'flame', xp: 50 }
};

type WorkshopCatalogEntry = {
    id: string;
    title: string;
    sections: number;
    quizId: string | null;
};

const defaultWorkshopCatalog: WorkshopCatalogEntry[] = Object.entries(DEFAULT_WORKSHOPS).map(
    ([id, workshop]) => ({
        id,
        title: workshop.title,
        sections: workshop.sections,
        quizId: workshop.quizId || null
    })
);

const defaultWorkshopMap = new Map(defaultWorkshopCatalog.map((w) => [w.id, w]));

async function getActiveWorkshops(): Promise<WorkshopCatalogEntry[]> {
    try {
        const result = await query(
            `SELECT id, title, sections, quiz_id
             FROM learning.workshops
             WHERE is_active = true
             ORDER BY module_order ASC, id ASC`
        );

        if ((result.rowCount ?? 0) > 0) {
            return result.rows.map((row) => ({
                id: row.id,
                title: row.title,
                sections: Math.max(parseInt(row.sections, 10) || 1, 1),
                quizId: row.quiz_id || null
            }));
        }
    } catch (error: any) {
        logger.warn('Learning workshop catalog unavailable, falling back to defaults', { error: error.message });
    }

    return defaultWorkshopCatalog;
}

async function getWorkshopById(workshopId: string): Promise<WorkshopCatalogEntry | null> {
    try {
        const result = await query(
            `SELECT id, title, sections, quiz_id
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
                sections: Math.max(parseInt(row.sections, 10) || 1, 1),
                quizId: row.quiz_id || null
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
                 FROM learning.student_progress WHERE student_id = $1`,
                [userId]
            )
        ]);

        // Build progress map with all workshops
        const progressRowsByWorkshopId = new Map(
            result.rows.map((row) => [row.workshop_id, row])
        );
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
export const getWorkshopsCatalog = async (req: Request, res: Response) => {
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

        // Add rank
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

        // Validate workshop
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

        // Calculate progress percentage
        const progressPercent = Math.min(
            Math.round((normalizedCurrentSection / workshop.sections) * 100),
            100
        );
        const status = progressPercent >= 100 ? 'COMPLETED' : 'IN_PROGRESS';

        // Upsert progress
        const result = await query(
            `INSERT INTO learning.student_progress
             (student_id, workshop_id, status, progress_percent, current_section, total_sections,
              started_at, time_spent_minutes, last_accessed_at)
             VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7, NOW())
             ON CONFLICT (student_id, workshop_id) DO UPDATE SET
                status = $3,
                progress_percent = $4,
                current_section = $5,
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

        // Validate workshop
        const workshop = await getWorkshopById(workshopId);
        if (!workshop) {
            return res.status(400).json({ success: false, error: 'Invalid workshop ID' });
        }

        // Update progress to completed
        await query(
            `INSERT INTO learning.student_progress
             (student_id, workshop_id, status, progress_percent, current_section, total_sections, completed_at)
             VALUES ($1, $2, 'COMPLETED', 100, $3, $3, NOW())
             ON CONFLICT (student_id, workshop_id) DO UPDATE SET
                status = 'COMPLETED',
                progress_percent = 100,
                current_section = $3,
                completed_at = NOW(),
                updated_at = NOW()`,
            [userId, workshopId, workshop.sections]
        );

        // Award badge
        await awardBadge(userId, 'WORKSHOP_COMPLETE');

        // Check if all workshops completed
        const completedCount = await query(
            `SELECT COUNT(*) FROM learning.student_progress
             WHERE student_id = $1 AND status = 'COMPLETED'`,
            [userId]
        );

        const workshops = await getActiveWorkshops();
        if (parseInt(completedCount.rows[0].count, 10) >= workshops.length) {
            await awardBadge(userId, 'ALL_WORKSHOPS');
        }

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
 * Submit quiz answers
 */
export const submitQuiz = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.userId;
        const { quizId } = req.params;
        const { answers, timeTakenSeconds, workshopId } = req.body;

        if (!answers || !Array.isArray(answers)) {
            return res.status(400).json({ success: false, error: 'Answers are required' });
        }

        if (workshopId) {
            const workshop = await getWorkshopById(workshopId);
            if (!workshop) {
                return res.status(400).json({ success: false, error: 'Invalid workshop ID' });
            }
        }

        const normalizedTimeTakenSeconds = timeTakenSeconds === undefined || timeTakenSeconds === null
            ? null
            : Number(timeTakenSeconds);
        if (normalizedTimeTakenSeconds !== null && (!Number.isFinite(normalizedTimeTakenSeconds) || normalizedTimeTakenSeconds < 0)) {
            return res.status(400).json({ success: false, error: 'timeTakenSeconds must be a non-negative number' });
        }
        const timeTakenSecondsValue = normalizedTimeTakenSeconds === null ? null : Math.floor(normalizedTimeTakenSeconds);

        // Calculate score (in a real app, verify answers against correct answers from DB)
        // For demo, we'll use a mock scoring system
        const correctAnswers = answers.filter((a: any) => a.correct).length;
        const maxScore = answers.length;
        const percentage = Math.round((correctAnswers / maxScore) * 100);
        const passed = percentage >= 80; // 80% minimum to pass

        // Get attempt number
        const attemptResult = await query(
            `SELECT COALESCE(MAX(attempt_number), 0) + 1 as attempt
             FROM learning.quiz_results WHERE student_id = $1 AND quiz_id = $2`,
            [userId, quizId]
        );
        const attemptNumber = attemptResult.rows[0].attempt;

        // Save result
        const result = await query(
            `INSERT INTO learning.quiz_results
             (student_id, quiz_id, workshop_id, score, max_score, percentage, passed, answers, time_taken_seconds, attempt_number)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
             RETURNING id, quiz_id, score, max_score, percentage, passed, submitted_at`,
            [userId, quizId, workshopId, correctAnswers, maxScore, percentage, passed, JSON.stringify(answers), timeTakenSecondsValue, attemptNumber]
        );

        // Award badges
        const isFirstQuiz = attemptNumber === 1;
        if (isFirstQuiz) {
            await awardBadge(userId, 'FIRST_QUIZ');
        }

        if (percentage === 100) {
            await awardBadge(userId, 'PERFECT_SCORE');
        }

        if (timeTakenSecondsValue && timeTakenSecondsValue < 300) {
            await awardBadge(userId, 'FAST_LEARNER');
        }

        // Check for Quiz Master badge (5 quizzes passed)
        const passedQuizzes = await query(
            `SELECT COUNT(DISTINCT quiz_id) as count
             FROM learning.quiz_results WHERE student_id = $1 AND passed = true`,
            [userId]
        );
        if (parseInt(passedQuizzes.rows[0].count) >= 5) {
            await awardBadge(userId, 'QUIZ_MASTER');
        }

        res.json({
            success: true,
            result: result.rows[0],
            passed,
            message: passed ? 'Félicitations ! Quiz réussi !' : 'Quiz échoué. Score minimum: 80%'
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

        if (result.rowCount === 0) {
            return res.status(404).json({ success: false, error: 'No quiz results found' });
        }

        res.json({
            success: true,
            results: result.rows,
            bestScore: Math.max(...result.rows.map(r => r.percentage)),
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
             FROM learning.badges WHERE student_id = $1
             ORDER BY earned_at DESC`,
            [userId]
        );

        // Build badges list with earned status
        const earnedBadges = new Set(result.rows.map(b => b.badge_type));
        const allBadges = Object.entries(BADGES).map(([type, badge]) => ({
            type,
            name: badge.name,
            description: badge.description,
            icon: badge.icon,
            xp: badge.xp,
            earned: earnedBadges.has(type),
            earnedAt: result.rows.find(b => b.badge_type === type)?.earned_at
        }));

        res.json({
            success: true,
            badges: allBadges,
            earned: result.rows.length,
            total: Object.keys(BADGES).length,
            totalXP: result.rows.reduce((sum, b) => sum + (b.xp_awarded || 0), 0)
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

        // Get all data
        const [workshops, progressResult, quizResult, badgesResult] = await Promise.all([
            getActiveWorkshops(),
            query(
                `SELECT status, COUNT(*) as count, SUM(time_spent_minutes) as time
                 FROM learning.student_progress WHERE student_id = $1
                 GROUP BY status`,
                [userId]
            ),
            query(
                `SELECT
                    COUNT(*) as total_quizzes,
                    COUNT(CASE WHEN passed THEN 1 END) as quizzes_passed,
                    AVG(percentage) as avg_score,
                    MAX(percentage) as best_score
                 FROM learning.quiz_results WHERE student_id = $1`,
                [userId]
            ),
            query(
                `SELECT SUM(xp_awarded) as total_xp, COUNT(*) as badge_count
                 FROM learning.badges WHERE student_id = $1`,
                [userId]
            )
        ]);

        // Calculate workshop stats
        const workshopStats = {
            notStarted: 0,
            inProgress: 0,
            completed: 0,
            totalTime: 0
        };
        progressResult.rows.forEach(row => {
            workshopStats.totalTime += parseInt(row.time) || 0;
            switch (row.status) {
                case 'NOT_STARTED': workshopStats.notStarted = parseInt(row.count); break;
                case 'IN_PROGRESS': workshopStats.inProgress = parseInt(row.count); break;
                case 'COMPLETED': workshopStats.completed = parseInt(row.count); break;
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
                    total: parseInt(quizResult.rows[0]?.total_quizzes) || 0,
                    passed: parseInt(quizResult.rows[0]?.quizzes_passed) || 0,
                    avgScore: Math.round(quizResult.rows[0]?.avg_score) || 0,
                    bestScore: parseInt(quizResult.rows[0]?.best_score) || 0
                },
                badges: {
                    earned: parseInt(badgesResult.rows[0]?.badge_count) || 0,
                    total: Object.keys(BADGES).length
                },
                totalXP: parseInt(badgesResult.rows[0]?.total_xp) || 0
            }
        });
    } catch (error: any) {
        logger.error('Get my stats error', { error: error.message });
        res.status(500).json({ success: false, error: 'Failed to fetch statistics' });
    }
};

/**
 * Get student progress (Formateur)
 */
export const getStudentProgress = async (req: Request, res: Response) => {
    try {
        const { studentId } = req.params;

        // Import the function from users controller
        const usersController = require('./users.controller');
        req.params.id = studentId;
        return usersController.getStudentProgress(req, res);
    } catch (error: any) {
        logger.error('Get student progress error', { error: error.message });
        res.status(500).json({ success: false, error: 'Failed to fetch student progress' });
    }
};

/**
 * Get cohort analytics (Formateur)
 */
export const getCohortAnalytics = async (req: Request, res: Response) => {
    try {
        // Get overall stats
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

        // Recent activity
        const recentActivity = await query(
            `SELECT
                u.username, u.first_name, u.last_name,
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
                totalStudents: parseInt(studentsCount.rows[0].count),
                workshopProgress: progressStats.rows.map(row => ({
                    workshopId: row.workshop_id,
                    title: workshopTitleById.get(row.workshop_id)
                        || DEFAULT_WORKSHOPS[row.workshop_id as keyof typeof DEFAULT_WORKSHOPS]?.title
                        || row.workshop_id,
                    studentsStarted: parseInt(row.students_started),
                    studentsCompleted: parseInt(row.students_completed),
                    avgProgress: Math.round(row.avg_progress) || 0,
                    avgTimeMinutes: Math.round(row.avg_time) || 0
                })),
                quizPerformance: quizStats.rows.map(row => ({
                    quizId: row.quiz_id,
                    attempts: parseInt(row.attempts),
                    uniqueStudents: parseInt(row.unique_students),
                    avgScore: Math.round(row.avg_score) || 0,
                    passRate: row.attempts > 0 ? Math.round((parseInt(row.passes) / parseInt(row.attempts)) * 100) : 0
                })),
                badgeDistribution: badgeStats.rows.map(row => ({
                    badgeType: row.badge_type,
                    name: BADGES[row.badge_type as keyof typeof BADGES]?.name || row.badge_type,
                    studentsEarned: parseInt(row.students_earned)
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
 * Helper: Award badge to student
 */
async function awardBadge(studentId: string, badgeType: keyof typeof BADGES): Promise<boolean> {
    try {
        const badge = BADGES[badgeType];
        if (!badge) return false;

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
