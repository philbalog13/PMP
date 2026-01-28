/**
 * Health Routes
 */
import { Router } from 'express';
import {
    liveness,
    readiness,
    health,
    dependencies,
    circuitBreakers,
    metrics,
} from '../controllers/health.controller';

const router = Router();

/**
 * @route GET /health
 * @description Detailed health check
 */
router.get('/', health);

/**
 * @route GET /health/live
 * @description Kubernetes liveness probe
 */
router.get('/live', liveness);

/**
 * @route GET /health/ready
 * @description Kubernetes readiness probe
 */
router.get('/ready', readiness);

/**
 * @route GET /health/dependencies
 * @description Get dependency statuses
 */
router.get('/dependencies', dependencies);

/**
 * @route GET /health/circuit-breakers
 * @description Get circuit breaker statuses
 */
router.get('/circuit-breakers', circuitBreakers);

export default router;
