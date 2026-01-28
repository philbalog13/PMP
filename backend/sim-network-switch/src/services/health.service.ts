/**
 * Health Check Service
 * Detailed health monitoring for the microservice
 */
import { config } from '../config';
import { logger } from '../utils/logger';
import { getAllCircuitBreakerStatuses } from '../utils/circuitBreaker';
import { metricsRegistry } from '../utils/metrics';
import { HealthCheckResponse, DependencyStatus } from '../models';
import Redis from 'ioredis';
import axios from 'axios';

// Track startup time
const startupTime = Date.now();

// Redis client for health checks
let redisClient: Redis | null = null;

/**
 * Initialize Redis client for health checks
 */
export const initializeHealthCheckDependencies = async (): Promise<void> => {
    try {
        redisClient = new Redis(config.redis.url, {
            lazyConnect: true,
            maxRetriesPerRequest: 1,
            retryStrategy: () => null, // Don't retry on health checks
        });
        await redisClient.connect();
        logger.info('Health check Redis connection initialized');
    } catch (error) {
        logger.warn('Redis connection for health checks failed', { error });
    }
};

/**
 * Health Check Service Class
 */
export class HealthService {
    /**
     * Get simple health status (for Kubernetes probes)
     */
    async getLivenessStatus(): Promise<{ status: 'ok' | 'error' }> {
        return { status: 'ok' };
    }

    /**
     * Get readiness status (for Kubernetes probes)
     */
    async getReadinessStatus(): Promise<{ status: 'ok' | 'error'; message?: string }> {
        try {
            // Check critical dependencies
            const redisOk = await this.checkRedis();

            if (!redisOk) {
                return { status: 'error', message: 'Redis connection failed' };
            }

            return { status: 'ok' };
        } catch (error) {
            return {
                status: 'error',
                message: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    /**
     * Get detailed health status
     */
    async getDetailedHealth(): Promise<HealthCheckResponse> {
        const checks: HealthCheckResponse['checks'] = [];
        let overallStatus: HealthCheckResponse['status'] = 'healthy';

        // Check Redis
        const redisCheck = await this.performRedisCheck();
        checks.push(redisCheck);
        if (redisCheck.status === 'fail') overallStatus = 'unhealthy';
        else if (redisCheck.status === 'warn') overallStatus = 'degraded';

        // Check Issuer Service
        const issuerCheck = await this.performServiceCheck(
            'issuer-service',
            config.services.issuer
        );
        checks.push(issuerCheck);
        if (issuerCheck.status === 'fail' && overallStatus === 'healthy') {
            overallStatus = 'degraded';
        }

        // Check memory usage
        const memoryCheck = this.performMemoryCheck();
        checks.push(memoryCheck);
        if (memoryCheck.status === 'fail') overallStatus = 'unhealthy';

        // Check circuit breakers
        const circuitBreakerCheck = this.performCircuitBreakerCheck();
        checks.push(circuitBreakerCheck);
        if (circuitBreakerCheck.status === 'warn' && overallStatus === 'healthy') {
            overallStatus = 'degraded';
        }

        const uptime = Math.floor((Date.now() - startupTime) / 1000);

        return {
            status: overallStatus,
            version: process.env.npm_package_version || '1.0.0',
            uptime,
            timestamp: new Date().toISOString(),
            checks,
            metrics: await this.getHealthMetrics(),
        };
    }

    /**
     * Check Redis connectivity
     */
    private async checkRedis(): Promise<boolean> {
        if (!redisClient) return false;
        try {
            const pong = await redisClient.ping();
            return pong === 'PONG';
        } catch {
            return false;
        }
    }

    /**
     * Perform Redis health check
     */
    private async performRedisCheck(): Promise<HealthCheckResponse['checks'][0]> {
        const startTime = Date.now();
        try {
            if (!redisClient) {
                return {
                    name: 'redis',
                    status: 'fail',
                    message: 'Redis client not initialized',
                };
            }

            const pong = await redisClient.ping();
            const responseTime = Date.now() - startTime;

            if (pong === 'PONG') {
                return {
                    name: 'redis',
                    status: responseTime > 100 ? 'warn' : 'pass',
                    message: responseTime > 100 ? 'High latency' : 'Connected',
                    responseTime,
                };
            }

            return {
                name: 'redis',
                status: 'fail',
                message: 'Unexpected response',
                responseTime,
            };
        } catch (error) {
            return {
                name: 'redis',
                status: 'fail',
                message: error instanceof Error ? error.message : 'Connection failed',
                responseTime: Date.now() - startTime,
            };
        }
    }

    /**
     * Perform external service health check
     */
    private async performServiceCheck(
        name: string,
        url: string
    ): Promise<HealthCheckResponse['checks'][0]> {
        const startTime = Date.now();
        try {
            const response = await axios.get(`${url}/health`, {
                timeout: 2000,
            });
            const responseTime = Date.now() - startTime;

            if (response.status === 200) {
                return {
                    name,
                    status: responseTime > 500 ? 'warn' : 'pass',
                    message: responseTime > 500 ? 'High latency' : 'Healthy',
                    responseTime,
                };
            }

            return {
                name,
                status: 'warn',
                message: `Unexpected status: ${response.status}`,
                responseTime,
            };
        } catch (error) {
            return {
                name,
                status: 'fail',
                message: error instanceof Error ? error.message : 'Connection failed',
                responseTime: Date.now() - startTime,
            };
        }
    }

    /**
     * Check memory usage
     */
    private performMemoryCheck(): HealthCheckResponse['checks'][0] {
        const memoryUsage = process.memoryUsage();
        const heapUsedMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
        const heapTotalMB = Math.round(memoryUsage.heapTotal / 1024 / 1024);
        const usagePercent = (heapUsedMB / heapTotalMB) * 100;

        let status: 'pass' | 'warn' | 'fail' = 'pass';
        if (usagePercent > 90) status = 'fail';
        else if (usagePercent > 75) status = 'warn';

        return {
            name: 'memory',
            status,
            message: `Heap: ${heapUsedMB}MB / ${heapTotalMB}MB (${usagePercent.toFixed(1)}%)`,
        };
    }

    /**
     * Check circuit breaker states
     */
    private performCircuitBreakerCheck(): HealthCheckResponse['checks'][0] {
        const statuses = getAllCircuitBreakerStatuses();
        const openCircuits = Object.values(statuses).filter(
            s => s?.state === 'open'
        );

        if (openCircuits.length === 0) {
            return {
                name: 'circuit-breakers',
                status: 'pass',
                message: 'All circuits closed',
            };
        }

        return {
            name: 'circuit-breakers',
            status: 'warn',
            message: `${openCircuits.length} circuit(s) open`,
        };
    }

    /**
     * Get basic health metrics
     */
    private async getHealthMetrics(): Promise<HealthCheckResponse['metrics']> {
        try {
            const metrics = await metricsRegistry.getMetricsAsJSON();

            // Extract relevant metrics
            const requestsMetric = metrics.find((m: { name: string }) => m.name.includes('http_requests_total'));
            const durationMetric = metrics.find((m: { name: string }) => m.name.includes('http_request_duration'));
            const errorsMetric = metrics.find((m: { name: string }) => m.name.includes('errors_total'));

            // Calculate basic stats (simplified)
            return {
                requestsPerMinute: 0, // Would need a sliding window
                averageResponseTime: 0,
                errorRate: 0,
            };
        } catch {
            return undefined;
        }
    }

    /**
     * Get dependency statuses
     */
    async getDependencyStatuses(): Promise<DependencyStatus[]> {
        const dependencies: DependencyStatus[] = [];
        const circuitBreakerStatuses = getAllCircuitBreakerStatuses();

        // Redis
        const redisCheck = await this.performRedisCheck();
        dependencies.push({
            name: 'redis',
            url: config.redis.url.replace(/:[^:@]+@/, ':****@'), // Mask password
            status: redisCheck.status === 'pass' ? 'connected' :
                redisCheck.status === 'warn' ? 'degraded' : 'disconnected',
            latency: redisCheck.responseTime || 0,
            lastCheck: new Date().toISOString(),
            circuitBreakerState: 'closed',
        });

        // Issuer Service
        const issuerCheck = await this.performServiceCheck('issuer', config.services.issuer);
        const issuerCb = circuitBreakerStatuses['issuer-service'];
        dependencies.push({
            name: 'issuer-service',
            url: config.services.issuer,
            status: issuerCheck.status === 'pass' ? 'connected' :
                issuerCheck.status === 'warn' ? 'degraded' : 'disconnected',
            latency: issuerCheck.responseTime || 0,
            lastCheck: new Date().toISOString(),
            circuitBreakerState: (issuerCb?.state || 'closed') as 'closed' | 'open' | 'half-open',
        });

        return dependencies;
    }
}

// Export singleton instance
export const healthService = new HealthService();
export default healthService;
