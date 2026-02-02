/**
 * Users Routes - PMP
 * CRUD operations for user management (Formateur only)
 */
import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { RequireRole, UserRole, RequirePermission, Permission } from '../middleware/roles';
import * as usersController from '../controllers/users.controller';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

/**
 * GET /api/users
 * List all users (Formateur only)
 */
router.get('/', RequireRole(UserRole.FORMATEUR), usersController.getAllUsers);

/**
 * GET /api/users/students
 * List all students (Formateur only)
 */
router.get('/students', RequireRole(UserRole.FORMATEUR), usersController.getStudents);

/**
 * GET /api/users/:id
 * Get user by ID (Formateur only)
 */
router.get('/:id', RequireRole(UserRole.FORMATEUR), usersController.getUserById);

/**
 * POST /api/users
 * Create new user (Formateur only)
 */
router.post('/', RequireRole(UserRole.FORMATEUR), usersController.createUser);

/**
 * PATCH /api/users/:id
 * Update user (Formateur only)
 */
router.patch('/:id', RequireRole(UserRole.FORMATEUR), usersController.updateUser);

/**
 * DELETE /api/users/:id
 * Delete user (Formateur only)
 */
router.delete('/:id', RequireRole(UserRole.FORMATEUR), usersController.deleteUser);

/**
 * PATCH /api/users/:id/status
 * Activate/deactivate user (Formateur only)
 */
router.patch('/:id/status', RequireRole(UserRole.FORMATEUR), usersController.updateUserStatus);

/**
 * GET /api/users/:id/progress
 * Get student progress (Formateur only)
 */
router.get('/:id/progress', RequireRole(UserRole.FORMATEUR), usersController.getStudentProgress);

export default router;
