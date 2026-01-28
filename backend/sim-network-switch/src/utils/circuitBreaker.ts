/**
 * Circuit Breaker with Opossum
 * Protects against cascading failures
 */
import CircuitBreaker from 'opossum';
import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import { config } from '../config';
import { logger } from './logger';
import { updateCircuitBreakerState, retryAttempts } from './metrics';

// Circuit breaker options
const defaultOptions: CircuitBreaker.Options = {
    timeout: config.circuitBreaker.timeout,
    errorThresholdPercentage: config.circuitBreaker.errorThresholdPercentage,
    resetTimeout: config.circuitBreaker.resetTimeout,
    volumeThreshold: 5,
    rollingCountTimeout: 10000,
    rollingCountBuckets: 10,
};

// Store circuit breakers for different services
const circuitBreakers = new Map<string, CircuitBreaker<[AxiosRequestConfig], AxiosResponse>>();

/**
 * Create a circuit breaker for HTTP requests
 */
export const createCircuitBreaker = (
    serviceName: string,
    options?: Partial<CircuitBreaker.Options>
): CircuitBreaker<[AxiosRequestConfig], AxiosResponse> => {
    const existing = circuitBreakers.get(serviceName);
    if (existing) {
        return existing;
    }

    const breaker = new CircuitBreaker(
        async (requestConfig: AxiosRequestConfig): Promise<AxiosResponse> => {
            return axios(requestConfig);
        },
        { ...defaultOptions, ...options }
    );

    // Event handlers
    breaker.on('open', () => {
        logger.warn(`Circuit breaker OPENED for ${serviceName}`, { service: serviceName });
        updateCircuitBreakerState(serviceName, 'open');
    });

    breaker.on('halfOpen', () => {
        logger.info(`Circuit breaker HALF-OPEN for ${serviceName}`, { service: serviceName });
        updateCircuitBreakerState(serviceName, 'half-open');
    });

    breaker.on('close', () => {
        logger.info(`Circuit breaker CLOSED for ${serviceName}`, { service: serviceName });
        updateCircuitBreakerState(serviceName, 'closed');
    });

    breaker.on('fallback', () => {
        logger.warn(`Circuit breaker FALLBACK triggered for ${serviceName}`, { service: serviceName });
    });

    breaker.on('timeout', () => {
        logger.warn(`Circuit breaker TIMEOUT for ${serviceName}`, { service: serviceName });
    });

    breaker.on('reject', () => {
        logger.warn(`Circuit breaker REJECTED request for ${serviceName}`, { service: serviceName });
    });

    // Initialize state
    updateCircuitBreakerState(serviceName, 'closed');
    circuitBreakers.set(serviceName, breaker);

    return breaker;
};

/**
 * Get an existing circuit breaker
 */
export const getCircuitBreaker = (serviceName: string) => {
    return circuitBreakers.get(serviceName);
};

/**
 * Get circuit breaker status
 */
export const getCircuitBreakerStatus = (serviceName: string) => {
    const breaker = circuitBreakers.get(serviceName);
    if (!breaker) {
        return null;
    }

    return {
        name: serviceName,
        state: breaker.opened ? 'open' : breaker.halfOpen ? 'half-open' : 'closed',
        stats: {
            failures: breaker.stats.failures,
            successes: breaker.stats.successes,
            timeouts: breaker.stats.timeouts,
            fallbacks: breaker.stats.fallbacks,
            rejects: breaker.stats.rejects,
        },
    };
};

/**
 * Get all circuit breaker statuses
 */
export const getAllCircuitBreakerStatuses = () => {
    const statuses: Record<string, ReturnType<typeof getCircuitBreakerStatus>> = {};
    circuitBreakers.forEach((_, serviceName) => {
        statuses[serviceName] = getCircuitBreakerStatus(serviceName);
    });
    return statuses;
};

/**
 * Execute request with circuit breaker
 */
export const executeWithCircuitBreaker = async <T>(
    serviceName: string,
    requestConfig: AxiosRequestConfig
): Promise<AxiosResponse<T>> => {
    let breaker = circuitBreakers.get(serviceName);

    if (!breaker) {
        breaker = createCircuitBreaker(serviceName);
    }

    try {
        return await breaker.fire(requestConfig);
    } catch (error) {
        if (error instanceof Error && error.message === 'Breaker is open') {
            throw new Error(`Service ${serviceName} is unavailable (circuit breaker open)`);
        }
        throw error;
    }
};

export default { createCircuitBreaker, getCircuitBreaker, executeWithCircuitBreaker };
