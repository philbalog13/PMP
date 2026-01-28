"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VulnEngine = void 0;
const logger_1 = require("../utils/logger");
class VulnEngine {
    static updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        logger_1.logger.warn('HSM: Vulnerability Configuration Updated', this.config);
    }
    static getConfig() {
        return this.config;
    }
    // Middleware to check for vulnerabilities
    static middleware(req, res, next) {
        // 1. Weak Key Injection (Pedagogical)
        if (VulnEngine.config.weakKeysEnabled) {
            // If user provides a key, maybe we force it to be weak?
            // Or we allow weak keys (all 0s, all 1s) without warning.
        }
        // 2. Key Leak in Logs
        if (VulnEngine.config.keyLeakInLogs) {
            if (req.body.key || req.body.keyLabel) {
                logger_1.logger.warn(`[VULN: LEAK] Processing op with Key Info: ${JSON.stringify(req.body)}`);
            }
        }
        next();
    }
}
exports.VulnEngine = VulnEngine;
VulnEngine.config = {
    allowReplay: false,
    weakKeysEnabled: false,
    verboseErrors: false, // Leaks internal paths/logic
    keyLeakInLogs: false
};
