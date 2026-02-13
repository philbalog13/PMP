/**
 * Client Routes - PMP
 * Virtual cards and transactions for clients
 */
import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { RequireRole, UserRole } from '../middleware/roles';
import * as clientController from '../controllers/client.controller';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// All routes require CLIENT role
router.use(RequireRole(UserRole.CLIENT));

/**
 * GET /api/client/dashboard
 * Get client dashboard data
 */
router.get('/dashboard', clientController.getDashboard);

/**
 * GET /api/client/account
 * Get client bank account
 */
router.get('/account', clientController.getAccount);

/**
 * PATCH /api/client/account
 * Update account settings (label, limits, status)
 */
router.patch('/account', clientController.updateAccount);

/**
 * GET /api/client/account/entries
 * List bank account entries
 */
router.get('/account/entries', clientController.getAccountEntries);

/**
 * POST /api/client/account/deposit
 * Deposit funds into bank account
 */
router.post('/account/deposit', clientController.deposit);

/**
 * POST /api/client/account/withdraw
 * Withdraw funds from bank account
 */
router.post('/account/withdraw', clientController.withdraw);

/**
 * POST /api/client/cards
 * Create a new additional card with assigned amount
 */
router.post('/cards', clientController.createCard);

/**
 * GET /api/client/cards
 * List all my cards
 */
router.get('/cards', clientController.getMyCards);

/**
 * GET /api/client/cards/:id
 * Get card details
 */
router.get('/cards/:id', clientController.getCardById);

/**
 * PATCH /api/client/cards/:id/limits
 * Update card limits
 */
router.patch('/cards/:id/limits', clientController.updateCardLimits);

/**
 * PATCH /api/client/cards/:id/block
 * Block/unblock card
 */
router.patch('/cards/:id/block', clientController.toggleCardBlock);

/**
 * PATCH /api/client/cards/:id/features
 * Update card features (contactless, 3DS, etc.)
 */
router.patch('/cards/:id/features', clientController.updateCardFeatures);

/**
 * GET /api/client/merchants
 * List available merchants for payment
 */
router.get('/merchants', clientController.listMerchants);

/**
 * GET /api/client/transactions
 * List my transactions
 */
router.get('/transactions', clientController.getMyTransactions);

/**
 * GET /api/client/transactions/:id
 * Get transaction details
 */
router.get('/transactions/:id', clientController.getTransactionById);

/**
 * GET /api/client/transactions/:id/timeline
 * Get transaction timeline
 */
router.get('/transactions/:id/timeline', clientController.getTransactionTimeline);

/**
 * POST /api/client/transactions/simulate
 * Simulate a payment
 */
router.post('/transactions/simulate', clientController.simulatePayment);

/**
 * GET /api/client/security
 * Get security settings
 */
router.get('/security', clientController.getSecuritySettings);

/**
 * PATCH /api/client/security
 * Update security settings
 */
router.patch('/security', clientController.updateSecuritySettings);

export default router;
