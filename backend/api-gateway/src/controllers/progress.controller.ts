/**
 * Progress Controller - PMP
 * Student progress tracking and quiz management
 */
import { Request, Response } from 'express';
import { query } from '../config/database';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

// Workshop definitions for validation
const WORKSHOPS = {
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

/**
 * Get my progress (all workshops)
 */
export const getMyProgress = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.userId;

        const result = await query(
            `SELECT workshop_id, status, progress_percent, current_section, total_sections,
                    started_at, completed_at, time_spent_minutes, last_accessed_at
             FROM learning.student_progress WHERE student_id = $1`,
            [userId]
        );

        // Build progress map with all workshops
        const progressMap: Record<string, any> = {};
        for (const [workshopId, workshop] of Object.entries(WORKSHOPS)) {
            const dbProgress = result.rows.find(r => r.workshop_id === workshopId);
            progressMap[workshopId] = dbProgress || {
                workshop_id: workshopId,
                status: 'NOT_STARTED',
                progress_percent: 0,
                current_section: 0,
                total_sections: workshop.sections,
                time_spent_minutes: 0
            };
            progressMap[workshopId].title = workshop.title;
        }

        res.json({
            success: true,
            progress: progressMap,
            workshopsCompleted: result.rows.filter(r => r.status === 'COMPLETED').length,
            totalWorkshops: Object.keys(WORKSHOPS).length
        });
    } catch (error: any) {
        logger.error('Get my progress error', { error: error.message });
        res.status(500).json({ success: false, error: 'Failed to fetch progress' });
    }
};

/**
 * Get leaderboard
 */
export const getLeaderboard = async (req: Request, res: Response) => {
    try {
        const limit = parseInt(req.query.limit as string) || 10;

        const result = await query(
            `SELECT
                u.id, u.username, u.first_name, u.last_name,
                COALESCE(SUM(b.xp_awarded), 0)::integer as total_xp,
                COUNT(DISTINCT b.id)::integer as badge_count,
                COUNT(DISTINCT CASE WHEN sp.status = 'COMPLETED' THEN sp.workshop_id END)::integer as workshops_completed
             FROM users.users u
             LEFT JOIN learning.badges b ON u.id = b.student_id
             LEFT JOIN learning.student_progress sp ON u.id = sp.student_id
             WHERE u.role = 'ROLE_ETUDIANT'
             GROUP BY u.id, u.username, u.first_name, u.last_name
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
        const workshop = WORKSHOPS[workshopId as keyof typeof WORKSHOPS];
        if (!workshop) {
            return res.status(400).json({ success: false, error: 'Invalid workshop ID' });
        }

        // Calculate progress percentage
        const progressPercent = Math.min(
            Math.round((currentSection / workshop.sections) * 100),
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
            [userId, workshopId, status, progressPercent, currentSection, workshop.sections, timeSpentMinutes || 0]
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
        const workshop = WORKSHOPS[workshopId as keyof typeof WORKSHOPS];
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

        if (parseInt(completedCount.rows[0].count) >= Object.keys(WORKSHOPS).length) {
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
            [userId, quizId, workshopId, correctAnswers, maxScore, percentage, passed, JSON.stringify(answers), timeTakenSeconds, attemptNumber]
        );

        // Award badges
        const isFirstQuiz = attemptNumber === 1;
        if (isFirstQuiz) {
            await awardBadge(userId, 'FIRST_QUIZ');
        }

        if (percentage === 100) {
            await awardBadge(userId, 'PERFECT_SCORE');
        }

        if (timeTakenSeconds && timeTakenSeconds < 300) {
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
        const [progressResult, quizResult, badgesResult] = await Promise.all([
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
                    total: Object.keys(WORKSHOPS).length
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
        const [studentsCount, progressStats, quizStats, badgeStats] = await Promise.all([
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
                    title: WORKSHOPS[row.workshop_id as keyof typeof WORKSHOPS]?.title || row.workshop_id,
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
