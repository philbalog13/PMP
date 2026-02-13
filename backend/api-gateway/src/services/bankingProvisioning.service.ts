import { query } from '../config/database';
import { logger } from '../utils/logger';
import { UserRole } from '../middleware/roles';
import { ensureAutoIssuedClientCard } from './clientCardProvisioning.service';

const BANKED_ROLES = new Set<string>([
    UserRole.CLIENT,
    UserRole.MARCHAND
]);

const isMissingBankingSchemaError = (error: any): boolean => {
    const code = error?.code;
    return code === '3F000' || code === '42P01' || code === '42883' || code === '42703';
};

/**
 * Provision financial accounts for roles that require banking data.
 * - ROLE_CLIENT: creates client bank account + IBAN
 * - ROLE_MARCHAND: ensures merchant settlement account + IBAN
 */
export const provisionFinancialAccountForUser = async (
    userId: string,
    role: string
): Promise<void> => {
    if (!BANKED_ROLES.has(role)) {
        return;
    }

    try {
        if (role === UserRole.CLIENT) {
            await query(`SELECT client.ensure_bank_account_exists($1)`, [userId]);
            await ensureAutoIssuedClientCard(userId);
            return;
        }

        if (role === UserRole.MARCHAND) {
            await query(`SELECT merchant.ensure_account_iban($1)`, [userId]);
        }
    } catch (error: any) {
        if (isMissingBankingSchemaError(error)) {
            logger.error('Banking schema is missing. Migration 007 must be applied.', {
                userId,
                role,
                code: error?.code,
                error: error?.message
            });

            throw new Error('Banking/card schema not initialized. Please apply migrations 007_bank_accounts_iban.sql and 010_client_auto_issued_cards.sql.');
        }

        throw error;
    }
};
