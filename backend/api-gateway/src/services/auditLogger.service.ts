import { query } from '../config/database';
import { logger } from '../utils/logger';

export enum AuditEventType {
    LOGIN_SUCCESS = 'LOGIN_SUCCESS',
    LOGIN_FAILED = 'LOGIN_FAILED',
    LOGOUT = 'LOGOUT',
    REGISTER = 'REGISTER',
    TOKEN_REVOKED = 'TOKEN_REVOKED',
    ACCOUNT_LOCKED = 'ACCOUNT_LOCKED'
}

interface AuditEvent {
    eventType: AuditEventType;
    userId?: string;
    username?: string;
    ipAddress: string;
    userAgent: string;
    metadata?: Record<string, any>;
    success: boolean;
    errorMessage?: string;
}

class AuditLoggerService {
    async logSecurityEvent(event: AuditEvent): Promise<void> {
        logger[event.success ? 'info' : 'warn']('Security Event', {
            type: event.eventType,
            userId: event.userId,
            ip: event.ipAddress,
            success: event.success
        });

        try {
            await query(
                'INSERT INTO security.audit_logs (event_type, user_id, username, ip_address, user_agent, metadata, success, error_message) VALUES (\, \, \, \, \, \, \, \)',
                [
                    event.eventType,
                    event.userId || null,
                    event.username || null,
                    event.ipAddress,
                    event.userAgent,
                    JSON.stringify(event.metadata || {}),
                    event.success,
                    event.errorMessage || null
                ]
            );
        } catch (error: any) {
            logger.error('Failed to persist audit log', { error: error.message });
        }
    }
}

export const auditLogger = new AuditLoggerService();
