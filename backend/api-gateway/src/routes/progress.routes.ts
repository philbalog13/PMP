/**
 * Progress Routes - PMP
 * Student progress tracking and quiz management
 */
import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { RequireRole, UserRole } from '../middleware/roles';
import * as progressController from '../controllers/progress.controller';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

/**
 * GET /api/progress
 * Get my progress (Student only)
 */
router.get('/', RequireRole(UserRole.ETUDIANT), progressController.getMyProgress);

/**
 * GET /api/progress/leaderboard
 * Get leaderboard (all authenticated users)
 */
router.get('/leaderboard', progressController.getLeaderboard);

/**
 * POST /api/progress/workshop/:workshopId
 * Save workshop progress (Student only)
 */
router.post('/workshop/:workshopId', RequireRole(UserRole.ETUDIANT), progressController.saveWorkshopProgress);

/**
 * POST /api/progress/workshop/:workshopId/complete
 * Mark workshop as completed (Student only)
 */
router.post('/workshop/:workshopId/complete', RequireRole(UserRole.ETUDIANT), progressController.completeWorkshop);

/**
 * POST /api/progress/quiz/:quizId
 * Submit quiz answers (Student only)
 */
router.post('/quiz/:quizId', RequireRole(UserRole.ETUDIANT), progressController.submitQuiz);

/**
 * GET /api/progress/quiz/:quizId/results
 * Get quiz results (Student only)
 */
router.get('/quiz/:quizId/results', RequireRole(UserRole.ETUDIANT), progressController.getQuizResults);

/**
 * GET /api/progress/badges
 * Get my badges (Student only)
 */
router.get('/badges', RequireRole(UserRole.ETUDIANT), progressController.getMyBadges);

/**
 * GET /api/progress/stats
 * Get my statistics (Student only)
 */
router.get('/stats', RequireRole(UserRole.ETUDIANT), progressController.getMyStats);

/**
 * GET /api/progress/student/:studentId
 * Get student progress (Formateur only)
 */
router.get('/student/:studentId', RequireRole(UserRole.FORMATEUR), progressController.getStudentProgress);

/**
 * GET /api/progress/cohort
 * Get cohort analytics (Formateur only)
 */
router.get('/cohort', RequireRole(UserRole.FORMATEUR), progressController.getCohortAnalytics);

export default router;
