/**
 * Health Controller
 * Health check endpoints
 */
import { Request, Response, NextFunction } from 'express';
import { healthService } from '../services/health.service';
import { getMetrics } from '../utils/metrics';
import { getAllCircuitBreakerStatuses } from '../utils/circuitBreaker';

/**
 * Liveness probe (Kubernetes)
 * GET /health/live
 */
export const liveness = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const status = await healthService.getLivenessStatus();
        res.status(status.status === 'ok' ? 200 : 503).json(status);
    } catch (err) {
        res.status(503).json({ status: 'error' });
    }
};

/**
 * Readiness probe (Kubernetes)
 * GET /health/ready
 */
export const readiness = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const status = await healthService.getReadinessStatus();
        res.status(status.status === 'ok' ? 200 : 503).json(status);
    } catch (err) {
        res.status(503).json({ status: 'error' });
    }
};

/**
 * Detailed health check
 * GET /health
 */
export const health = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const healthStatus = await healthService.getDetailedHealth();

        const statusCode =
            healthStatus.status === 'healthy' ? 200 :
                healthStatus.status === 'degraded' ? 200 : 503;

        res.status(statusCode).json({
            success: healthStatus.status !== 'unhealthy',
            data: healthStatus,
            meta: {
                requestId: req.requestId,
            },
        });

    } catch (err) {
        next(err);
    }
};

/**
 * Get dependency statuses
 * GET /health/dependencies
 */
export const dependencies = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const deps = await healthService.getDependencyStatuses();

        res.status(200).json({
            success: true,
            data: {
                dependencies: deps,
                count: deps.length,
            },
            meta: {
                requestId: req.requestId,
            },
        });

    } catch (err) {
        next(err);
    }
};

/**
 * Get circuit breaker statuses
 * GET /health/circuit-breakers
 */
export const circuitBreakers = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const statuses = getAllCircuitBreakerStatuses();

        res.status(200).json({
            success: true,
            data: statuses,
            meta: {
                requestId: req.requestId,
            },
        });

    } catch (err) {
        next(err);
    }
};

/**
 * Prometheus metrics endpoint
 * GET /metrics
 */
export const metrics = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const metricsOutput = await getMetrics();
        res.set('Content-Type', 'text/plain');
        res.send(metricsOutput);
    } catch (err) {
        next(err);
    }
};

export default {
    liveness,
    readiness,
    health,
    dependencies,
    circuitBreakers,
    metrics,
};
