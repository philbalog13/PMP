/**
 * Routes Index
 */
import { Router } from 'express';
import transactionRoutes from './transaction.routes';
import healthRoutes from './health.routes';
import { metrics } from '../controllers/health.controller';
import { startEmvSession, relayEmvSession, getTerminalNonce } from '../controllers/transaction.controller';

const router = Router();

// Transaction routes
router.use('/transaction', transactionRoutes);

// Legacy EMV CTF routes
router.post('/emv/session', startEmvSession);
router.post('/emv/relay-test', relayEmvSession);
router.get('/emv/terminal-nonce', getTerminalNonce);

// Health routes
router.use('/health', healthRoutes);

// Prometheus metrics
router.get('/metrics', metrics);

export default router;
