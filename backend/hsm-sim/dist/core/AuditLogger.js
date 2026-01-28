"use strict";
/**
 * AuditLogger.ts
 *
 * Journalisation sécurisée des opérations HSM
 * Trace toutes les opérations cryptographiques pour audit
 *
 * @educational Simule le journal d'audit obligatoire d'un HSM
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditLogger = void 0;
const events_1 = require("events");
class AuditLogger extends events_1.EventEmitter {
    constructor(debugMode = true) {
        super();
        this.logs = [];
        this.MAX_LOGS = 10000;
        this.debugMode = debugMode;
    }
    /**
     * Log an event
     */
    log(event, data = {}, level = 'INFO') {
        const entry = {
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
    debug(event, data = {}) {
        this.log(event, data, 'DEBUG');
    }
    /**
     * Log info
     */
    info(event, data = {}) {
        this.log(event, data, 'INFO');
    }
    /**
     * Log warning
     */
    warn(event, data = {}) {
        this.log(event, data, 'WARN');
    }
    /**
     * Log error
     */
    error(event, data = {}) {
        this.log(event, data, 'ERROR');
    }
    /**
     * Log security event
     */
    security(event, data = {}) {
        this.log(event, data, 'SECURITY');
    }
    /**
     * Get all logs
     */
    getLogs(level, limit = 100) {
        let filtered = this.logs;
        if (level) {
            filtered = filtered.filter(l => l.level === level);
        }
        return filtered.slice(-limit);
    }
    /**
     * Clear logs
     */
    clear() {
        this.logs = [];
    }
    /**
     * Set debug mode
     */
    setDebugMode(enabled) {
        this.debugMode = enabled;
    }
    getPrefix(level) {
        const prefixes = {
            DEBUG: '🔍',
            INFO: 'ℹ️',
            WARN: '⚠️',
            ERROR: '❌',
            SECURITY: '🔒',
        };
        return `${prefixes[level]} [HSM]`;
    }
}
exports.AuditLogger = AuditLogger;
