/**
 * ctfVuln.service.ts
 * -----------------------------------------------------------------
 * Gateway-side service that initialises per-student HSM vulnerability
 * configs when a student starts a CTF challenge.
 *
 * The VulnEngine lives in hsm-simulator and is protected by an
 * internal secret (INTERNAL_HSM_SECRET).  Students NEVER call these
 * endpoints directly — only the API Gateway does.
 */

import axios from 'axios';
import { config } from '../config';
import { logger } from '../utils/logger';

/** Subset of VulnerabilityConfig fields that challenges can pre-set. */
export type VulnConfigOverrides = Record<string, boolean>;

/**
 * Tell the HSM Simulator to initialise a student's vuln config for
 * the given challenge.  The HSM uses its own CHALLENGE_DEFAULTS merged
 * with any `overrides` supplied here (from the seed's initialVulnConfig).
 *
 * This is fire-and-forget (best-effort).  A failure does NOT abort the
 * challenge start — the HSM will fall back to its DEFAULT_CONFIG.
 */
export async function initStudentVulnForChallenge(
    studentId: string,
    challengeCode: string,
    overrides?: VulnConfigOverrides,
): Promise<void> {
    const hsmUrl = config.services.hsmSimulator;
    const secret = process.env.INTERNAL_HSM_SECRET;

    if (!secret) {
        logger.warn('[ctfVuln] INTERNAL_HSM_SECRET not set — skipping VulnEngine init', { studentId, challengeCode });
        return;
    }

    try {
        await axios.post(
            `${hsmUrl}/hsm/admin/init-challenge`,
            { studentId, challengeCode, overrides: overrides ?? {} },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'x-internal-secret': secret,
                },
                timeout: 3000,
            },
        );
        logger.info('[ctfVuln] VulnEngine initialised', { studentId, challengeCode, overrides });
    } catch (err: any) {
        // Non-fatal: log and continue — default HSM config will be used
        logger.error('[ctfVuln] Failed to init VulnEngine for student (non-fatal)', {
            studentId,
            challengeCode,
            error: err?.message,
        });
    }
}

/**
 * Reset a student's HSM vuln config (called on challenge reset from
 * the instructor console).
 */
export async function resetStudentVuln(studentId: string): Promise<void> {
    const hsmUrl = config.services.hsmSimulator;
    const secret = process.env.INTERNAL_HSM_SECRET;

    if (!secret) return;

    try {
        await axios.delete(
            `${hsmUrl}/hsm/admin/student-config/${encodeURIComponent(studentId)}`,
            {
                headers: { 'x-internal-secret': secret },
                timeout: 3000,
            },
        );
        logger.info('[ctfVuln] VulnEngine reset', { studentId });
    } catch (err: any) {
        logger.error('[ctfVuln] Failed to reset VulnEngine for student (non-fatal)', {
            studentId,
            error: err?.message,
        });
    }
}
