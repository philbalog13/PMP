/**
 * Platform Routes - PMP
 * Platform-wide transaction access for educational roles (ETUDIANT, FORMATEUR)
 */
import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { RequireAnyRole, UserRole } from '../middleware/roles';
import * as platformController from '../controllers/platform.controller';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Allow ETUDIANT and FORMATEUR roles
router.use(RequireAnyRole(UserRole.ETUDIANT, UserRole.FORMATEUR));

/**
 * GET /api/platform/transactions
 * List all platform transactions (paginated, filterable)
 */
router.get('/transactions', platformController.getAllTransactions);

/**
 * GET /api/platform/transactions/:id
 * Get transaction details
 */
router.get('/transactions/:id', platformController.getTransactionById);

/**
 * GET /api/platform/transactions/:id/timeline
 * Get transaction timeline
 */
router.get('/transactions/:id/timeline', platformController.getTransactionTimeline);

export default router;
