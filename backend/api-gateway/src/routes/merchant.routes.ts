/**
 * Merchant Routes - PMP
 * POS terminals, transactions, and reports for merchants
 */
import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { RequireRole, UserRole } from '../middleware/roles';
import * as merchantController from '../controllers/merchant.controller';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// All routes require MARCHAND role
router.use(RequireRole(UserRole.MARCHAND));

/**
 * GET /api/merchant/dashboard
 * Get merchant dashboard data
 */
router.get('/dashboard', merchantController.getDashboard);

/**
 * GET /api/merchant/transactions
 * List all transactions
 */
router.get('/transactions', merchantController.getTransactions);

/**
 * GET /api/merchant/transactions/:id
 * Get transaction details
 */
router.get('/transactions/:id', merchantController.getTransactionById);

/**
 * POST /api/merchant/transactions/:id/refund
 * Refund a transaction
 */
router.post('/transactions/:id/refund', merchantController.refundTransaction);

/**
 * POST /api/merchant/transactions/:id/void
 * Void a transaction
 */
router.post('/transactions/:id/void', merchantController.voidTransaction);

/**
 * GET /api/merchant/pos
 * List POS terminals
 */
router.get('/pos', merchantController.getPOSTerminals);

/**
 * GET /api/merchant/pos/:id
 * Get POS terminal details
 */
router.get('/pos/:id', merchantController.getPOSById);

/**
 * POST /api/merchant/pos/transaction
 * Create POS transaction (simulate encaissement)
 */
router.post('/pos/transaction', merchantController.createPOSTransaction);

/**
 * GET /api/merchant/reports
 * Get reports list
 */
router.get('/reports', merchantController.getReports);

/**
 * GET /api/merchant/reports/daily
 * Get daily report
 */
router.get('/reports/daily', merchantController.getDailyReport);

/**
 * GET /api/merchant/reports/reconciliation
 * Get reconciliation report
 */
router.get('/reports/reconciliation', merchantController.getReconciliationReport);

/**
 * POST /api/merchant/reports/export
 * Export report
 */
router.post('/reports/export', merchantController.exportReport);

/**
 * GET /api/merchant/api-keys
 * List API keys
 */
router.get('/api-keys', merchantController.getAPIKeys);

/**
 * POST /api/merchant/api-keys
 * Create API key
 */
router.post('/api-keys', merchantController.createAPIKey);

/**
 * DELETE /api/merchant/api-keys/:id
 * Revoke API key
 */
router.delete('/api-keys/:id', merchantController.revokeAPIKey);

/**
 * GET /api/merchant/webhooks
 * List webhooks
 */
router.get('/webhooks', merchantController.getWebhooks);

/**
 * POST /api/merchant/webhooks
 * Create webhook
 */
router.post('/webhooks', merchantController.createWebhook);

/**
 * DELETE /api/merchant/webhooks/:id
 * Delete webhook
 */
router.delete('/webhooks/:id', merchantController.deleteWebhook);

export default router;
