/**
 * Exercises Routes - PMP
 * Exercise management for trainers
 */
import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { RequireRole, UserRole } from '../middleware/roles';
import * as exercisesController from '../controllers/exercises.controller';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

/**
 * GET /api/exercises
 * List all exercises (Different behavior based on role)
 * - Formateur: See all exercises they created
 * - Etudiant: See assigned exercises
 */
router.get('/', exercisesController.getExercises);

/**
 * GET /api/exercises/:id
 * Get exercise by ID
 */
router.get('/:id', exercisesController.getExerciseById);

/**
 * POST /api/exercises
 * Create new exercise (Formateur only)
 */
router.post('/', RequireRole(UserRole.FORMATEUR), exercisesController.createExercise);

/**
 * PATCH /api/exercises/:id
 * Update exercise (Formateur only)
 */
router.patch('/:id', RequireRole(UserRole.FORMATEUR), exercisesController.updateExercise);

/**
 * DELETE /api/exercises/:id
 * Delete exercise (Formateur only)
 */
router.delete('/:id', RequireRole(UserRole.FORMATEUR), exercisesController.deleteExercise);

/**
 * POST /api/exercises/:id/assign
 * Assign exercise to students (Formateur only)
 */
router.post('/:id/assign', RequireRole(UserRole.FORMATEUR), exercisesController.assignExercise);

/**
 * POST /api/exercises/:id/submit
 * Submit exercise (Student only)
 */
router.post('/:id/submit', RequireRole(UserRole.ETUDIANT), exercisesController.submitExercise);

/**
 * POST /api/exercises/:id/grade
 * Grade exercise submission (Formateur only)
 */
router.post('/:id/grade', RequireRole(UserRole.FORMATEUR), exercisesController.gradeExercise);

/**
 * GET /api/exercises/:id/submissions
 * Get exercise submissions (Formateur only)
 */
router.get('/:id/submissions', RequireRole(UserRole.FORMATEUR), exercisesController.getSubmissions);

export default router;
