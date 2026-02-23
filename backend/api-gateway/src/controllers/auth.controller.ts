import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { query } from '../config/database';
import { generateToken } from '../middleware/auth.middleware';
import { logger } from '../utils/logger';
import { config } from '../config';
import { passwordValidator } from '../services/passwordValidator.service';
import { accountLockout } from '../services/accountLockout.service';
import { tokenBlacklist } from '../services/tokenBlacklist.service';
import { refreshTokenService } from '../services/refreshToken.service';
import { validate2FACode } from './twofa.controller';
import { provisionFinancialAccountForUser } from '../services/bankingProvisioning.service';
import { UserRole } from '../middleware/roles';

/**
 * Login user
 */
/**
 * Login user
 */
export const login = async (req: Request, res: Response) => {
    const { email, password, code2fa } = req.body;

    if (!email || !password) {
        res.status(400).json({ success: false, error: 'Email and password are required' });
        return;
    }

    try {
        // Find user
        const result = await query('SELECT * FROM users.users WHERE email = $1', [email]);

        if ((result.rowCount ?? 0) === 0) {
            res.status(401).json({ success: false, error: 'Invalid credentials' });
            return;
        }

        const user = result.rows[0];

        // SECURITY: Check if account is locked
        const lockStatus = await accountLockout.isAccountLocked(user.id);
        if (lockStatus.locked) {
            res.status(423).json({
                success: false,
                error: 'Account locked due to too many failed login attempts',
                code: 'ACCOUNT_LOCKED',
                lockedUntil: lockStatus.lockedUntil,
                message: `Account will be unlocked at ${lockStatus.lockedUntil?.toISOString()}`
            });
            return;
        }

        // Verify password
        const passwordMatch = await bcrypt.compare(password, user.password_hash);

        if (!passwordMatch) {
            // SECURITY: Record failed attempt
            await accountLockout.recordFailedLogin(user.id);

            const status = await accountLockout.getLockoutStatus(user.id);
            res.status(401).json({
                success: false,
                error: 'Invalid credentials',
                code: 'AUTH_INVALID_CREDENTIALS',
                remainingAttempts: status.remainingAttempts
            });
            return;
        }

        if (user.status !== 'ACTIVE' && user.status !== 'LOCKED') {
            res.status(403).json({ success: false, error: 'Account is not active', code: 'ACCOUNT_INACTIVE' });
            return;
        }

        // SECURITY: Reset failed attempts on successful login
        await accountLockout.resetFailedAttempts(user.id);

        // SECURITY: Check if 2FA is enabled for this user
        if (user.totp_enabled) {
            if (!code2fa) {
                res.status(403).json({
                    success: false,
                    error: '2FA code required',
                    code: 'AUTH_2FA_REQUIRED',
                    message: 'This account has 2FA enabled. Please provide TOTP code.'
                });
                return;
            }

            // Validate TOTP code using real 2FA
            const isValid2FA = await validate2FACode(user.id, code2fa);
            if (!isValid2FA) {
                logger.warn('Invalid 2FA code attempt', { userId: user.id, email: user.email });
                res.status(403).json({
                    success: false,
                    error: 'Invalid 2FA code',
                    code: 'AUTH_2FA_INVALID',
                    message: 'The TOTP code is incorrect or has expired'
                });
                return;
            }

            logger.info('2FA validation successful', { userId: user.id });
        }

        // SECURITY FIX: Certificate validation removed
        // The previous implementation was a stub (startsWith('SIMULATED_CERT_'))
        // which provided no real security. Removed to reduce attack surface.

        // SECURITY: Short-lived access tokens (15 minutes) with refresh token rotation
        const accessTokenExpiresIn = '15m';

        // Generate short-lived JWT access token
        const accessToken = generateToken(user.id, user.role, accessTokenExpiresIn);

        // Generate long-lived refresh token (30 days)
        const userAgent = req.headers['user-agent'];
        const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.ip;
        const refreshToken = await refreshTokenService.createRefreshToken(user.id, userAgent, ipAddress);

        res.json({
            success: true,
            accessToken,
            refreshToken,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                firstName: user.first_name,
                lastName: user.last_name,
                role: user.role
            },
            expiresIn: accessTokenExpiresIn,
            tokenType: 'Bearer'
        });

    } catch (error: any) {
        logger.error('Login error', { error: error.message });
        res.status(500).json({ success: false, error: 'Login failed' });
    }
};

/**
 * Logout (Server-side token revocation)
 * SECURITY: Now actually revokes token using Redis blacklist
 */
export const logout = async (req: Request, res: Response) => {
    try {
        // Extract token from Authorization header
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(400).json({
                success: false,
                error: 'No token provided',
                code: 'LOGOUT_NO_TOKEN'
            });
            return;
        }

        const token = authHeader.split(' ')[1];

        // Decode token to get expiration time (without verification since we're revoking anyway)
        const decoded = jwt.decode(token) as any;

        if (!decoded || !decoded.exp) {
            res.status(400).json({
                success: false,
                error: 'Invalid token format',
                code: 'LOGOUT_INVALID_TOKEN'
            });
            return;
        }

        // Calculate remaining TTL for token
        const now = Math.floor(Date.now() / 1000);
        const expiresInSeconds = decoded.exp - now;

        // Only blacklist if token hasn't expired yet
        if (expiresInSeconds > 0) {
            await tokenBlacklist.blacklistToken(token, expiresInSeconds);
            logger.info('Token revoked', { userId: decoded.userId });
        }

        res.json({
            success: true,
            message: 'Logged out successfully. Token has been revoked.'
        });
    } catch (error: any) {
        logger.error('Logout error', { error: error.message });
        res.status(500).json({
            success: false,
            error: 'Logout failed'
        });
    }
};

/**
 * Register user
 */
export const register = async (req: Request, res: Response) => {
    const { username, email, password, firstName, lastName, role } = req.body;

    if (!username || !email || !password) {
        res.status(400).json({ success: false, error: 'Missing required fields' });
        return;
    }

    const validRoles = [
        UserRole.CLIENT,
        UserRole.MARCHAND,
        UserRole.ETUDIANT,
        UserRole.FORMATEUR
    ];
    const normalizedRole = validRoles.includes(role) ? role : UserRole.ETUDIANT;

    // SECURITY: Validate password strength
    const passwordValidation = passwordValidator.validate(password);
    if (!passwordValidation.valid) {
        res.status(400).json({
            success: false,
            error: 'Password does not meet security requirements',
            code: 'PASSWORD_TOO_WEAK',
            details: {
                errors: passwordValidation.errors,
                suggestions: passwordValidation.suggestions,
                score: passwordValidation.score
            }
        });
        return;
    }

    try {
        // Check if user exists
        const check = await query('SELECT 1 FROM users.users WHERE email = $1 OR username = $2', [email, username]);

        if ((check.rowCount ?? 0) > 0) {
            res.status(409).json({ success: false, error: 'User already exists' });
            return;
        }

        // Hash password with strong salt rounds
        // SECURITY: Increased from 10 to 12 rounds for better protection
        const salt = await bcrypt.genSalt(config.bcrypt.saltRounds);
        const passwordHash = await bcrypt.hash(password, salt);

        // Create user
        const result = await query(
            `INSERT INTO users.users (username, email, password_hash, first_name, last_name, role, status)
            VALUES ($1, $2, $3, $4, $5, $6, 'ACTIVE')
            RETURNING id, username, email, first_name, last_name, role, status, created_at`,
            [username, email, passwordHash, firstName, lastName, normalizedRole]
        );

        const user = result.rows[0];

        try {
            const displayName = (user.first_name && user.last_name)
                ? `${user.first_name} ${user.last_name}`
                : user.username;
            await provisionFinancialAccountForUser(user.id, user.role, displayName);
        } catch (provisionError: any) {
            await query(`DELETE FROM users.users WHERE id = $1`, [user.id]);
            throw provisionError;
        }

        const token = generateToken(user.id, user.role);

        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            token,
            user
        });

    } catch (error: any) {
        console.error('Registration CRITICAL error:', error);
        logger.error('Registration error', { error: error.message });
        res.status(500).json({ success: false, error: 'Registration failed: ' + error.message });
    }
};

/**
 * Refresh access token using refresh token
 * SECURITY: Implements token rotation - old refresh token is revoked
 */
export const refreshAccessToken = async (req: Request, res: Response) => {
    const { refreshToken } = req.body;

    try {
        if (!refreshToken) {
            res.status(400).json({
                success: false,
                error: 'Refresh token is required',
                code: 'REFRESH_TOKEN_MISSING'
            });
            return;
        }

        // Validate refresh token
        const tokenData = await refreshTokenService.validateRefreshToken(refreshToken);

        if (!tokenData) {
            res.status(401).json({
                success: false,
                error: 'Invalid or expired refresh token',
                code: 'REFRESH_TOKEN_INVALID'
            });
            return;
        }

        // Get user data
        const userResult = await query('SELECT id, role, email, username, first_name, last_name FROM users.users WHERE id = $1', [tokenData.userId]);

        if (userResult.rowCount === 0) {
            res.status(404).json({
                success: false,
                error: 'User not found',
                code: 'REFRESH_USER_NOT_FOUND'
            });
            return;
        }

        const user = userResult.rows[0];

        // Generate new short-lived access token
        const accessToken = generateToken(user.id, user.role, '15m');

        // Rotate refresh token (revoke old, create new)
        const userAgent = req.headers['user-agent'];
        const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.ip;
        const newRefreshToken = await refreshTokenService.rotateRefreshToken(refreshToken, userAgent, ipAddress);

        if (!newRefreshToken) {
            res.status(500).json({
                success: false,
                error: 'Failed to rotate refresh token',
                code: 'REFRESH_ROTATION_FAILED'
            });
            return;
        }

        logger.info('Access token refreshed', { userId: user.id });

        res.json({
            success: true,
            accessToken,
            refreshToken: newRefreshToken,
            expiresIn: '15m',
            tokenType: 'Bearer',
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                firstName: user.first_name,
                lastName: user.last_name,
                role: user.role
            }
        });

    } catch (error: any) {
        logger.error('Token refresh error', { error: error.message });
        res.status(500).json({
            success: false,
            error: 'Token refresh failed',
            code: 'REFRESH_ERROR'
        });
    }
};

/**
 * GET /api/users/me
 * Retourne le profil de l'utilisateur connecté avec ses préférences pédagogiques.
 */
export const getMe = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.userId;
        if (!userId) {
            res.status(401).json({ success: false, error: 'Unauthorized' });
            return;
        }

        const result = await query(
            `SELECT id, username, email, first_name, last_name, role, status,
                    COALESCE(preferences, '{}'::jsonb) AS preferences
             FROM users.users WHERE id = $1`,
            [userId]
        );

        if ((result.rowCount ?? 0) === 0) {
            res.status(404).json({ success: false, error: 'User not found' });
            return;
        }

        const user = result.rows[0];
        const prefs = (user.preferences || {}) as Record<string, unknown>;

        res.json({
            success: true,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                firstName: user.first_name,
                lastName: user.last_name,
                role: user.role,
                onboardingDone: Boolean(prefs.onboarding_done),
                learnerLevel: (prefs.learner_level as string) || null,
                objective: (prefs.objective as string) || null,
            },
        });
    } catch (error: any) {
        logger.error('getMe error', { error: error.message });
        res.status(500).json({ success: false, error: 'Failed to fetch user profile' });
    }
};

/**
 * POST /api/users/me/preferences
 * Sauvegarde les préférences pédagogiques (niveau, objectif, onboarding_done).
 */
export const savePreferences = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.userId;
        if (!userId) {
            res.status(401).json({ success: false, error: 'Unauthorized' });
            return;
        }

        const { learnerLevel, objective, onboardingDone } = req.body as Record<string, unknown>;

        const validLevels = ['NOVICE', 'INTERMEDIATE', 'ADVANCED'];
        const validObjectives = ['CERTIFICATION_PCI', 'RED_TEAM', 'BUSINESS_UNDERSTANDING', 'FINTECH_CAREER'];

        const patch: Record<string, unknown> = {};
        if (typeof learnerLevel === 'string' && validLevels.includes(learnerLevel)) {
            patch.learner_level = learnerLevel;
        }
        if (typeof objective === 'string' && validObjectives.includes(objective)) {
            patch.objective = objective;
        }
        if (onboardingDone === true) {
            patch.onboarding_done = true;
        }

        if (Object.keys(patch).length > 0) {
            await query(
                `UPDATE users.users
                 SET preferences = COALESCE(preferences, '{}'::jsonb) || $1::jsonb
                 WHERE id = $2`,
                [JSON.stringify(patch), userId]
            );
        }

        res.json({ success: true, message: 'Preferences saved' });
    } catch (error: any) {
        logger.error('savePreferences error', { error: error.message });
        res.status(500).json({ success: false, error: 'Failed to save preferences' });
    }
};
