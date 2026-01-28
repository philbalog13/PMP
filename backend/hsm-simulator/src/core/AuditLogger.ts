/**
 * AuditLogger.ts
 * 
 * Journalisation sécurisée des opérations HSM
 * Trace toutes les opérations cryptographiques pour audit
 * 
 * @educational Simule le journal d'audit obligatoire d'un HSM
 */

import { EventEmitter } from 'events';

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'SECURITY';

export interface AuditEntry {
    timestamp: Date;
    level: LogLevel;
    event: string;
    data: any;
    correlationId?: string;
}

export class AuditLogger extends EventEmitter {
    private logs: AuditEntry[] = [];
    private readonly MAX_LOGS = 10000;
    private debugMode: boolean;

    constructor(debugMode: boolean = true) {
        super();
        this.debugMode = debugMode;
    }

    /**
     * Log an event
     */
    log(event: string, data: any = {}, level: LogLevel = 'INFO'): void {
        const entry: AuditEntry = {
            timestamp: new Date(),
            level,
            event,
            data,
        };

        this.logs.push(entry);

        if (this.logs.length > this.MAX_LOGS) {
            this.logs.shift();
        }

        if (this.debugMode) {
            const prefix = this.getPrefix(level);
            console.log(`${prefix} [${event}]`, JSON.stringify(data, null, 2));
        }

        this.emit('log', entry);
    }

    /**
     * Log debug information
     */
    debug(event: string, data: any = {}): void {
        this.log(event, data, 'DEBUG');
    }

    /**
     * Log info
     */
    info(event: string, data: any = {}): void {
        this.log(event, data, 'INFO');
    }

    /**
     * Log warning
     */
    warn(event: string, data: any = {}): void {
        this.log(event, data, 'WARN');
    }

    /**
     * Log error
     */
    error(event: string, data: any = {}): void {
        this.log(event, data, 'ERROR');
    }

    /**
     * Log security event
     */
    security(event: string, data: any = {}): void {
        this.log(event, data, 'SECURITY');
    }

    /**
     * Get all logs
     */
    getLogs(level?: LogLevel, limit: number = 100): AuditEntry[] {
        let filtered = this.logs;
        if (level) {
            filtered = filtered.filter(l => l.level === level);
        }
        return filtered.slice(-limit);
    }

    /**
     * Clear logs
     */
    clear(): void {
        this.logs = [];
    }

    /**
     * Set debug mode
     */
    setDebugMode(enabled: boolean): void {
        this.debugMode = enabled;
    }

    private getPrefix(level: LogLevel): string {
        const prefixes: Record<LogLevel, string> = {
            DEBUG: '🔍',
            INFO: 'ℹ️',
            WARN: '⚠️',
            ERROR: '❌',
            SECURITY: '🔒',
        };
        return `${prefixes[level]} [HSM]`;
    }
}
