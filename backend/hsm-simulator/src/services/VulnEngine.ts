import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export interface VulnerabilityConfig {
    allowReplay: boolean;
    weakKeysEnabled: boolean;
    verboseErrors: boolean;
    keyLeakInLogs: boolean;
}

export class VulnEngine {
    private static config: VulnerabilityConfig = {
        allowReplay: false,
        weakKeysEnabled: false,
        verboseErrors: false,
        keyLeakInLogs: false,
    };

    static updateConfig(newConfig: Partial<VulnerabilityConfig>): void {
        this.config = { ...this.config, ...newConfig };
        logger.warn('HSM: Vulnerability Configuration Updated', this.config);
    }

    static getConfig(): VulnerabilityConfig {
        return { ...this.config };
    }

    static middleware(req: Request, _res: Response, next: NextFunction): void {
        const body = (req.body ?? {}) as Record<string, unknown>;

        if (VulnEngine.config.keyLeakInLogs) {
            if (body.key || body.keyLabel || body.pinBlock || body.clearKey) {
                logger.warn('[VULN:LEAK] Request contains sensitive material', {
                    path: req.path,
                    body,
                });
            }
        }

        next();
    }
}
