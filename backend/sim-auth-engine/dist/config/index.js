"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
/**
 * Application Configuration
 */
const dotenv_1 = __importDefault(require("dotenv"));
const joi_1 = __importDefault(require("joi"));
dotenv_1.default.config();
const envSchema = joi_1.default.object({
    NODE_ENV: joi_1.default.string().valid('development', 'production', 'test').default('development'),
    PORT: joi_1.default.number().default(8006),
    HOST: joi_1.default.string().default('0.0.0.0'),
    LOG_LEVEL: joi_1.default.string().valid('error', 'warn', 'info', 'debug').default('info'),
    LOG_FORMAT: joi_1.default.string().valid('json', 'simple').default('json'),
    REDIS_URL: joi_1.default.string().uri().optional(),
    DEFAULT_DAILY_LIMIT: joi_1.default.number().default(5000),
    DEFAULT_SINGLE_TXN_LIMIT: joi_1.default.number().default(2000),
    HIGH_RISK_THRESHOLD: joi_1.default.number().default(1000),
    REQUIRE_3DS_ABOVE: joi_1.default.number().default(500),
    REQUEST_TIMEOUT: joi_1.default.number().default(5000),
    METRICS_ENABLED: joi_1.default.boolean().default(true),
    METRICS_PREFIX: joi_1.default.string().default('sim_auth_engine'),
}).unknown(true);
const { error, value: envVars } = envSchema.validate(process.env);
if (error) {
    throw new Error(`Configuration validation error: ${error.message}`);
}
exports.config = {
    env: envVars.NODE_ENV,
    isProduction: envVars.NODE_ENV === 'production',
    isDevelopment: envVars.NODE_ENV === 'development',
    isTest: envVars.NODE_ENV === 'test',
    server: {
        port: envVars.PORT,
        host: envVars.HOST,
    },
    logging: {
        level: envVars.LOG_LEVEL,
        format: envVars.LOG_FORMAT,
    },
    limits: {
        dailyLimit: envVars.DEFAULT_DAILY_LIMIT,
        singleTxnLimit: envVars.DEFAULT_SINGLE_TXN_LIMIT,
        highRiskThreshold: envVars.HIGH_RISK_THRESHOLD,
        require3dsAbove: envVars.REQUIRE_3DS_ABOVE,
    },
    metrics: {
        enabled: envVars.METRICS_ENABLED,
        prefix: envVars.METRICS_PREFIX,
    },
    timeout: envVars.REQUEST_TIMEOUT,
};
exports.default = exports.config;
//# sourceMappingURL=index.js.map