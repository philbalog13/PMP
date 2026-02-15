import { Response } from 'express';
import { db } from '../config/database';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { UserRole } from '../middleware/roles';
import { logger } from '../utils/logger';
import { vulnStateService } from '../services/vulnState.service';

export const getDefenseStatus = async (req: AuthenticatedRequest, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ success: false, error: 'Authentication required' });
        }
        if (req.user.role !== UserRole.ETUDIANT) {
            return res.status(403).json({ success: false, error: 'Student role required' });
        }

        const states = await vulnStateService.getVulnStates(req.user.userId);

        const total = states.length;
        const fixed = states.filter((state) => !state.isVulnerable).length;
        const exploited = states.filter((state) => state.exploitedAt !== null).length;
        const progress = total > 0 ? Math.round((fixed / total) * 100) : 0;

        const vulnerabilities = states.reduce<Record<string, boolean>>((acc, state) => {
            acc[state.vulnCode] = state.isVulnerable;
            return acc;
        }, {});

        const stateByVuln = states.reduce<Record<string, { exploitedAt: string | null; fixedAt: string | null; defenseUnlocked: boolean; isVulnerable: boolean }>>((acc, state) => {
            acc[state.vulnCode] = {
                exploitedAt: state.exploitedAt,
                fixedAt: state.fixedAt,
                defenseUnlocked: state.defenseUnlocked,
                isVulnerable: state.isVulnerable
            };
            return acc;
        }, {});

        res.json({
            success: true,
            status: {
                total,
                fixed,
                exploited,
                progress,
                vulnerabilities,
                states: stateByVuln
            }
        });
    } catch (error) {
        logger.error('Error getting defense status', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
};

export const getVulnCatalog = async (req: AuthenticatedRequest, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ success: false, error: 'Authentication required' });
        }
        if (req.user.role !== UserRole.ETUDIANT) {
            return res.status(403).json({ success: false, error: 'Student role required' });
        }

        const result = await db.query(
            `SELECT
                c.vuln_code,
                c.title,
                c.description,
                c.severity,
                c.bloc_number,
                c.module_number,
                c.attack_type,
                c.defense_hint,
                c.points,
                q.question,
                q.options,
                s.is_vulnerable,
                s.exploited_at,
                s.fixed_at
             FROM learning.vuln_catalog c
             LEFT JOIN learning.defense_quizzes q ON c.vuln_code = q.vuln_code
             LEFT JOIN learning.student_vuln_state s
               ON s.vuln_code = c.vuln_code
              AND s.student_id = $1
             ORDER BY c.bloc_number ASC, c.module_number ASC, c.vuln_code ASC`,
            [req.user.userId]
        );

        const catalog = result.rows.map((row) => {
            let options: string[] = [];
            if (Array.isArray(row.options)) {
                options = row.options;
            } else if (typeof row.options === 'string') {
                try {
                    const parsed = JSON.parse(row.options);
                    options = Array.isArray(parsed) ? parsed : [];
                } catch (_error) {
                    options = [];
                }
            }

            return {
                vuln_code: row.vuln_code,
                title: row.title,
                description: row.description,
                severity: row.severity,
                bloc_number: row.bloc_number,
                module_number: row.module_number,
                attack_type: row.attack_type,
                defense_hint: row.defense_hint,
                points: row.points,
                question: row.question,
                options,
                is_vulnerable: row.is_vulnerable !== false,
                exploited_at: row.exploited_at,
                fixed_at: row.fixed_at,
                defense_unlocked: row.exploited_at !== null
            };
        });

        res.json({ success: true, catalog });
    } catch (error) {
        logger.error('Error getting vuln catalog', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
};

export const submitFlag = async (req: AuthenticatedRequest, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ success: false, error: 'Authentication required' });
        }
        if (req.user.role !== UserRole.ETUDIANT) {
            return res.status(403).json({ success: false, error: 'Student role required' });
        }

        const vulnCode = String(req.body?.vulnCode || '').trim();
        const flag = String(req.body?.flag || '').trim();

        if (!vulnCode || !flag) {
            return res.status(400).json({ success: false, error: 'Missing vulnCode or flag' });
        }

        const result = await vulnStateService.submitFlag(req.user.userId, vulnCode, flag);

        if (!result.correct) {
            return res.status(400).json({
                success: false,
                error: 'Invalid flag',
                result
            });
        }

        res.json({ success: true, result });
    } catch (error) {
        logger.error('Error submitting flag', error);
        res.status(400).json({ success: false, error: (error as Error).message });
    }
};

export const submitDefenseFix = async (req: AuthenticatedRequest, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ success: false, error: 'Authentication required' });
        }
        if (req.user.role !== UserRole.ETUDIANT) {
            return res.status(403).json({ success: false, error: 'Student role required' });
        }

        const vulnCode = String(req.body?.vulnCode || '').trim();
        const selectedOptionIndex = Number(req.body?.selectedOptionIndex);

        if (!vulnCode || !Number.isInteger(selectedOptionIndex)) {
            return res.status(400).json({ success: false, error: 'Missing vulnCode or selectedOptionIndex' });
        }

        const result = await vulnStateService.submitDefenseQuiz(
            req.user.userId,
            vulnCode,
            selectedOptionIndex
        );

        if (result.locked) {
            return res.status(423).json({
                success: false,
                error: 'Defense quiz is locked. Submit flag first.',
                correction: result
            });
        }

        res.json({
            success: true,
            correction: result
        });
    } catch (error) {
        logger.error('Error submitting defense fix', error);
        res.status(400).json({ success: false, error: (error as Error).message });
    }
};

export const resetDefenseState = async (req: AuthenticatedRequest, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ success: false, error: 'Authentication required' });
        }
        if (req.user.role !== UserRole.ETUDIANT) {
            return res.status(403).json({ success: false, error: 'Student role required' });
        }

        const rawVulnCode = req.body?.vulnCode;
        const vulnCode = rawVulnCode === undefined || rawVulnCode === null
            ? undefined
            : String(rawVulnCode).trim();

        const result = await vulnStateService.resetVulnState(req.user.userId, vulnCode);

        res.json({ success: true, result });
    } catch (error) {
        logger.error('Error resetting defense state', error);
        res.status(400).json({ success: false, error: (error as Error).message });
    }
};

/**
 * Probe helper (training sandbox):
 * Exposes the configured flag for a vulnerability ONLY if it is currently vulnerable
 * for the requesting student profile. Does not unlock defense by itself (student must submit the flag).
 */
export const probeFlag = async (req: AuthenticatedRequest, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ success: false, error: 'Authentication required' });
        }
        if (req.user.role !== UserRole.ETUDIANT) {
            return res.status(403).json({ success: false, error: 'Student role required' });
        }

        const vulnCode = String(req.body?.vulnCode || '').trim().toUpperCase();
        if (!vulnCode) {
            return res.status(400).json({ success: false, error: 'Missing vulnCode' });
        }

        const expectedFlag = await vulnStateService.getFlagValue(vulnCode);
        if (expectedFlag === null) {
            return res.status(404).json({ success: false, error: 'Unknown vulnerability code' });
        }
        if (!expectedFlag) {
            return res.status(500).json({ success: false, error: 'Flag is not configured for this vulnerability' });
        }

        // Prefer middleware-injected profile, but fallback to DB if missing.
        let isVulnerable: boolean | undefined;
        if (req.vulnProfile && typeof req.vulnProfile[vulnCode] === 'boolean') {
            isVulnerable = req.vulnProfile[vulnCode];
        } else {
            const profile = await vulnStateService.getVulnProfile(req.user.userId);
            isVulnerable = profile[vulnCode];
        }

        if (isVulnerable === false) {
            return res.status(409).json({
                success: false,
                error: 'Vulnerability is fixed for your profile. Reset it to re-run the lab.',
                code: 'VULN_FIXED'
            });
        }

        res.setHeader('X-Defense-Vuln', vulnCode);
        res.setHeader('X-Defense-Flag', expectedFlag);

        res.json({
            success: true,
            probe: {
                vulnCode,
                isVulnerable: true,
                flag: expectedFlag,
                flagInHeader: true,
                message: 'Flag exposed for training sandbox. Submit it to unlock defense.'
            }
        });
    } catch (error) {
        logger.error('Error probing defense flag', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
};
