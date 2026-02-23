/**
 * Admin Routes - PMP
 * Client management for administrators (FORMATEUR role)
 */
import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { RequireAnyRole, UserRole } from '../middleware/roles';
import * as adminController from '../controllers/admin.controller';

const router = Router();

// All routes require authentication + FORMATEUR (admin) role
router.use(authMiddleware);
router.use(RequireAnyRole(UserRole.FORMATEUR));

/**
 * GET /api/admin/clients
 * List all clients with account and card summary
 */
router.get('/clients', adminController.listClients);

/**
 * GET /api/admin/clients/:id
 * Get full client details (cards, transactions, account)
 */
router.get('/clients/:id', adminController.getClientDetail);

/**
 * PATCH /api/admin/clients/:id/suspend
 * Suspend or reactivate a client account
 */
router.patch('/clients/:id/suspend', adminController.suspendClient);

/**
 * POST /api/admin/clients/:id/message
 * Send a platform message to a client (stored in DB)
 */
router.post('/clients/:id/message', adminController.sendMessage);

/**
 * GET /api/admin/clients/:id/messages
 * Get messages sent to a client
 */
router.get('/clients/:id/messages', adminController.getClientMessages);

export default router;
