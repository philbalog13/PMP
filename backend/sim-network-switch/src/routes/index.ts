/**
 * Routes Index
 */
import { Router } from 'express';
import transactionRoutes from './transaction.routes';
import healthRoutes from './health.routes';
import { metrics } from '../controllers/health.controller';

const router = Router();

// Transaction routes
router.use('/transaction', transactionRoutes);

// Health routes
router.use('/health', healthRoutes);

// Prometheus metrics
router.get('/metrics', metrics);

export default router;
