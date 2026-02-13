/**
 * Progress Routes - PMP
 * Student progress tracking and quiz management
 */
import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { RequireAnyRole, RequireRole, UserRole } from '../middleware/roles';
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
 * GET /api/progress/workshops
 * Get workshops catalog (all authenticated users)
 */
router.get('/workshops', progressController.getWorkshopsCatalog);

/**
 * GET /api/progress/workshops/:workshopId/content
 * Get workshop theory/content payload
 */
router.get(
    '/workshops/:workshopId/content',
    RequireAnyRole(UserRole.ETUDIANT, UserRole.FORMATEUR),
    progressController.getWorkshopContent
);

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
 * GET /api/progress/quiz/:quizId
 * Get quiz definition (without correct answers)
 */
router.get(
    '/quiz/:quizId',
    RequireAnyRole(UserRole.ETUDIANT, UserRole.FORMATEUR),
    progressController.getQuizDefinition
);

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
 * GET /api/progress/lab/conditions
 * Get active lab conditions (students + trainers)
 */
router.get(
    '/lab/conditions',
    RequireAnyRole(UserRole.ETUDIANT, UserRole.FORMATEUR),
    progressController.getLabConditions
);

/**
 * PUT /api/progress/lab/conditions
 * Update lab conditions (trainer only)
 */
router.put('/lab/conditions', RequireRole(UserRole.FORMATEUR), progressController.updateLabConditions);

/**
 * POST /api/progress/lab/conditions/reset
 * Reset lab conditions to defaults (trainer only)
 */
router.post('/lab/conditions/reset', RequireRole(UserRole.FORMATEUR), progressController.resetLabConditions);

/**
 * GET /api/progress/certificate/me
 * Get current student certificate (auto-issue when eligible)
 */
router.get('/certificate/me', RequireRole(UserRole.ETUDIANT), progressController.getMyCertificate);

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
