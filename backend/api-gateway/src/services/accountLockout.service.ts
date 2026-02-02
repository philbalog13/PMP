/**
 * Account Lockout Service
 * Prevents brute force attacks by locking accounts after failed login attempts
 */
import { query } from '../config/database';
import { logger } from '../utils/logger';

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MINUTES = 30;

class AccountLockoutService {
    /**
     * Record a failed login attempt
     */
    async recordFailedLogin(userId: string): Promise<void> {
        await query(
            `UPDATE users.users
            SET failed_login_attempts = failed_login_attempts + 1,
                last_failed_login = NOW()
            WHERE id = $1`,
            [userId]
        );

        // Check if lockout should be applied
        const result = await query(
            'SELECT failed_login_attempts, username FROM users.users WHERE id = $1',
            [userId]
        );

        const attempts = result.rows[0]?.failed_login_attempts || 0;

        if (attempts >= MAX_FAILED_ATTEMPTS) {
            await this.lockAccount(userId);
            logger.warn('Account locked due to excessive failed attempts', {
                userId,
                username: result.rows[0]?.username,
                attempts
            });
        }
    }

    /**
     * Lock an account
     */
    async lockAccount(userId: string): Promise<void> {
        const lockedUntil = new Date(Date.now() + LOCKOUT_DURATION_MINUTES * 60 * 1000);

        await query(
            `UPDATE users.users
            SET locked_until = $1,
                status = 'LOCKED'
            WHERE id = $2`,
            [lockedUntil, userId]
        );

        logger.warn('Account locked', { userId, lockedUntil });
    }

    /**
     * Check if account is currently locked
     */
    async isAccountLocked(userId: string): Promise<{ locked: boolean; lockedUntil?: Date }> {
        const result = await query(
            `SELECT locked_until FROM users.users WHERE id = $1`,
            [userId]
        );

        const lockedUntil = result.rows[0]?.locked_until;

        if (!lockedUntil) {
            return { locked: false };
        }

        const now = new Date();
        const lockExpiry = new Date(lockedUntil);

        // Check if lockout period has expired
        if (lockExpiry > now) {
            return { locked: true, lockedUntil: lockExpiry };
        }

        // Lockout expired, automatically unlock
        await this.unlockAccount(userId);
        return { locked: false };
    }

    /**
     * Unlock an account
     */
    async unlockAccount(userId: string): Promise<void> {
        await query(
            `UPDATE users.users
            SET locked_until = NULL,
                failed_login_attempts = 0,
                status = 'ACTIVE'
            WHERE id = $1`,
            [userId]
        );

        logger.info('Account unlocked', { userId });
    }

    /**
     * Reset failed login attempts (called on successful login)
     */
    async resetFailedAttempts(userId: string): Promise<void> {
        await query(
            `UPDATE users.users
            SET failed_login_attempts = 0,
                last_failed_login = NULL
            WHERE id = $1`,
            [userId]
        );
    }

    /**
     * Get lockout status for user
     */
    async getLockoutStatus(userId: string): Promise<{
        failedAttempts: number;
        lastFailedLogin: Date | null;
        lockedUntil: Date | null;
        remainingAttempts: number;
    }> {
        const result = await query(
            `SELECT failed_login_attempts, last_failed_login, locked_until
            FROM users.users WHERE id = $1`,
            [userId]
        );

        const row = result.rows[0];

        return {
            failedAttempts: row?.failed_login_attempts || 0,
            lastFailedLogin: row?.last_failed_login || null,
            lockedUntil: row?.locked_until || null,
            remainingAttempts: Math.max(0, MAX_FAILED_ATTEMPTS - (row?.failed_login_attempts || 0))
        };
    }
}

export const accountLockout = new AccountLockoutService();
export { MAX_FAILED_ATTEMPTS, LOCKOUT_DURATION_MINUTES };
