/**
 * Cursus Routes – PMP
 * Learning path browsing, content, progress tracking and quiz submission.
 */
import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { RequireAnyRole, RequireRole, UserRole } from '../middleware/roles';
import * as cursusController from '../controllers/cursus.controller';
import * as cursusUaController from '../controllers/cursusUa.controller';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

/**
 * POST /api/cursus/units/:unitId/sessions/:sessionId/extend
 * Extend UA lab session (Student only)
 */
router.post(
    '/units/:unitId/sessions/:sessionId/extend',
    RequireRole(UserRole.ETUDIANT),
    cursusUaController.extendUnitSession
);

/**
 * POST /api/cursus/units/:unitId/sessions/:sessionId/reset
 * Reset UA lab session (Student only)
 */
router.post(
    '/units/:unitId/sessions/:sessionId/reset',
    RequireRole(UserRole.ETUDIANT),
    cursusUaController.resetUnitSession
);

/**
 * DELETE /api/cursus/units/:unitId/sessions/:sessionId
 * Terminate UA lab session (Student only)
 */
router.delete(
    '/units/:unitId/sessions/:sessionId',
    RequireRole(UserRole.ETUDIANT),
    cursusUaController.terminateUnitSession
);

/**
 * GET /api/cursus
 * List all published cursus (Student + Formateur)
 */
router.get('/', RequireAnyRole(UserRole.ETUDIANT, UserRole.FORMATEUR), cursusController.listCursus);

/**
 * GET /api/cursus/:id
 * Get cursus detail with modules (Student + Formateur)
 */
router.get('/:id', RequireAnyRole(UserRole.ETUDIANT, UserRole.FORMATEUR), cursusController.getCursusDetail);

/**
 * GET /api/cursus/:id/module/:moduleId
 * Get module chapters, quiz, exercise (Student + Formateur)
 */
router.get('/:id/module/:moduleId', RequireAnyRole(UserRole.ETUDIANT, UserRole.FORMATEUR), cursusController.getModuleContent);

/**
 * GET /api/cursus/:cursusId/module/:moduleId/units/:unitId
 * Get UA detail with task progress and lab session state (Student + Formateur)
 */
router.get(
    '/:cursusId/module/:moduleId/units/:unitId',
    RequireAnyRole(UserRole.ETUDIANT, UserRole.FORMATEUR),
    cursusUaController.getUnitDetail
);

/**
 * POST /api/cursus/:cursusId/module/:moduleId/units/:unitId/start
 * Initialize UA progression and start lab if configured (Student only)
 */
router.post(
    '/:cursusId/module/:moduleId/units/:unitId/start',
    RequireRole(UserRole.ETUDIANT),
    cursusUaController.startUnit
);

/**
 * POST /api/cursus/:cursusId/module/:moduleId/units/:unitId/tasks/:taskId/submit
 * Submit UA task answer (Student only)
 */
router.post(
    '/:cursusId/module/:moduleId/units/:unitId/tasks/:taskId/submit',
    RequireRole(UserRole.ETUDIANT),
    cursusUaController.submitTask
);

/**
 * GET /api/cursus/:cursusId/module/:moduleId/units/:unitId/session
 * Get active UA lab session (Student + Formateur)
 */
router.get(
    '/:cursusId/module/:moduleId/units/:unitId/session',
    RequireAnyRole(UserRole.ETUDIANT, UserRole.FORMATEUR),
    cursusUaController.getUnitSession
);

/**
 * POST /api/cursus/:id/progress
 * Save chapter progress (Student only)
 */
router.post('/:id/progress', RequireRole(UserRole.ETUDIANT), cursusController.saveProgress);

/**
 * POST /api/cursus/:id/quiz/:quizId
 * Submit cursus quiz answers (Student only)
 */
router.post('/:id/quiz/:quizId', RequireRole(UserRole.ETUDIANT), cursusController.submitCursusQuiz);

/**
 * POST /api/cursus/:id/exercise/:exerciseId/submit
 * Auto-corrected free-text answer submission (keyword matching)
 */
router.post('/:id/exercise/:exerciseId/submit', RequireRole(UserRole.ETUDIANT), cursusController.submitExerciseAnswer as any);

/**
 * GET /api/cursus/:id/exercise/:exerciseId/solution
 * Unlock sample solution after 2+ attempts or 30+ minutes
 */
router.get('/:id/exercise/:exerciseId/solution', RequireRole(UserRole.ETUDIANT), cursusController.getExerciseSolution as any);

export default router;
