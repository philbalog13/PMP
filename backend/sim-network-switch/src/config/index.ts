/**
 * Application Configuration
 * Loads and validates environment variables
 */
import dotenv from 'dotenv';
import Joi from 'joi';

// Load environment variables
dotenv.config();

// Configuration schema validation
const envSchema = Joi.object({
    NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
    PORT: Joi.number().default(8004),
    HOST: Joi.string().default('0.0.0.0'),

    // Logging
    LOG_LEVEL: Joi.string().valid('error', 'warn', 'info', 'debug').default('info'),
    LOG_FORMAT: Joi.string().valid('json', 'simple').default('json'),

    // Redis
    REDIS_URL: Joi.string().uri().default('redis://:redis_pass_2024@redis:6379'),
    REDIS_PREFIX: Joi.string().default('network-switch:'),

    // Connected Services
    ISSUER_SERVICE_URL: Joi.string().uri().required(),
    ACQUIRER_SERVICE_URL: Joi.string().uri().optional(),

    // Circuit Breaker
    CIRCUIT_BREAKER_TIMEOUT: Joi.number().default(3000),
    CIRCUIT_BREAKER_ERROR_THRESHOLD: Joi.number().default(50),
    CIRCUIT_BREAKER_RESET_TIMEOUT: Joi.number().default(30000),

    // Retry Configuration
    RETRY_MAX_ATTEMPTS: Joi.number().default(3),
    RETRY_INITIAL_DELAY: Joi.number().default(100),
    RETRY_MAX_DELAY: Joi.number().default(2000),

    // Metrics
    METRICS_ENABLED: Joi.boolean().default(true),
    METRICS_PREFIX: Joi.string().default('sim_network_switch'),

    // Rate Limiting
    RATE_LIMIT_WINDOW_MS: Joi.number().default(60000),
    RATE_LIMIT_MAX_REQUESTS: Joi.number().default(100),

    // Timeout
    REQUEST_TIMEOUT: Joi.number().default(5000),
}).unknown(true);

const { error, value: envVars } = envSchema.validate(process.env);

if (error) {
    throw new Error(`Configuration validation error: ${error.message}`);
}

export const config = {
    env: envVars.NODE_ENV as string,
    isProduction: envVars.NODE_ENV === 'production',
    isDevelopment: envVars.NODE_ENV === 'development',
    isTest: envVars.NODE_ENV === 'test',

    server: {
        port: envVars.PORT as number,
        host: envVars.HOST as string,
    },

    logging: {
        level: envVars.LOG_LEVEL as string,
        format: envVars.LOG_FORMAT as string,
    },

    redis: {
        url: envVars.REDIS_URL as string,
        prefix: envVars.REDIS_PREFIX as string,
    },

    services: {
        issuer: envVars.ISSUER_SERVICE_URL as string,
        acquirer: envVars.ACQUIRER_SERVICE_URL as string,
        pos: envVars.POS_SERVICE_URL || 'http://localhost:8001',
        blockchain: envVars.BLOCKCHAIN_SERVICE_URL || 'http://localhost:8008',
        monitoring: envVars.MONITORING_SERVICE_URL || 'http://localhost:4000',
    },

    circuitBreaker: {
        timeout: envVars.CIRCUIT_BREAKER_TIMEOUT as number,
        errorThresholdPercentage: envVars.CIRCUIT_BREAKER_ERROR_THRESHOLD as number,
        resetTimeout: envVars.CIRCUIT_BREAKER_RESET_TIMEOUT as number,
    },

    retry: {
        maxAttempts: envVars.RETRY_MAX_ATTEMPTS as number,
        initialDelay: envVars.RETRY_INITIAL_DELAY as number,
        maxDelay: envVars.RETRY_MAX_DELAY as number,
    },

    metrics: {
        enabled: envVars.METRICS_ENABLED as boolean,
        prefix: envVars.METRICS_PREFIX as string,
    },

    rateLimit: {
        windowMs: envVars.RATE_LIMIT_WINDOW_MS as number,
        maxRequests: envVars.RATE_LIMIT_MAX_REQUESTS as number,
    },

    timeout: envVars.REQUEST_TIMEOUT as number,
};

export default config;
