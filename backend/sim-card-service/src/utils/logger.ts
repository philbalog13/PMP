import winston from 'winston';
import { config } from '../config';

const format = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.printf(({ timestamp, level, message, correlationId, ...meta }) => {
        const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : '';
        const corrId = correlationId ? `[${correlationId}]` : '';
        return `${timestamp} ${level.toUpperCase()} ${corrId} ${message} ${metaStr}`.trim();
    })
);

export const logger = winston.createLogger({
    level: config.nodeEnv === 'production' ? 'info' : 'debug',
    format,
    transports: [
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                format
            )
        })
    ]
});

export const createLogger = (correlationId?: string) => {
    return logger.child({ correlationId });
};
