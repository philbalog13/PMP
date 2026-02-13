/**
 * Merchant Ledger Service - PMP
 * Shared service for booking entries in the merchant account ledger
 */
import { query } from '../config/database';
import { logger } from '../utils/logger';

export type MerchantAccountDirection = 'CREDIT' | 'DEBIT';
export type MerchantAccountBucket = 'AVAILABLE' | 'PENDING' | 'RESERVE';
export type MerchantAccountEntryType =
    | 'PURCHASE'
    | 'REFUND'
    | 'VOID'
    | 'SETTLEMENT_IN'
    | 'SETTLEMENT_OUT'
    | 'FEE'
    | 'PAYOUT'
    | 'ADJUSTMENT'
    | 'RESERVE_HOLD'
    | 'RESERVE_RELEASE'
    | 'CHARGEBACK'
    | 'INCIDENT';

export type MerchantAccountEntryInput = {
    entryType: MerchantAccountEntryType;
    direction: MerchantAccountDirection;
    bucket: MerchantAccountBucket;
    amount: number;
    relatedTransactionId?: string | null;
    reference?: string | null;
    description?: string | null;
    metadata?: Record<string, any> | null;
    allowNegative?: boolean;
};

const toNumber = (value: any): number => {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
};

/**
 * Apply an entry to a merchant's account ledger
 */
export const applyMerchantAccountEntry = async (
    merchantId: string,
    payload: MerchantAccountEntryInput
) => {
    const result = await query(
        `SELECT * FROM merchant.apply_account_entry(
            $1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10
        )`,
        [
            merchantId,
            payload.entryType,
            payload.direction,
            payload.bucket,
            payload.amount,
            payload.relatedTransactionId || null,
            payload.reference || null,
            payload.description || null,
            JSON.stringify(payload.metadata || {}),
            payload.allowNegative || false
        ]
    );

    if (result.rowCount === 0) {
        throw new Error('Failed to apply account entry');
    }

    const row = result.rows[0];
    return {
        entryId: row.entry_id,
        accountId: row.account_id,
        availableBalance: toNumber(row.available_balance),
        pendingBalance: toNumber(row.pending_balance),
        reserveBalance: toNumber(row.reserve_balance),
        currency: row.currency,
        totalVolume: toNumber(row.total_volume),
        totalRefunds: toNumber(row.total_refunds),
        totalFees: toNumber(row.total_fees)
    };
};

/**
 * Book a reversal (refund or void) on a merchant's account
 */
export const bookMerchantReversal = async (
    merchantId: string,
    originalTxn: any,
    amount: number,
    entryType: 'REFUND' | 'VOID',
    reference: string
) => {
    const preferredBucket: MerchantAccountBucket = originalTxn?.settled_at ? 'AVAILABLE' : 'PENDING';
    const baseMetadata = {
        originalTransactionId: originalTxn?.transaction_id,
        originalStatus: originalTxn?.status,
        settledAt: originalTxn?.settled_at || null
    };

    try {
        await applyMerchantAccountEntry(merchantId, {
            entryType,
            direction: 'DEBIT',
            bucket: preferredBucket,
            amount,
            relatedTransactionId: originalTxn?.transaction_id || null,
            reference,
            description: `${entryType} applied on merchant account`,
            metadata: { ...baseMetadata, bucket: preferredBucket },
            allowNegative: false
        });
    } catch (error: any) {
        if (preferredBucket !== 'PENDING') {
            throw error;
        }

        logger.warn('Pending bucket reversal failed, falling back to available bucket', {
            merchantId,
            entryType,
            amount,
            error: error.message
        });

        await applyMerchantAccountEntry(merchantId, {
            entryType,
            direction: 'DEBIT',
            bucket: 'AVAILABLE',
            amount,
            relatedTransactionId: originalTxn?.transaction_id || null,
            reference,
            description: `${entryType} applied on merchant account (fallback to AVAILABLE)`,
            metadata: { ...baseMetadata, bucket: 'AVAILABLE', fallback: true },
            allowNegative: true
        });
    }
};
