import { NextFunction, Request, Response } from 'express';
import * as crypto from 'crypto';
import { logger } from '../utils/logger';

// Lazy-load ioredis so the HSM can start without Redis (falls back to in-memory Map).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let RedisClass: any = null;
try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    RedisClass = require('ioredis');
} catch {
    logger.warn('[VulnEngine] ioredis not available — using in-memory Map for vuln configs');
}
// Use the same type alias to keep internal method signatures identical
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Redis = any;

export interface VulnerabilityConfig {
    allowReplay: boolean;
    weakKeysEnabled: boolean;
    verboseErrors: boolean;
    keyLeakInLogs: boolean;
    simulateDown: boolean;
    timingAttackEnabled: boolean;
}

const CHALLENGE_FLAG_BASES: Record<string, string> = {
    'HSM-001': 'HSM_KEYS_NO_AUTH',
    'HSM-002': 'WEAK_ZPK_KEY',
    'HSM-003': 'KEY_LEAK_IN_LOGS',
    'HSM-004': 'ECB_LEAKS_PATTERNS',
    'HSM-005': 'TIMING_ATTACK_MAC',
    'PIN-001': 'PIN_VERIFY_FAILOPEN',
    'PIN-002': 'MATH_RANDOM_PIN_BLOCK',
    'KEY-002': 'SHARED_KEK_ALL_TERMINALS',
    'KEY-001': 'LMK_COMPONENTS_IN_FILE',
    'KEY-003': 'ZPK_NEVER_ROTATED',
    'KEY-004': 'KEY_EXPORT_UNDER_WEAK',
};

const DEFAULT_CONFIG: VulnerabilityConfig = {
    allowReplay: false,
    weakKeysEnabled: false,
    verboseErrors: false,
    keyLeakInLogs: false,
    simulateDown: false,
    // OFF by default: timing-safe comparison used for all students not on HSM-005.
    // CHALLENGE_DEFAULTS['HSM-005'] flips this to true for that specific challenge.
    timingAttackEnabled: false,
};

const CHALLENGE_DEFAULTS: Record<string, Partial<VulnerabilityConfig>> = {
    'HSM-001': {},
    'HSM-002': {},
    'HSM-003': { keyLeakInLogs: true },
    'HSM-004': {},
    'HSM-005': { timingAttackEnabled: true },
    // PIN-001: HSM always "down" → pin/verify returns fail-open (verified:true even for wrong PIN).
    // Students discover this flaw by testing an invalid PIN block and observing verified:true.
    'PIN-001': { simulateDown: true },
    'PIN-002': {},
    'REPLAY-001': { allowReplay: true },
};

const CONFIG_TTL_SECONDS = 86400;

export class VulnEngine {
    private static redis: Redis | null = null;

    private static readonly memoryConfigs = new Map<string, VulnerabilityConfig>();

    private static readonly memoryActiveChallenge = new Map<string, string>();

    static init(redis: Redis): void {
        this.redis = redis;
    }

    private static configKey(studentId: string, challengeCode: string): string {
        return `ctf:vuln:${studentId}:${challengeCode}:config`;
    }

    private static activeChallengeKey(studentId: string): string {
        return `ctf:vuln:${studentId}:active_challenge`;
    }

    private static async getActiveChallenge(studentId: string): Promise<string | null> {
        if (!studentId) {
            return null;
        }

        if (this.redis) {
            try {
                return await this.redis.get(this.activeChallengeKey(studentId));
            } catch (error: any) {
                logger.warn('[VulnEngine] Redis get active challenge failed, using memory fallback', {
                    studentId,
                    error: error.message,
                });
            }
        }

        return this.memoryActiveChallenge.get(studentId) || null;
    }

    private static parseConfig(raw: string | null): VulnerabilityConfig | null {
        if (!raw) {
            return null;
        }

        try {
            const parsed = JSON.parse(raw) as Partial<VulnerabilityConfig>;
            return {
                ...DEFAULT_CONFIG,
                ...parsed,
            };
        } catch {
            return null;
        }
    }

    static async getStudentConfig(studentId: string, challengeCode?: string): Promise<VulnerabilityConfig> {
        if (!studentId) {
            return { ...DEFAULT_CONFIG };
        }

        const resolvedChallenge = challengeCode || await this.getActiveChallenge(studentId);
        if (!resolvedChallenge) {
            return { ...DEFAULT_CONFIG };
        }

        if (this.redis) {
            try {
                const key = this.configKey(studentId, resolvedChallenge);
                const stored = await this.redis.get(key);
                const parsed = this.parseConfig(stored);
                if (parsed) {
                    return parsed;
                }
            } catch (error: any) {
                logger.warn('[VulnEngine] Redis get student config failed, using memory fallback', {
                    studentId,
                    challengeCode: resolvedChallenge,
                    error: error.message,
                });
            }
        }

        const memoryKey = `${studentId}:${resolvedChallenge}`;
        return this.memoryConfigs.get(memoryKey) || { ...DEFAULT_CONFIG };
    }

    static async initForChallenge(
        studentId: string,
        challengeCode: string,
        overrides: Partial<VulnerabilityConfig> = {},
    ): Promise<void> {
        const defaults = CHALLENGE_DEFAULTS[challengeCode] || {};
        const merged: VulnerabilityConfig = {
            ...DEFAULT_CONFIG,
            ...defaults,
            ...overrides,
        };

        if (this.redis) {
            try {
                await this.redis.set(
                    this.configKey(studentId, challengeCode),
                    JSON.stringify(merged),
                    'EX',
                    CONFIG_TTL_SECONDS,
                );
                await this.redis.set(
                    this.activeChallengeKey(studentId),
                    challengeCode,
                    'EX',
                    CONFIG_TTL_SECONDS,
                );
                logger.info('[VulnEngine] Redis config initialized', { studentId, challengeCode });
                return;
            } catch (error: any) {
                logger.warn('[VulnEngine] Redis init failed, using memory fallback', {
                    studentId,
                    challengeCode,
                    error: error.message,
                });
            }
        }

        const memoryKey = `${studentId}:${challengeCode}`;
        this.memoryConfigs.set(memoryKey, merged);
        this.memoryActiveChallenge.set(studentId, challengeCode);
    }

    static async initStudentForChallenge(
        studentId: string,
        challengeCode: string,
        overrides?: Partial<VulnerabilityConfig>,
    ): Promise<void> {
        await this.initForChallenge(studentId, challengeCode, overrides || {});
    }

    static async updateStudentConfig(
        studentId: string,
        patch: Partial<VulnerabilityConfig>,
        challengeCode?: string,
    ): Promise<void> {
        const resolvedChallenge = challengeCode || await this.getActiveChallenge(studentId);
        if (!resolvedChallenge) {
            return;
        }

        const current = await this.getStudentConfig(studentId, resolvedChallenge);
        const merged = {
            ...current,
            ...patch,
        };

        if (this.redis) {
            try {
                await this.redis.set(
                    this.configKey(studentId, resolvedChallenge),
                    JSON.stringify(merged),
                    'EX',
                    CONFIG_TTL_SECONDS,
                );
                return;
            } catch (error: any) {
                logger.warn('[VulnEngine] Redis patch failed, using memory fallback', {
                    studentId,
                    challengeCode: resolvedChallenge,
                    error: error.message,
                });
            }
        }

        this.memoryConfigs.set(`${studentId}:${resolvedChallenge}`, merged);
    }

    static async resetStudent(studentId: string): Promise<void> {
        if (this.redis) {
            try {
                const activeChallenge = await this.redis.get(this.activeChallengeKey(studentId));
                if (activeChallenge) {
                    await this.redis.del(this.configKey(studentId, activeChallenge));
                }
                await this.redis.del(this.activeChallengeKey(studentId));
            } catch (error: any) {
                logger.warn('[VulnEngine] Redis reset failed, using memory fallback', {
                    studentId,
                    error: error.message,
                });
            }
        }

        this.memoryActiveChallenge.delete(studentId);
        for (const key of this.memoryConfigs.keys()) {
            if (key.startsWith(`${studentId}:`)) {
                this.memoryConfigs.delete(key);
            }
        }
    }

    static generateFlag(studentId: string, challengeCode: string): string | null {
        const base = CHALLENGE_FLAG_BASES[challengeCode];
        if (!base || !studentId) return null;
        const secret = process.env.CTF_FLAG_SECRET || 'pmp_ctf_default_secret_change_in_prod';
        const hmac = crypto.createHmac('sha256', secret)
            .update(`${challengeCode}:${studentId}`)
            .digest('hex')
            .slice(0, 6)
            .toUpperCase();
        return `PMP{${base}_${hmac}}`;
    }

    static async middlewareAsync(req: Request, _res: Response, next: NextFunction): Promise<void> {
        const body = (req.body ?? {}) as Record<string, unknown>;
        const studentId = req.headers['x-student-id'] as string | undefined;
        const challengeCodeFromHeader = (req.headers['x-ctf-challenge-code'] as string | undefined)?.toUpperCase();
        const config = await this.getStudentConfig(studentId || '', challengeCodeFromHeader);

        if (config.keyLeakInLogs) {
            if (body.key || body.keyLabel || body.pinBlock || body.clearKey) {
                const flag = this.generateFlag(studentId || 'anonymous', 'HSM-003');
                logger.warn('[VULN:LEAK] Request contains sensitive material', {
                    path: req.path,
                    body,
                    ...(flag ? { ctf_flag: flag, _ctf: 'HSM-003: cryptographic key logged in clear text' } : {}),
                });
            }
        }

        (req as any).vulnConfig = config;
        (req as any).vulnStudentId = studentId;
        (req as any).vulnChallengeCode = challengeCodeFromHeader || await this.getActiveChallenge(studentId || '');
        next();
    }

    static middleware(req: Request, res: Response, next: NextFunction): void {
        void this.middlewareAsync(req, res, next).catch(next);
    }

    static getConfig(req?: Request): VulnerabilityConfig {
        if (req && (req as any).vulnConfig) {
            return (req as any).vulnConfig as VulnerabilityConfig;
        }
        return { ...DEFAULT_CONFIG };
    }

    static updateConfig(newConfig: Partial<VulnerabilityConfig>): void {
        logger.warn('[VulnEngine] updateConfig() deprecated, use per-student async methods', { newConfig });
    }
}
