/**
 * Cursus Routes – PMP
 * Learning path browsing, content, progress tracking and quiz submission.
 */
import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { RequireAnyRole, RequireRole, UserRole } from '../middleware/roles';
import * as cursusController from '../controllers/cursus.controller';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

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
 * POST /api/cursus/:id/progress
 * Save chapter progress (Student only)
 */
router.post('/:id/progress', RequireRole(UserRole.ETUDIANT), cursusController.saveProgress);

/**
 * POST /api/cursus/:id/quiz/:quizId
 * Submit cursus quiz answers (Student only)
 */
router.post('/:id/quiz/:quizId', RequireRole(UserRole.ETUDIANT), cursusController.submitCursusQuiz);

export default router;
