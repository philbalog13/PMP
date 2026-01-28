/**
 * Winston Logger Configuration
 * Structured logging for microservice
 */
import winston from 'winston';
import { TransformableInfo } from 'logform';
import { config } from '../config';

const { combine, timestamp, printf, colorize, json, errors } = winston.format;

// Custom format for development
const devFormat = printf((info: TransformableInfo) => {
    const { level, message, timestamp, ...meta } = info;
    const metaString = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
    return `${timestamp} [${level}]: ${message} ${metaString}`;
});

// Create logger instance
export const logger = winston.createLogger({
    level: config.logging.level,
    defaultMeta: {
        service: 'sim-network-switch',
        version: process.env.npm_package_version || '1.0.0',
    },
    format: combine(
        errors({ stack: true }),
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
    ),
    transports: [
        // Console transport
        new winston.transports.Console({
            format: config.isProduction
                ? combine(json())
                : combine(colorize(), devFormat),
        }),
    ],
    // Don't exit on handled exceptions
    exitOnError: false,
});

// Create child logger with request context
export const createRequestLogger = (requestId: string, additionalMeta?: Record<string, unknown>) => {
    return logger.child({
        requestId,
        ...additionalMeta,
    });
};

// Log levels helper
export const logLevels = {
    error: (message: string, meta?: Record<string, unknown>) => logger.error(message, meta),
    warn: (message: string, meta?: Record<string, unknown>) => logger.warn(message, meta),
    info: (message: string, meta?: Record<string, unknown>) => logger.info(message, meta),
    debug: (message: string, meta?: Record<string, unknown>) => logger.debug(message, meta),
};

export default logger;
