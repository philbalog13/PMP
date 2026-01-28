import winston from 'winston';
import { config } from '../config';

const logFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
    winston.format.errors({ stack: true }),
    winston.format.printf(({ timestamp, level, message, correlationId, ...meta }) => {
        const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : '';
        const corrId = correlationId ? `[${correlationId}]` : '';
        return `${timestamp} [API-GW] ${level.toUpperCase()} ${corrId} ${message} ${metaStr}`;
    })
);

export const logger = winston.createLogger({
    level: config.nodeEnv === 'production' ? 'info' : 'debug',
    format: logFormat,
    transports: [
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                logFormat
            )
        })
    ]
});

export const createChildLogger = (correlationId: string) => {
    return logger.child({ correlationId });
};
