import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth.middleware';
import { UserRole } from './roles';
import { vulnStateService } from '../services/vulnState.service';
import { logger } from '../utils/logger';

/**
 * Middleware to inject vulnerability profile into request
 * Only applies to ROLE_ETUDIANT
 */
export const vulnStateMiddleware = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    // 1. Check if user is authenticated and is a student
    if (!req.user || req.user.role !== UserRole.ETUDIANT) {
        return next();
    }

    try {
        // 2. Load vulnerability flags
        const profile = await vulnStateService.getVulnProfile(req.user.userId);

        // 3. Inject into request
        req.vulnProfile = profile;

        // Log for debugging (optional, can be noisy)
        // logger.debug('Vuln profile loaded', { userId: req.user.userId, activeVulns: Object.keys(profile).filter(k => profile[k]).length });

        next();
    } catch (error) {
        logger.error('Failed to load vuln profile', error);
        // Fail open or closed? 
        // Failing open means "secure" by default if DB fails, which might break the "vulnerable by default" requirement.
        // Failing closed (500) prevents access.
        // Let's log and proceed without profile (secure fallback) to avoid blocking the user entirely.
        next();
    }
};
