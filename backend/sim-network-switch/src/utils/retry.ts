/**
 * Retry Logic with Exponential Backoff
 * Resilient HTTP requests with automatic retries
 */
import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios';
import axiosRetry, { IAxiosRetryConfig, exponentialDelay } from 'axios-retry';
import { config } from '../config';
import { logger } from './logger';
import { retryAttempts } from './metrics';

/**
 * Create an axios instance with retry configuration
 */
export const createRetryClient = (
    baseURL: string,
    customConfig?: Partial<IAxiosRetryConfig>
): AxiosInstance => {
    const client = axios.create({
        baseURL,
        timeout: config.timeout,
        headers: {
            'Content-Type': 'application/json',
        },
    });

    const retryConfig: IAxiosRetryConfig = {
        retries: config.retry.maxAttempts,
        retryDelay: (retryCount: number) => {
            const delay = exponentialDelay(retryCount);
            const cappedDelay = Math.min(delay, config.retry.maxDelay);
            logger.debug(`Retry attempt ${retryCount}, waiting ${cappedDelay}ms`);
            return cappedDelay;
        },
        retryCondition: (error: AxiosError) => {
            // Retry on network errors or 5xx responses
            const shouldRetry =
                axiosRetry.isNetworkError(error) ||
                axiosRetry.isRetryableError(error) ||
                (error.response?.status !== undefined && error.response.status >= 500);

            if (shouldRetry) {
                logger.warn(`Retrying request due to: ${error.message}`, {
                    url: error.config?.url,
                    status: error.response?.status,
                });
            }

            return shouldRetry;
        },
        onRetry: (retryCount: number, error: AxiosError, requestConfig: AxiosRequestConfig) => {
            retryAttempts.inc({ service: baseURL, success: 'pending' });
            logger.info(`Retry #${retryCount} for ${requestConfig.url}`, {
                error: error.message,
                retryCount,
            });
        },
        ...customConfig,
    };

    axiosRetry(client, retryConfig);

    // Response interceptor for logging
    client.interceptors.response.use(
        (response) => {
            logger.debug(`Request successful: ${response.config.url}`, {
                status: response.status,
                duration: response.headers['x-response-time'],
            });
            return response;
        },
        (error: AxiosError) => {
            logger.error(`Request failed: ${error.config?.url}`, {
                status: error.response?.status,
                message: error.message,
            });
            return Promise.reject(error);
        }
    );

    return client;
};

/**
 * Generic retry function for any async operation
 */
export const retryAsync = async <T>(
    operation: () => Promise<T>,
    options: {
        maxAttempts?: number;
        initialDelay?: number;
        maxDelay?: number;
        shouldRetry?: (error: Error) => boolean;
        onRetry?: (attempt: number, error: Error) => void;
    } = {}
): Promise<T> => {
    const {
        maxAttempts = config.retry.maxAttempts,
        initialDelay = config.retry.initialDelay,
        maxDelay = config.retry.maxDelay,
        shouldRetry = () => true,
        onRetry,
    } = options;

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return await operation();
        } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));

            if (attempt === maxAttempts || !shouldRetry(lastError)) {
                throw lastError;
            }

            const delay = Math.min(initialDelay * Math.pow(2, attempt - 1), maxDelay);

            if (onRetry) {
                onRetry(attempt, lastError);
            }

            logger.warn(`Retry attempt ${attempt}/${maxAttempts} after ${delay}ms`, {
                error: lastError.message,
            });

            await sleep(delay);
        }
    }

    throw lastError;
};

/**
 * Sleep helper
 */
const sleep = (ms: number): Promise<void> => {
    return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Calculate backoff delay
 */
export const calculateBackoff = (
    attempt: number,
    initialDelay: number = config.retry.initialDelay,
    maxDelay: number = config.retry.maxDelay
): number => {
    const exponentialDelay = initialDelay * Math.pow(2, attempt - 1);
    const jitter = Math.random() * 0.1 * exponentialDelay; // 10% jitter
    return Math.min(exponentialDelay + jitter, maxDelay);
};

export default { createRetryClient, retryAsync, calculateBackoff };
