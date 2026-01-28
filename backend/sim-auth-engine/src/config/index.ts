/**
 * Application Configuration
 */
import dotenv from 'dotenv';
import Joi from 'joi';

dotenv.config();

const envSchema = Joi.object({
    NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
    PORT: Joi.number().default(8006),
    HOST: Joi.string().default('0.0.0.0'),
    LOG_LEVEL: Joi.string().valid('error', 'warn', 'info', 'debug').default('info'),
    LOG_FORMAT: Joi.string().valid('json', 'simple').default('json'),
    REDIS_URL: Joi.string().uri().optional(),
    DEFAULT_DAILY_LIMIT: Joi.number().default(5000),
    DEFAULT_SINGLE_TXN_LIMIT: Joi.number().default(2000),
    HIGH_RISK_THRESHOLD: Joi.number().default(1000),
    REQUIRE_3DS_ABOVE: Joi.number().default(500),
    REQUEST_TIMEOUT: Joi.number().default(5000),
    METRICS_ENABLED: Joi.boolean().default(true),
    METRICS_PREFIX: Joi.string().default('sim_auth_engine'),
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
    limits: {
        dailyLimit: envVars.DEFAULT_DAILY_LIMIT as number,
        singleTxnLimit: envVars.DEFAULT_SINGLE_TXN_LIMIT as number,
        highRiskThreshold: envVars.HIGH_RISK_THRESHOLD as number,
        require3dsAbove: envVars.REQUIRE_3DS_ABOVE as number,
    },
    metrics: {
        enabled: envVars.METRICS_ENABLED as boolean,
        prefix: envVars.METRICS_PREFIX as string,
    },
    timeout: envVars.REQUEST_TIMEOUT as number,
};

export default config;
