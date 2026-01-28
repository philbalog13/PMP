import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export class VulnEngine {
    private static config = {
        allowReplay: false,
        weakKeysEnabled: false,
        verboseErrors: false, // Leaks internal paths/logic
        keyLeakInLogs: false
    };

    static updateConfig(newConfig: Partial<typeof VulnEngine.config>) {
        this.config = { ...this.config, ...newConfig };
        logger.warn('HSM: Vulnerability Configuration Updated', this.config);
    }

    static getConfig() {
        return this.config;
    }

    // Middleware to check for vulnerabilities
    static middleware(req: Request, res: Response, next: NextFunction) {
        // 1. Weak Key Injection (Pedagogical)
        if (VulnEngine.config.weakKeysEnabled) {
            // If user provides a key, maybe we force it to be weak?
            // Or we allow weak keys (all 0s, all 1s) without warning.
        }

        // 2. Key Leak in Logs
        if (VulnEngine.config.keyLeakInLogs) {
            if (req.body.key || req.body.keyLabel) {
                logger.warn(`[VULN: LEAK] Processing op with Key Info: ${JSON.stringify(req.body)}`);
            }
        }

        next();
    }
}
