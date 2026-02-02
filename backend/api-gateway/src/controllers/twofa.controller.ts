/**
 * Two-Factor Authentication (2FA) Controller
 * Implements TOTP (Time-based One-Time Password) using speakeasy
 */
import { Response } from 'express';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { query } from '../config/database';
import { logger } from '../utils/logger';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

/**
 * Setup 2FA for authenticated user
 * Generates TOTP secret and QR code
 */
export const setup2FA = async (req: AuthenticatedRequest, res: Response) => {
    try {
        if (!req.user?.userId) {
            res.status(401).json({
                success: false,
                error: 'Authentication required',
                code: '2FA_AUTH_REQUIRED'
            });
            return;
        }

        const userId = req.user.userId;

        // Get user info
        const userResult = await query('SELECT email, username, totp_enabled FROM users.users WHERE id = $1', [userId]);

        if (userResult.rowCount === 0) {
            res.status(404).json({
                success: false,
                error: 'User not found',
                code: '2FA_USER_NOT_FOUND'
            });
            return;
        }

        const user = userResult.rows[0];

        // Check if 2FA already enabled
        if (user.totp_enabled) {
            res.status(400).json({
                success: false,
                error: '2FA is already enabled for this account',
                code: '2FA_ALREADY_ENABLED',
                message: 'Use disable endpoint first if you want to reset 2FA'
            });
            return;
        }

        // Generate TOTP secret
        const secret = speakeasy.generateSecret({
            name: `PMP (${user.email})`,
            issuer: 'Payment Platform',
            length: 32
        });

        // Generate QR code
        const qrCodeDataUrl = await QRCode.toDataURL(secret.otpauth_url!);

        // Store secret in database (NOT enabled yet - requires verification)
        await query(
            'UPDATE users.users SET totp_secret = $1 WHERE id = $2',
            [secret.base32, userId]
        );

        logger.info('2FA setup initiated', { userId, email: user.email });

        res.json({
            success: true,
            message: 'Scan QR code with your authenticator app',
            secret: secret.base32,
            qrCode: qrCodeDataUrl,
            manualEntryCode: secret.base32,
            instructions: {
                step1: 'Install an authenticator app (Google Authenticator, Authy, etc.)',
                step2: 'Scan the QR code OR enter the manual code',
                step3: 'Call /api/auth/2fa/verify with a code from your app to enable 2FA'
            }
        });

    } catch (error: any) {
        logger.error('2FA setup error', { error: error.message });
        res.status(500).json({
            success: false,
            error: '2FA setup failed',
            code: '2FA_SETUP_ERROR'
        });
    }
};

/**
 * Verify and enable 2FA
 * Validates TOTP code and activates 2FA for user
 */
export const verify2FA = async (req: AuthenticatedRequest, res: Response) => {
    const { code } = req.body;

    try {
        if (!req.user?.userId) {
            res.status(401).json({
                success: false,
                error: 'Authentication required',
                code: '2FA_AUTH_REQUIRED'
            });
            return;
        }

        if (!code) {
            res.status(400).json({
                success: false,
                error: 'TOTP code is required',
                code: '2FA_CODE_MISSING'
            });
            return;
        }

        const userId = req.user.userId;

        // Get user's TOTP secret
        const userResult = await query('SELECT totp_secret, totp_enabled FROM users.users WHERE id = $1', [userId]);

        if (userResult.rowCount === 0) {
            res.status(404).json({
                success: false,
                error: 'User not found',
                code: '2FA_USER_NOT_FOUND'
            });
            return;
        }

        const user = userResult.rows[0];

        if (!user.totp_secret) {
            res.status(400).json({
                success: false,
                error: 'No 2FA setup found. Call /api/auth/2fa/setup first',
                code: '2FA_NOT_SETUP'
            });
            return;
        }

        // Verify TOTP code
        const verified = speakeasy.totp.verify({
            secret: user.totp_secret,
            encoding: 'base32',
            token: code,
            window: 2 // Allow 2 time steps before/after (compensate for clock skew)
        });

        if (!verified) {
            logger.warn('Invalid 2FA code attempt', { userId });
            res.status(400).json({
                success: false,
                error: 'Invalid TOTP code',
                code: '2FA_CODE_INVALID',
                message: 'Code is incorrect or has expired. Codes change every 30 seconds.'
            });
            return;
        }

        // Enable 2FA
        await query(
            'UPDATE users.users SET totp_enabled = TRUE, totp_enabled_at = NOW() WHERE id = $1',
            [userId]
        );

        logger.info('2FA enabled successfully', { userId });

        res.json({
            success: true,
            message: '2FA has been successfully enabled',
            enabled: true
        });

    } catch (error: any) {
        logger.error('2FA verification error', { error: error.message });
        res.status(500).json({
            success: false,
            error: '2FA verification failed',
            code: '2FA_VERIFY_ERROR'
        });
    }
};

/**
 * Validate TOTP code during login
 * Used by login endpoint to verify 2FA
 */
export const validate2FACode = async (userId: string, code: string): Promise<boolean> => {
    try {
        // Get user's TOTP secret
        const userResult = await query('SELECT totp_secret, totp_enabled FROM users.users WHERE id = $1', [userId]);

        if (userResult.rowCount === 0 || !userResult.rows[0].totp_enabled) {
            return false;
        }

        const user = userResult.rows[0];

        // Verify TOTP code
        const verified = speakeasy.totp.verify({
            secret: user.totp_secret,
            encoding: 'base32',
            token: code,
            window: 2
        });

        return verified;
    } catch (error: any) {
        logger.error('2FA validation error', { error: error.message });
        return false;
    }
};

/**
 * Disable 2FA for authenticated user
 * Requires password confirmation
 */
export const disable2FA = async (req: AuthenticatedRequest, res: Response) => {
    const { password } = req.body;

    try {
        if (!req.user?.userId) {
            res.status(401).json({
                success: false,
                error: 'Authentication required',
                code: '2FA_AUTH_REQUIRED'
            });
            return;
        }

        if (!password) {
            res.status(400).json({
                success: false,
                error: 'Password confirmation required to disable 2FA',
                code: '2FA_PASSWORD_REQUIRED'
            });
            return;
        }

        const userId = req.user.userId;

        // Get user with password hash
        const userResult = await query('SELECT password_hash, totp_enabled FROM users.users WHERE id = $1', [userId]);

        if (userResult.rowCount === 0) {
            res.status(404).json({
                success: false,
                error: 'User not found',
                code: '2FA_USER_NOT_FOUND'
            });
            return;
        }

        const user = userResult.rows[0];

        // Verify password
        const bcrypt = require('bcrypt');
        const passwordMatch = await bcrypt.compare(password, user.password_hash);

        if (!passwordMatch) {
            res.status(401).json({
                success: false,
                error: 'Invalid password',
                code: '2FA_INVALID_PASSWORD'
            });
            return;
        }

        if (!user.totp_enabled) {
            res.status(400).json({
                success: false,
                error: '2FA is not enabled',
                code: '2FA_NOT_ENABLED'
            });
            return;
        }

        // Disable 2FA
        await query(
            'UPDATE users.users SET totp_enabled = FALSE, totp_secret = NULL, totp_enabled_at = NULL WHERE id = $1',
            [userId]
        );

        logger.info('2FA disabled', { userId });

        res.json({
            success: true,
            message: '2FA has been disabled',
            enabled: false
        });

    } catch (error: any) {
        logger.error('2FA disable error', { error: error.message });
        res.status(500).json({
            success: false,
            error: '2FA disable failed',
            code: '2FA_DISABLE_ERROR'
        });
    }
};

/**
 * Get 2FA status for authenticated user
 */
export const get2FAStatus = async (req: AuthenticatedRequest, res: Response) => {
    try {
        if (!req.user?.userId) {
            res.status(401).json({
                success: false,
                error: 'Authentication required',
                code: '2FA_AUTH_REQUIRED'
            });
            return;
        }

        const userId = req.user.userId;

        // Get user's 2FA status
        const userResult = await query(
            'SELECT totp_enabled, totp_enabled_at FROM users.users WHERE id = $1',
            [userId]
        );

        if (userResult.rowCount === 0) {
            res.status(404).json({
                success: false,
                error: 'User not found',
                code: '2FA_USER_NOT_FOUND'
            });
            return;
        }

        const user = userResult.rows[0];

        res.json({
            success: true,
            enabled: user.totp_enabled || false,
            enabledAt: user.totp_enabled_at
        });

    } catch (error: any) {
        logger.error('2FA status error', { error: error.message });
        res.status(500).json({
            success: false,
            error: 'Failed to get 2FA status',
            code: '2FA_STATUS_ERROR'
        });
    }
};
