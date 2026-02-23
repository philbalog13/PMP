/**
 * Merchant Controller - PMP
 * POS terminals, transactions, and reports for merchants
 */
import { Request, Response } from 'express';
import { query } from '../config/database';
import { logger } from '../utils/logger';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import {
    applyMerchantAccountEntry,
    bookMerchantReversal,
    MerchantAccountBucket,
    MerchantAccountDirection,
    MerchantAccountEntryInput,
    MerchantAccountEntryType
} from '../services/merchantLedger.service';
import { isAutoIssuedColumnAvailable } from '../services/clientCardProvisioning.service';

const MERCHANT_ACCOUNT_SELECT = `
    SELECT
        id,
        merchant_id,
        account_number,
        iban,
        bic,
        account_holder_name,
        card_enabled,
        currency,
        status,
        available_balance,
        pending_balance,
        reserve_balance,
        fee_percent,
        fixed_fee,
        minimum_payout_amount,
        settlement_delay_days,
        total_volume,
        total_refunds,
        total_fees,
        last_settlement_at,
        last_payout_at,
        metadata,
        created_at,
        updated_at
    FROM merchant.accounts
    WHERE merchant_id = $1
`;

const toNumber = (value: any): number => {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
};

const parseJsonColumn = (value: any): Record<string, any> => {
    if (!value) return {};
    if (typeof value === 'object') return value;
    if (typeof value !== 'string') return {};

    try {
        return JSON.parse(value);
    } catch {
        return {};
    }
};

const normalizePositiveAmount = (value: any): number | null => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) {
        return null;
    }

    return Math.round(parsed * 100) / 100;
};

const roundCurrency = (value: number): number => Math.round(value * 100) / 100;

const buildRealTransactionIntegrityClause = (alias?: string): string => {
    const tx = alias ? `${alias}.` : '';
    return `
        ${tx}client_id IS NOT NULL
        AND ${tx}merchant_id IS NOT NULL
        AND EXISTS (
            SELECT 1
            FROM users.users u_client
            WHERE u_client.id = ${tx}client_id
              AND u_client.role = 'ROLE_CLIENT'
        )
        AND EXISTS (
            SELECT 1
            FROM users.users u_merchant
            WHERE u_merchant.id = ${tx}merchant_id
              AND u_merchant.role = 'ROLE_MARCHAND'
        )
        AND EXISTS (
            SELECT 1
            FROM client.bank_accounts ba
            WHERE ba.client_id = ${tx}client_id
        )
        AND EXISTS (
            SELECT 1
            FROM merchant.accounts ma
            WHERE ma.merchant_id = ${tx}merchant_id
        )
        AND (
            ${tx}card_id IS NULL
            OR EXISTS (
                SELECT 1
                FROM client.virtual_cards vc
                WHERE vc.id = ${tx}card_id
                  AND vc.client_id = ${tx}client_id
            )
        )
    `;
};

type ClientAccountDirection = 'CREDIT' | 'DEBIT';
type ClientAccountEntryType = 'OPENING' | 'DEPOSIT' | 'WITHDRAWAL' | 'ADJUSTMENT' | 'CARD_TOPUP';

const applyClientAccountEntry = async (
    clientId: string,
    payload: {
        entryType: ClientAccountEntryType;
        direction: ClientAccountDirection;
        amount: number;
        reference?: string | null;
        description?: string | null;
        metadata?: Record<string, any> | null;
        allowNegative?: boolean;
    }
) => {
    const result = await query(
        `SELECT * FROM client.apply_bank_account_entry(
            $1, $2, $3, $4, $5, $6, $7::jsonb, $8
        )`,
        [
            clientId,
            payload.entryType,
            payload.direction,
            payload.amount,
            payload.reference || null,
            payload.description || null,
            JSON.stringify(payload.metadata || {}),
            payload.allowNegative || false
        ]
    );

    if (result.rowCount === 0) {
        throw new Error('Failed to apply bank account entry');
    }

    return {
        balance: toNumber(result.rows[0].balance),
        availableBalance: toNumber(result.rows[0].available_balance),
        currency: result.rows[0].currency
    };
};

const isAutoIssuedCard = async (cardId: string): Promise<boolean> => {
    const autoIssuedColumnAvailable = await isAutoIssuedColumnAvailable();
    if (!autoIssuedColumnAvailable) {
        return false;
    }

    const cardResult = await query(
        `SELECT is_auto_issued
         FROM client.virtual_cards
         WHERE id = $1
         LIMIT 1`,
        [cardId]
    );

    if ((cardResult.rowCount || 0) === 0) {
        return false;
    }

    return Boolean(cardResult.rows[0].is_auto_issued);
};

const pickRandom = <T>(items: T[]): T | null => {
    if (!Array.isArray(items) || items.length === 0) return null;
    const index = Math.floor(Math.random() * items.length);
    return items[index];
};

const mapAccountRow = (row: any) => ({
    id: row.id,
    merchantId: row.merchant_id,
    accountNumber: row.account_number,
    iban: row.iban,
    bic: row.bic,
    accountHolderName: row.account_holder_name,
    cardEnabled: row.card_enabled === true,
    currency: row.currency,
    status: row.status,
    availableBalance: toNumber(row.available_balance),
    pendingBalance: toNumber(row.pending_balance),
    reserveBalance: toNumber(row.reserve_balance),
    feePercent: toNumber(row.fee_percent),
    fixedFee: toNumber(row.fixed_fee),
    minimumPayoutAmount: toNumber(row.minimum_payout_amount),
    settlementDelayDays: Number.parseInt(row.settlement_delay_days, 10) || 0,
    totalVolume: toNumber(row.total_volume),
    totalRefunds: toNumber(row.total_refunds),
    totalFees: toNumber(row.total_fees),
    lastSettlementAt: row.last_settlement_at,
    lastPayoutAt: row.last_payout_at,
    metadata: parseJsonColumn(row.metadata),
    createdAt: row.created_at,
    updatedAt: row.updated_at
});

const ensureMerchantAccount = async (merchantId: string): Promise<void> => {
    await query(`SELECT merchant.ensure_account_iban($1)`, [merchantId]);
};

const getMerchantAccount = async (merchantId: string) => {
    await ensureMerchantAccount(merchantId);
    const result = await query(MERCHANT_ACCOUNT_SELECT, [merchantId]);

    if (result.rowCount === 0) {
        throw new Error('Merchant account not found');
    }

    return mapAccountRow(result.rows[0]);
};

// applyMerchantAccountEntry and bookMerchantReversal imported from ../services/merchantLedger.service

const ensureSimulationTerminal = async (merchantId: string) => {
    const terminalResult = await query(
        `SELECT * FROM merchant.pos_terminals
         WHERE merchant_id = $1
         ORDER BY last_transaction_at DESC NULLS LAST, created_at DESC
         LIMIT 1`,
        [merchantId]
    );

    if ((terminalResult.rowCount ?? 0) > 0) {
        return terminalResult.rows[0];
    }

    const generatedTerminalId = `HIST${String(Math.floor(Math.random() * 1000000)).padStart(6, '0')}`;
    const createResult = await query(
        `INSERT INTO merchant.pos_terminals
         (merchant_id, terminal_id, terminal_name, terminal_type, mcc, merchant_name, location_name, status)
         VALUES ($1, $2, 'Terminal Historique', 'STANDARD', '5411', 'PMP Merchant', 'Point de Vente Principal', 'ACTIVE')
         RETURNING *`,
        [merchantId, generatedTerminalId]
    );

    return createResult.rows[0];
};

const setAccountEntryTimestamp = async (entryId: string, timestamp: Date) => {
    await query(
        `UPDATE merchant.account_entries
         SET created_at = $2, effective_at = $2
         WHERE id = $1`,
        [entryId, timestamp]
    );
};

/**
 * Get merchant dashboard
 */
export const getDashboard = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.userId;

        const [todayStats, posResult, recentTxn, weeklyStats, account] = await Promise.all([
            query(
                `SELECT
                    COUNT(*) as transaction_count,
                    COALESCE(SUM(CASE WHEN status = 'APPROVED' THEN amount ELSE 0 END), 0) as revenue,
                    COALESCE(SUM(CASE WHEN type = 'REFUND' THEN amount ELSE 0 END), 0) as refunds,
                    COUNT(CASE WHEN status = 'APPROVED' THEN 1 END) as approved_count,
                    COUNT(CASE WHEN status = 'DECLINED' THEN 1 END) as declined_count
                 FROM client.transactions
                 WHERE merchant_id = $1
                   AND DATE(timestamp) = CURRENT_DATE
                   AND ${buildRealTransactionIntegrityClause()}`,
                [userId]
            ),
            query(
                `SELECT id, terminal_id, terminal_name, terminal_type, status,
                        location_name, last_transaction_at
                 FROM merchant.pos_terminals
                 WHERE merchant_id = $1
                 ORDER BY last_transaction_at DESC NULLS LAST LIMIT 5`,
                [userId]
            ),
            query(
                `SELECT id, transaction_id, stan, masked_pan, amount, currency, type, status,
                        response_code, authorization_code, terminal_id, timestamp
                 FROM client.transactions
                 WHERE merchant_id = $1
                   AND ${buildRealTransactionIntegrityClause()}
                 ORDER BY timestamp DESC LIMIT 10`,
                [userId]
            ),
            query(
                `SELECT
                    DATE(timestamp) as date,
                    COUNT(*) as count,
                    COALESCE(SUM(CASE WHEN status = 'APPROVED' THEN amount ELSE 0 END), 0) as revenue
                 FROM client.transactions
                 WHERE merchant_id = $1
                   AND timestamp >= NOW() - INTERVAL '7 days'
                   AND ${buildRealTransactionIntegrityClause()}
                 GROUP BY DATE(timestamp)
                 ORDER BY date DESC`,
                [userId]
            ),
            getMerchantAccount(userId)
        ]);

        const stats = todayStats.rows[0];
        const approvalRate = stats.transaction_count > 0
            ? Math.round((parseInt(stats.approved_count) / parseInt(stats.transaction_count)) * 100)
            : 0;
        const grossBalance = account.availableBalance + account.pendingBalance - account.reserveBalance;

        res.json({
            success: true,
            dashboard: {
                today: {
                    transactionCount: parseInt(stats.transaction_count) || 0,
                    revenue: parseFloat(stats.revenue) || 0,
                    refunds: parseFloat(stats.refunds) || 0,
                    approvedCount: parseInt(stats.approved_count) || 0,
                    declinedCount: parseInt(stats.declined_count) || 0,
                    approvalRate
                },
                account: {
                    accountNumber: account.accountNumber,
                    iban: account.iban,
                    bic: account.bic,
                    accountHolderName: account.accountHolderName,
                    cardEnabled: account.cardEnabled,
                    currency: account.currency,
                    status: account.status,
                    availableBalance: account.availableBalance,
                    pendingBalance: account.pendingBalance,
                    reserveBalance: account.reserveBalance,
                    grossBalance,
                    availableForPayout: Math.max(account.availableBalance - account.minimumPayoutAmount, 0),
                    feePercent: account.feePercent,
                    fixedFee: account.fixedFee,
                    lastSettlementAt: account.lastSettlementAt,
                    lastPayoutAt: account.lastPayoutAt
                },
                terminals: posResult.rows,
                recentTransactions: recentTxn.rows,
                weeklyTrend: weeklyStats.rows
            }
        });
    } catch (error: any) {
        logger.error('Get merchant dashboard error', { error: error.message });
        res.status(500).json({ success: false, error: 'Failed to fetch dashboard' });
    }
};

/**
 * Get merchant settlement account
 */
export const getAccount = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.userId;

        const [account, entryStats] = await Promise.all([
            getMerchantAccount(userId),
            query(
                `SELECT
                    COALESCE(SUM(CASE WHEN direction = 'CREDIT' THEN amount ELSE 0 END), 0) as credits_30d,
                    COALESCE(SUM(CASE WHEN direction = 'DEBIT' THEN amount ELSE 0 END), 0) as debits_30d,
                    COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours') as entries_24h
                 FROM merchant.account_entries
                 WHERE merchant_id = $1
                   AND created_at >= NOW() - INTERVAL '30 days'`,
                [userId]
            )
        ]);

        const stats = entryStats.rows[0] || {};
        const grossBalance = account.availableBalance + account.pendingBalance - account.reserveBalance;

        res.json({
            success: true,
            account: {
                ...account,
                grossBalance,
                availableForPayout: Math.max(account.availableBalance - account.minimumPayoutAmount, 0)
            },
            activity: {
                credits30d: toNumber(stats.credits_30d),
                debits30d: toNumber(stats.debits_30d),
                entries24h: Number.parseInt(stats.entries_24h, 10) || 0
            }
        });
    } catch (error: any) {
        logger.error('Get merchant account error', { error: error.message });
        res.status(500).json({ success: false, error: 'Failed to fetch merchant account' });
    }
};

/**
 * Get merchant account entries (ledger history)
 */
export const getAccountEntries = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.userId;
        const page = Math.max(parseInt(req.query.page as string, 10) || 1, 1);
        const requestedLimit = parseInt(req.query.limit as string, 10) || 20;
        const limit = Math.min(Math.max(requestedLimit, 1), 100);
        const offset = (page - 1) * limit;

        const type = req.query.type as string;
        const direction = req.query.direction as string;
        const bucket = req.query.bucket as string;
        const fromDate = req.query.fromDate as string;
        const toDate = req.query.toDate as string;

        const whereConditions = ['merchant_id = $1'];
        const params: any[] = [userId];
        let paramIndex = 2;

        if (type) {
            whereConditions.push(`entry_type = $${paramIndex}`);
            params.push(type);
            paramIndex++;
        }
        if (direction) {
            whereConditions.push(`direction = $${paramIndex}`);
            params.push(direction);
            paramIndex++;
        }
        if (bucket) {
            whereConditions.push(`balance_bucket = $${paramIndex}`);
            params.push(bucket);
            paramIndex++;
        }
        if (fromDate) {
            whereConditions.push(`created_at >= $${paramIndex}`);
            params.push(fromDate);
            paramIndex++;
        }
        if (toDate) {
            whereConditions.push(`created_at <= $${paramIndex}`);
            params.push(toDate);
            paramIndex++;
        }

        const whereClause = whereConditions.join(' AND ');

        const [countResult, entriesResult] = await Promise.all([
            query(
                `SELECT COUNT(*) as total
                 FROM merchant.account_entries
                 WHERE ${whereClause}`,
                params
            ),
            query(
                `SELECT
                    id,
                    entry_type,
                    direction,
                    balance_bucket,
                    amount,
                    currency,
                    balance_before,
                    balance_after,
                    related_transaction_id,
                    reference,
                    description,
                    metadata,
                    created_at,
                    effective_at
                 FROM merchant.account_entries
                 WHERE ${whereClause}
                 ORDER BY created_at DESC
                 LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
                [...params, limit, offset]
            )
        ]);

        const entries = entriesResult.rows.map((entry) => ({
            id: entry.id,
            type: entry.entry_type,
            direction: entry.direction,
            bucket: entry.balance_bucket,
            amount: toNumber(entry.amount),
            currency: entry.currency,
            balanceBefore: toNumber(entry.balance_before),
            balanceAfter: toNumber(entry.balance_after),
            relatedTransactionId: entry.related_transaction_id,
            reference: entry.reference,
            description: entry.description,
            metadata: parseJsonColumn(entry.metadata),
            createdAt: entry.created_at,
            effectiveAt: entry.effective_at
        }));

        const total = Number.parseInt(countResult.rows[0].total, 10) || 0;

        res.json({
            success: true,
            entries,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.max(Math.ceil(total / limit), 1)
            }
        });
    } catch (error: any) {
        logger.error('Get merchant account entries error', { error: error.message });
        res.status(500).json({ success: false, error: 'Failed to fetch account entries' });
    }
};

/**
 * Settle pending funds into available balance
 */
export const settleAccount = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.userId;
        const { amount, feePercent, fixedFee } = req.body;

        const normalizedAmount = amount === undefined || amount === null
            ? null
            : normalizePositiveAmount(amount);
        if ((amount !== undefined && amount !== null) && normalizedAmount === null) {
            return res.status(400).json({ success: false, error: 'amount must be a positive number' });
        }

        const normalizedFeePercent = feePercent === undefined || feePercent === null
            ? null
            : Number(feePercent);
        if (normalizedFeePercent !== null && (!Number.isFinite(normalizedFeePercent) || normalizedFeePercent < 0)) {
            return res.status(400).json({ success: false, error: 'feePercent must be a non-negative number' });
        }

        const normalizedFixedFee = fixedFee === undefined || fixedFee === null
            ? null
            : Number(fixedFee);
        if (normalizedFixedFee !== null && (!Number.isFinite(normalizedFixedFee) || normalizedFixedFee < 0)) {
            return res.status(400).json({ success: false, error: 'fixedFee must be a non-negative number' });
        }

        const settlementResult = await query(
            `SELECT * FROM merchant.settle_pending_funds($1, $2, $3, $4)`,
            [userId, normalizedAmount, normalizedFeePercent, normalizedFixedFee]
        );

        if (settlementResult.rowCount === 0) {
            return res.status(400).json({ success: false, error: 'No settlement generated' });
        }

        const settlement = settlementResult.rows[0];
        const settledAmount = toNumber(settlement.settled_amount);

        const settledTransactionsResult = await query(
            `WITH candidate_transactions AS (
                SELECT
                    id,
                    amount,
                    SUM(amount) OVER (ORDER BY timestamp ASC, id ASC) as cumulative_amount
                FROM client.transactions
                WHERE merchant_id = $1
                  AND status = 'APPROVED'
                  AND type = 'PURCHASE'
                  AND settled_at IS NULL
                  AND ${buildRealTransactionIntegrityClause()}
             ),
             to_settle AS (
                SELECT id
                FROM candidate_transactions
                WHERE cumulative_amount <= $2
             )
             UPDATE client.transactions t
             SET settled_at = NOW()
             FROM to_settle s
             WHERE t.id = s.id
             RETURNING t.id`,
            [userId, settledAmount]
        );

        const account = await getMerchantAccount(userId);

        res.json({
            success: true,
            settlement: {
                settledAmount,
                feeAmount: toNumber(settlement.fee_amount),
                netAmount: toNumber(settlement.net_amount),
                currency: settlement.currency,
                settledTransactions: settledTransactionsResult.rowCount || 0
            },
            account
        });
    } catch (error: any) {
        if (error.code === 'P0001' || error.code === '22003' || error.code === '22023') {
            return res.status(400).json({ success: false, error: error.message });
        }

        logger.error('Settle merchant account error', { error: error.message });
        res.status(500).json({ success: false, error: 'Failed to settle account' });
    }
};

/**
 * Create payout (withdrawal) from available balance
 */
export const createPayout = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.userId;
        const { amount, reference, allowOverdraft } = req.body;

        const normalizedAmount = normalizePositiveAmount(amount);
        if (normalizedAmount === null) {
            return res.status(400).json({ success: false, error: 'amount must be a positive number' });
        }

        const payoutResult = await query(
            `SELECT * FROM merchant.create_payout($1, $2, $3, $4)`,
            [userId, normalizedAmount, reference || null, !!allowOverdraft]
        );

        if (payoutResult.rowCount === 0) {
            return res.status(400).json({ success: false, error: 'Payout not created' });
        }

        const payout = payoutResult.rows[0];
        const account = await getMerchantAccount(userId);

        res.json({
            success: true,
            payout: {
                amount: toNumber(payout.payout_amount),
                currency: payout.currency,
                reference: payout.payout_reference,
                availableBalance: toNumber(payout.available_balance),
                pendingBalance: toNumber(payout.pending_balance),
                reserveBalance: toNumber(payout.reserve_balance)
            },
            account
        });
    } catch (error: any) {
        if (error.code === 'P0001' || error.code === '22003' || error.code === '22023') {
            return res.status(400).json({ success: false, error: error.message });
        }

        logger.error('Create payout error', { error: error.message });
        res.status(500).json({ success: false, error: 'Failed to create payout' });
    }
};

/**
 * Manual account adjustment (incidents, corrections, reserve operations)
 */
export const adjustAccount = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.userId;
        const {
            amount,
            direction = 'CREDIT',
            bucket = 'AVAILABLE',
            entryType = 'ADJUSTMENT',
            description,
            reference,
            metadata,
            allowNegative = false
        } = req.body;

        const normalizedAmount = normalizePositiveAmount(amount);
        if (normalizedAmount === null) {
            return res.status(400).json({ success: false, error: 'amount must be a positive number' });
        }

        const allowedDirections: MerchantAccountDirection[] = ['CREDIT', 'DEBIT'];
        const allowedBuckets: MerchantAccountBucket[] = ['AVAILABLE', 'PENDING', 'RESERVE'];
        const allowedEntryTypes: MerchantAccountEntryType[] = [
            'ADJUSTMENT',
            'INCIDENT',
            'RESERVE_HOLD',
            'RESERVE_RELEASE',
            'CHARGEBACK',
            'FEE'
        ];

        if (!allowedDirections.includes(direction)) {
            return res.status(400).json({ success: false, error: 'Invalid direction' });
        }
        if (!allowedBuckets.includes(bucket)) {
            return res.status(400).json({ success: false, error: 'Invalid bucket' });
        }
        if (!allowedEntryTypes.includes(entryType)) {
            return res.status(400).json({ success: false, error: 'Invalid entryType' });
        }

        const entry = await applyMerchantAccountEntry(userId, {
            entryType,
            direction,
            bucket,
            amount: normalizedAmount,
            relatedTransactionId: null,
            reference: reference || null,
            description: description || 'Manual merchant account adjustment',
            metadata: metadata && typeof metadata === 'object' ? metadata : {},
            allowNegative: !!allowNegative
        });

        const account = await getMerchantAccount(userId);

        res.json({
            success: true,
            message: 'Account adjusted successfully',
            entry,
            account
        });
    } catch (error: any) {
        if (error.code === 'P0001' || error.code === '22003' || error.code === '22023') {
            return res.status(400).json({ success: false, error: error.message });
        }

        logger.error('Adjust account error', { error: error.message });
        res.status(500).json({ success: false, error: 'Failed to adjust account' });
    }
};

/**
 * Generate realistic historical transactions and ledger operations
 */
export const generateHistory = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.userId;
        const body = req.body || {};

        const requestedDays = Number.parseInt(body.days, 10);
        const requestedTransactionsPerDay = Number.parseInt(body.transactionsPerDay, 10);

        const days = Number.isFinite(requestedDays) ? Math.min(Math.max(requestedDays, 1), 90) : 14;
        const transactionsPerDay = Number.isFinite(requestedTransactionsPerDay)
            ? Math.min(Math.max(requestedTransactionsPerDay, 1), 60)
            : 12;

        const includeRefunds = body.includeRefunds !== false;
        const includeVoids = body.includeVoids !== false;
        const includeSettlements = body.includeSettlements !== false;
        const includePayouts = body.includePayouts !== false;

        const accountAtStart = await getMerchantAccount(userId);
        const terminal = await ensureSimulationTerminal(userId);

        type GeneratedApprovedTx = {
            id: string;
            transactionId: string;
            amount: number;
            timestamp: Date;
            settled: boolean;
            settledAt?: Date;
            voided: boolean;
            refunded: boolean;
            maskedPan: string;
        };

        const summary = {
            generatedDays: days,
            transactionsPerDay,
            createdTransactions: 0,
            approvedTransactions: 0,
            declinedTransactions: 0,
            refunds: 0,
            voids: 0,
            settlements: 0,
            payouts: 0,
            totalSales: 0,
            totalRefunds: 0,
            totalVoids: 0,
            totalSettled: 0,
            totalFees: 0,
            totalPayouts: 0
        };

        for (let dayOffset = days - 1; dayOffset >= 0; dayOffset--) {
            const dayStart = new Date();
            dayStart.setHours(0, 0, 0, 0);
            dayStart.setDate(dayStart.getDate() - dayOffset);

            const businessStart = new Date(dayStart);
            businessStart.setHours(8, 0, 0, 0);

            const approvedTransactions: GeneratedApprovedTx[] = [];

            for (let index = 0; index < transactionsPerDay; index++) {
                const minuteOffset = Math.floor(Math.random() * (12 * 60)); // 08:00 -> 20:00
                const txTimestamp = new Date(businessStart.getTime() + minuteOffset * 60000);
                const amount = roundCurrency(5 + Math.random() * 495);

                const approved = Math.random() > 0.12;
                const transactionId = `HST${Date.now()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
                const stan = String(Math.floor(Math.random() * 1000000)).padStart(6, '0');
                const maskedPan = `4${String(Math.floor(Math.random() * 100000)).padStart(5, '0')}****${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;
                const authCode = approved ? Math.random().toString(36).slice(2, 8).toUpperCase() : null;

                const insertedTransaction = await query(
                    `INSERT INTO client.transactions
                     (transaction_id, stan, masked_pan, merchant_id, amount, currency, type, status,
                      response_code, authorization_code, merchant_name, merchant_mcc, terminal_id, timestamp)
                     VALUES ($1, $2, $3, $4, $5, 'EUR', 'PURCHASE', $6, $7, $8, $9, $10, $11, $12)
                     RETURNING id, transaction_id`,
                    [
                        transactionId,
                        stan,
                        maskedPan,
                        userId,
                        amount,
                        approved ? 'APPROVED' : 'DECLINED',
                        approved ? '00' : '05',
                        authCode,
                        terminal.merchant_name,
                        terminal.mcc,
                        terminal.terminal_id,
                        txTimestamp
                    ]
                );

                summary.createdTransactions += 1;

                if (approved) {
                    summary.approvedTransactions += 1;
                    summary.totalSales = roundCurrency(summary.totalSales + amount);

                    const purchaseEntry = await applyMerchantAccountEntry(userId, {
                        entryType: 'PURCHASE',
                        direction: 'CREDIT',
                        bucket: 'PENDING',
                        amount,
                        relatedTransactionId: transactionId,
                        reference: terminal.terminal_id,
                        description: 'Generated historical purchase (pending)',
                        metadata: {
                            source: 'history-generator',
                            simulated: true,
                            dayOffset
                        },
                        allowNegative: false
                    });

                    await setAccountEntryTimestamp(purchaseEntry.entryId, txTimestamp);

                    approvedTransactions.push({
                        id: insertedTransaction.rows[0].id,
                        transactionId,
                        amount,
                        timestamp: txTimestamp,
                        settled: false,
                        voided: false,
                        refunded: false,
                        maskedPan
                    });
                } else {
                    summary.declinedTransactions += 1;
                }
            }

            if (includeVoids && approvedTransactions.length > 2) {
                const possibleVoidCount = approvedTransactions.length >= 12 ? 2 : 1;
                const voidCount = Math.random() > 0.55 ? possibleVoidCount : 0;

                for (let voidIndex = 0; voidIndex < voidCount; voidIndex++) {
                    const candidates = approvedTransactions.filter((tx) => !tx.voided && !tx.settled);
                    const selected = pickRandom(candidates);
                    if (!selected) break;

                    const voidTimestamp = new Date(selected.timestamp.getTime() + 5 * 60000);
                    await query(
                        `UPDATE client.transactions
                         SET status = 'CANCELLED'
                         WHERE id = $1`,
                        [selected.id]
                    );

                    const voidEntry = await applyMerchantAccountEntry(userId, {
                        entryType: 'VOID',
                        direction: 'DEBIT',
                        bucket: 'PENDING',
                        amount: selected.amount,
                        relatedTransactionId: selected.transactionId,
                        reference: `VOID-${selected.transactionId}`,
                        description: 'Generated same-day void',
                        metadata: {
                            source: 'history-generator',
                            simulated: true,
                            dayOffset
                        },
                        allowNegative: false
                    });
                    await setAccountEntryTimestamp(voidEntry.entryId, voidTimestamp);

                    selected.voided = true;
                    summary.voids += 1;
                    summary.totalVoids = roundCurrency(summary.totalVoids + selected.amount);
                }
            }

            const settlementCandidates = approvedTransactions.filter((tx) => !tx.voided);
            if (includeSettlements && settlementCandidates.length > 0) {
                const pendingAmount = settlementCandidates.reduce((sum, tx) => sum + tx.amount, 0);
                const settleRatio = 0.65 + (Math.random() * 0.25);
                const settlementAmount = roundCurrency(pendingAmount * settleRatio);

                if (settlementAmount > 0) {
                    const settlementTimestamp = new Date(dayStart);
                    settlementTimestamp.setHours(23, 35, 0, 0);

                    const settlementOutEntry = await applyMerchantAccountEntry(userId, {
                        entryType: 'SETTLEMENT_OUT',
                        direction: 'DEBIT',
                        bucket: 'PENDING',
                        amount: settlementAmount,
                        reference: 'SETTLEMENT',
                        description: 'Generated settlement release from pending',
                        metadata: {
                            source: 'history-generator',
                            simulated: true,
                            dayOffset,
                            phase: 'out'
                        },
                        allowNegative: false
                    });
                    await setAccountEntryTimestamp(settlementOutEntry.entryId, settlementTimestamp);

                    const settlementInTimestamp = new Date(settlementTimestamp.getTime() + 60000);
                    const settlementInEntry = await applyMerchantAccountEntry(userId, {
                        entryType: 'SETTLEMENT_IN',
                        direction: 'CREDIT',
                        bucket: 'AVAILABLE',
                        amount: settlementAmount,
                        reference: 'SETTLEMENT',
                        description: 'Generated settlement credit to available',
                        metadata: {
                            source: 'history-generator',
                            simulated: true,
                            dayOffset,
                            phase: 'in'
                        },
                        allowNegative: false
                    });
                    await setAccountEntryTimestamp(settlementInEntry.entryId, settlementInTimestamp);

                    const feeAmount = roundCurrency(
                        ((settlementAmount * accountAtStart.feePercent) / 100) + accountAtStart.fixedFee
                    );
                    const boundedFeeAmount = Math.min(feeAmount, settlementAmount);
                    if (boundedFeeAmount > 0) {
                        const feeTimestamp = new Date(settlementInTimestamp.getTime() + 60000);
                        const feeEntry = await applyMerchantAccountEntry(userId, {
                            entryType: 'FEE',
                            direction: 'DEBIT',
                            bucket: 'AVAILABLE',
                            amount: boundedFeeAmount,
                            reference: 'SETTLEMENT_FEE',
                            description: 'Generated settlement processing fee',
                            metadata: {
                                source: 'history-generator',
                                simulated: true,
                                dayOffset,
                                feePercent: accountAtStart.feePercent,
                                fixedFee: accountAtStart.fixedFee
                            },
                            allowNegative: false
                        });
                        await setAccountEntryTimestamp(feeEntry.entryId, feeTimestamp);
                        summary.totalFees = roundCurrency(summary.totalFees + boundedFeeAmount);
                    }

                    const sortedCandidates = [...settlementCandidates].sort(
                        (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
                    );

                    let settledAccumulator = 0;
                    for (const candidate of sortedCandidates) {
                        if (settledAccumulator + candidate.amount > settlementAmount + 0.001) {
                            break;
                        }

                        settledAccumulator = roundCurrency(settledAccumulator + candidate.amount);
                        candidate.settled = true;
                        candidate.settledAt = settlementTimestamp;

                        await query(
                            `UPDATE client.transactions
                             SET settled_at = $2
                             WHERE id = $1`,
                            [candidate.id, settlementTimestamp]
                        );
                    }

                    summary.settlements += 1;
                    summary.totalSettled = roundCurrency(summary.totalSettled + settlementAmount);
                }
            }

            if (includeRefunds) {
                const refundable = settlementCandidates.filter((tx) => tx.settled && !tx.refunded);
                const refundCount = refundable.length > 4 && Math.random() > 0.45
                    ? (refundable.length > 12 && Math.random() > 0.75 ? 2 : 1)
                    : 0;

                for (let refundIndex = 0; refundIndex < refundCount; refundIndex++) {
                    const availableCandidates = refundable.filter((tx) => !tx.refunded);
                    const original = pickRandom(availableCandidates);
                    if (!original) break;

                    const refundAmount = roundCurrency(Math.min(
                        original.amount,
                        original.amount * (0.25 + (Math.random() * 0.75))
                    ));
                    const refundTimestamp = new Date(
                        (original.settledAt || dayStart).getTime() + (45 + (refundIndex * 30)) * 60000
                    );
                    const refundTransactionId = `RFH${Date.now()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
                    const refundAuthCode = Math.random().toString(36).slice(2, 8).toUpperCase();

                    await query(
                        `INSERT INTO client.transactions
                         (transaction_id, stan, masked_pan, merchant_id, amount, currency, type, status,
                          response_code, authorization_code, merchant_name, merchant_mcc, terminal_id, timestamp, settled_at)
                         VALUES ($1, $2, $3, $4, $5, 'EUR', 'REFUND', 'APPROVED', '00', $6, $7, $8, $9, $10, $10)`,
                        [
                            refundTransactionId,
                            String(Math.floor(Math.random() * 1000000)).padStart(6, '0'),
                            original.maskedPan,
                            userId,
                            refundAmount,
                            refundAuthCode,
                            terminal.merchant_name,
                            terminal.mcc,
                            terminal.terminal_id,
                            refundTimestamp
                        ]
                    );

                    await query(
                        `UPDATE client.transactions
                         SET status = 'REFUNDED'
                         WHERE id = $1`,
                        [original.id]
                    );

                    const refundEntry = await applyMerchantAccountEntry(userId, {
                        entryType: 'REFUND',
                        direction: 'DEBIT',
                        bucket: 'AVAILABLE',
                        amount: refundAmount,
                        relatedTransactionId: refundTransactionId,
                        reference: original.transactionId,
                        description: 'Generated refund against settled transaction',
                        metadata: {
                            source: 'history-generator',
                            simulated: true,
                            originalTransactionId: original.transactionId,
                            dayOffset
                        },
                        allowNegative: false
                    });
                    await setAccountEntryTimestamp(refundEntry.entryId, refundTimestamp);

                    original.refunded = true;
                    summary.refunds += 1;
                    summary.totalRefunds = roundCurrency(summary.totalRefunds + refundAmount);
                    summary.createdTransactions += 1;
                }
            }

            if (includePayouts && dayOffset % 3 === 0) {
                const accountSnapshot = await getMerchantAccount(userId);
                const maxPayoutAmount = roundCurrency(
                    accountSnapshot.availableBalance - accountSnapshot.minimumPayoutAmount
                );

                if (maxPayoutAmount > accountSnapshot.minimumPayoutAmount) {
                    const payoutAmount = roundCurrency(Math.min(
                        maxPayoutAmount * (0.20 + (Math.random() * 0.25)),
                        950
                    ));

                    if (payoutAmount >= accountSnapshot.minimumPayoutAmount) {
                        const payoutTimestamp = new Date(dayStart);
                        payoutTimestamp.setHours(23, 50, 0, 0);
                        const payoutReference = `PAYOUT-HIST-${payoutTimestamp.getTime()}`;

                        const payoutEntry = await applyMerchantAccountEntry(userId, {
                            entryType: 'PAYOUT',
                            direction: 'DEBIT',
                            bucket: 'AVAILABLE',
                            amount: payoutAmount,
                            reference: payoutReference,
                            description: 'Generated merchant payout',
                            metadata: {
                                source: 'history-generator',
                                simulated: true,
                                dayOffset
                            },
                            allowNegative: false
                        });
                        await setAccountEntryTimestamp(payoutEntry.entryId, payoutTimestamp);

                        summary.payouts += 1;
                        summary.totalPayouts = roundCurrency(summary.totalPayouts + payoutAmount);
                    }
                }
            }
        }

        const account = await getMerchantAccount(userId);
        const netAfterFees = roundCurrency(
            summary.totalSales - summary.totalRefunds - summary.totalVoids - summary.totalFees
        );

        res.json({
            success: true,
            message: 'Historical operations generated successfully',
            summary: {
                ...summary,
                totalSales: roundCurrency(summary.totalSales),
                totalRefunds: roundCurrency(summary.totalRefunds),
                totalVoids: roundCurrency(summary.totalVoids),
                totalSettled: roundCurrency(summary.totalSettled),
                totalFees: roundCurrency(summary.totalFees),
                totalPayouts: roundCurrency(summary.totalPayouts),
                netAfterFees
            },
            accountBefore: accountAtStart,
            accountAfter: account
        });
    } catch (error: any) {
        if (error.code === 'P0001' || error.code === '22003' || error.code === '22023') {
            return res.status(400).json({ success: false, error: error.message });
        }

        logger.error('Generate history error', { error: error.message });
        res.status(500).json({ success: false, error: 'Failed to generate historical operations' });
    }
};

/**
 * Get transactions
 */
export const getTransactions = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.userId;
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const offset = (page - 1) * limit;
        const status = req.query.status as string;
        const type = req.query.type as string;
        const fromDate = req.query.fromDate as string;
        const toDate = req.query.toDate as string;
        const search = req.query.search as string;

        let whereConditions = [
            'merchant_id = $1',
            buildRealTransactionIntegrityClause()
        ];
        let params: any[] = [userId];
        let paramIndex = 2;

        if (status) {
            whereConditions.push(`status = $${paramIndex}`);
            params.push(status);
            paramIndex++;
        }
        if (type) {
            whereConditions.push(`type = $${paramIndex}`);
            params.push(type);
            paramIndex++;
        }
        if (fromDate) {
            whereConditions.push(`timestamp >= $${paramIndex}`);
            params.push(fromDate);
            paramIndex++;
        }
        if (toDate) {
            whereConditions.push(`timestamp <= $${paramIndex}`);
            params.push(toDate);
            paramIndex++;
        }
        if (search) {
            whereConditions.push(`(transaction_id ILIKE $${paramIndex} OR masked_pan ILIKE $${paramIndex})`);
            params.push(`%${search}%`);
            paramIndex++;
        }

        const whereClause = whereConditions.join(' AND ');

        const countResult = await query(
            `SELECT COUNT(*) FROM client.transactions WHERE ${whereClause}`,
            params
        );

        const result = await query(
            `SELECT id, transaction_id, stan, masked_pan, amount, currency, type, status,
                    response_code, authorization_code, terminal_id, threeds_status,
                    eci, fraud_score, timestamp, settled_at
             FROM client.transactions
             WHERE ${whereClause}
             ORDER BY timestamp DESC
             LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
            [...params, limit, offset]
        );

        res.json({
            success: true,
            transactions: result.rows,
            pagination: {
                page,
                limit,
                total: parseInt(countResult.rows[0].count),
                totalPages: Math.ceil(parseInt(countResult.rows[0].count) / limit)
            }
        });
    } catch (error: any) {
        logger.error('Get merchant transactions error', { error: error.message });
        res.status(500).json({ success: false, error: 'Failed to fetch transactions' });
    }
};

/**
 * Get transaction by ID
 */
export const getTransactionById = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.userId;
        const { id } = req.params;

        const result = await query(
            `SELECT * FROM client.transactions
             WHERE id = $1
               AND merchant_id = $2
               AND ${buildRealTransactionIntegrityClause()}`,
            [id, userId]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ success: false, error: 'Transaction not found' });
        }

        res.json({ success: true, transaction: result.rows[0] });
    } catch (error: any) {
        logger.error('Get transaction by ID error', { error: error.message });
        res.status(500).json({ success: false, error: 'Failed to fetch transaction' });
    }
};

/**
 * Get transaction timeline (processing steps)
 */
export const getTransactionTimeline = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.userId;
        const { id } = req.params;

        const result = await query(
            `SELECT t.*, m.merchant_name FROM client.transactions t
             LEFT JOIN merchant.pos_terminals m ON m.merchant_id = t.merchant_id
             WHERE t.id = $1
               AND t.merchant_id = $2
               AND ${buildRealTransactionIntegrityClause('t')}
             LIMIT 1`,
            [id, userId]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ success: false, error: 'Transaction not found' });
        }

        const txn = result.rows[0];
        let timeline = txn.processing_steps;

        if (typeof timeline === 'string') {
            try { timeline = JSON.parse(timeline); } catch { timeline = []; }
        }

        if (!timeline || !Array.isArray(timeline) || timeline.length === 0) {
            timeline = generateMerchantRetrospectiveTimeline(txn);
        }

        res.json({ success: true, transaction: txn, timeline });
    } catch (error: any) {
        logger.error('Merchant get transaction timeline error', { error: error.message });
        res.status(500).json({ success: false, error: 'Failed to fetch transaction timeline' });
    }
};

const generateMerchantRetrospectiveTimeline = (txn: any): any[] => {
    const steps: any[] = [];
    const baseTime = new Date(txn.timestamp || txn.created_at).getTime();
    let elapsed = 0;

    const addStep = (name: string, category: string, status: string, durationMs: number, details: any = {}) => {
        elapsed += durationMs;
        steps.push({ step: steps.length + 1, name, category, status, timestamp: new Date(baseTime - 200 + elapsed).toISOString(), duration_ms: durationMs, details });
    };

    const isApproved = txn.status === 'APPROVED';
    const amount = parseFloat(txn.amount);

    addStep('Transaction Initiated', 'process', 'success', 0, { amount, currency: txn.currency || 'EUR', merchantName: txn.merchant_name, paymentType: txn.type });
    addStep('Card Validation', 'security', 'success', 12, { maskedPan: txn.masked_pan, status: 'ACTIVE' });
    addStep('Limit Verification', 'decision', isApproved ? 'success' : (txn.response_code === '61' ? 'failed' : 'success'), 3, { amount });
    addStep('Balance Check', 'decision', isApproved ? 'success' : (txn.response_code === '51' ? 'failed' : 'success'), 3, { requestedAmount: amount });

    const fraudScore = txn.fraud_score ? parseFloat(txn.fraud_score) : Math.round(Math.random() * 15);
    addStep('Fraud Detection', 'security', 'success', 17, { score: fraudScore, riskLevel: fraudScore < 10 ? 'LOW' : fraudScore < 20 ? 'MEDIUM' : 'HIGH', recommendation: isApproved ? 'APPROVE' : 'REVIEW' });

    if (txn.threeds_status) {
        addStep('3DS Authentication', 'security', txn.threeds_status === 'Y' ? 'success' : 'failed', 20, { version: '2.2.0', transStatus: txn.threeds_status, eci: txn.eci });
    }

    addStep('Authorization Decision', 'decision', isApproved ? 'approved' : 'declined', 5, { responseCode: txn.response_code, authorizationCode: txn.authorization_code || null });

    if (isApproved) {
        addStep('Card Balance Debit', 'data', 'success', 10, { amount });
        addStep('Merchant Ledger Booking', 'data', 'success', 15, { merchantName: txn.merchant_name, bucket: 'PENDING', entryType: 'PURCHASE' });
        addStep('Settlement Queued', 'process', txn.settled_at ? 'settled' : 'queued', 5, { estimatedSettlement: 'T+1', settledAt: txn.settled_at || null });
    }

    return steps;
};

/**
 * Refund a transaction
 */
export const refundTransaction = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.userId;
        const { id } = req.params;
        const { amount, reason } = req.body;

        // Get original transaction
        const txnResult = await query(
            `SELECT * FROM client.transactions
             WHERE id = $1
               AND merchant_id = $2
               AND ${buildRealTransactionIntegrityClause()}`,
            [id, userId]
        );

        if (txnResult.rowCount === 0) {
            return res.status(404).json({ success: false, error: 'Transaction not found' });
        }

        const originalTxn = txnResult.rows[0];

        if (originalTxn.status !== 'APPROVED') {
            return res.status(400).json({ success: false, error: 'Can only refund approved transactions' });
        }

        if (originalTxn.type === 'REFUND') {
            return res.status(400).json({ success: false, error: 'Cannot refund a refund' });
        }

        const originalAmount = toNumber(originalTxn.amount);
        const refundAmount = amount === undefined || amount === null
            ? originalAmount
            : normalizePositiveAmount(amount);
        if (refundAmount === null) {
            return res.status(400).json({ success: false, error: 'Refund amount must be a positive number' });
        }
        if (refundAmount > originalAmount) {
            return res.status(400).json({ success: false, error: 'Refund amount exceeds original amount' });
        }

        // Create refund transaction
        const transactionId = `REF${Date.now()}${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
        const authCode = Math.random().toString(36).substr(2, 6).toUpperCase();

        const refundResult = await query(
            `INSERT INTO client.transactions
             (transaction_id, card_id, masked_pan, client_id, merchant_id, amount, currency, type, status,
              response_code, authorization_code, merchant_name, merchant_mcc, terminal_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7, 'REFUND', 'APPROVED', '00', $8, $9, $10, $11)
             RETURNING *`,
            [
                transactionId, originalTxn.card_id, originalTxn.masked_pan, originalTxn.client_id,
                userId, refundAmount, originalTxn.currency, authCode,
                originalTxn.merchant_name, originalTxn.merchant_mcc, originalTxn.terminal_id
            ]
        );

        // Update original transaction status
        await query(
            `UPDATE client.transactions SET status = 'REFUNDED' WHERE id = $1`,
            [id]
        );

        // Restore balance to card (auto-issued cards are funded by bank account balance)
        if (originalTxn.card_id) {
            const autoIssued = await isAutoIssuedCard(originalTxn.card_id);

            if (autoIssued) {
                const accountEntry = await applyClientAccountEntry(originalTxn.client_id, {
                    entryType: 'ADJUSTMENT',
                    direction: 'CREDIT',
                    amount: refundAmount,
                    reference: transactionId,
                    description: `Refund credit on auto-issued card ${originalTxn.masked_pan}`,
                    metadata: {
                        source: 'merchant-refund',
                        merchantId: userId,
                        cardId: originalTxn.card_id,
                        originalTransactionId: originalTxn.transaction_id || id
                    },
                    allowNegative: false
                });

                await query(
                    `UPDATE client.virtual_cards
                     SET balance = $1
                     WHERE id = $2`,
                    [accountEntry.balance, originalTxn.card_id]
                );
            } else {
                await query(
                    `UPDATE client.virtual_cards
                     SET balance = balance + $1
                     WHERE id = $2`,
                    [refundAmount, originalTxn.card_id]
                );
            }
        }

        let ledgerBooked = true;
        try {
            await bookMerchantReversal(
                userId,
                originalTxn,
                refundAmount,
                'REFUND',
                refundResult.rows[0].transaction_id || transactionId
            );
        } catch (ledgerError: any) {
            ledgerBooked = false;
            logger.error('Merchant ledger booking failed on refund', {
                originalTxnId: id,
                refundTransactionId: transactionId,
                merchantId: userId,
                amount: refundAmount,
                reason,
                error: ledgerError.message
            });
        }

        logger.info('Transaction refunded', {
            originalTxnId: id,
            refundTxnId: refundResult.rows[0].id,
            amount: refundAmount,
            ledgerBooked,
            reason
        });

        res.json({
            success: true,
            message: 'Refund processed successfully',
            refund: refundResult.rows[0],
            ledgerBooked
        });
    } catch (error: any) {
        logger.error('Refund transaction error', { error: error.message });
        res.status(500).json({ success: false, error: 'Failed to process refund' });
    }
};

/**
 * Void a transaction
 */
export const voidTransaction = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.userId;
        const { id } = req.params;
        const { reason } = req.body;

        // Get transaction
        const txnResult = await query(
            `SELECT * FROM client.transactions
             WHERE id = $1
               AND merchant_id = $2
               AND ${buildRealTransactionIntegrityClause()}`,
            [id, userId]
        );

        if (txnResult.rowCount === 0) {
            return res.status(404).json({ success: false, error: 'Transaction not found' });
        }

        const txn = txnResult.rows[0];
        const wasApproved = txn.status === 'APPROVED';
        const txnAmount = toNumber(txn.amount);

        if (txn.status !== 'APPROVED' && txn.status !== 'PENDING') {
            return res.status(400).json({ success: false, error: 'Cannot void this transaction' });
        }

        // Check if same day (can only void same-day transactions)
        const txnDate = new Date(txn.timestamp).toDateString();
        const today = new Date().toDateString();
        if (txnDate !== today) {
            return res.status(400).json({ success: false, error: 'Can only void same-day transactions. Use refund instead.' });
        }

        // Void transaction
        await query(
            `UPDATE client.transactions SET status = 'CANCELLED' WHERE id = $1`,
            [id]
        );

        // Restore balance to card (auto-issued cards are funded by bank account balance)
        if (txn.card_id && wasApproved) {
            const autoIssued = await isAutoIssuedCard(txn.card_id);

            if (autoIssued) {
                const accountEntry = await applyClientAccountEntry(txn.client_id, {
                    entryType: 'ADJUSTMENT',
                    direction: 'CREDIT',
                    amount: txnAmount,
                    reference: `VOID-${txn.transaction_id || id}`,
                    description: `Void reversal on auto-issued card ${txn.masked_pan}`,
                    metadata: {
                        source: 'merchant-void',
                        merchantId: userId,
                        cardId: txn.card_id,
                        originalTransactionId: txn.transaction_id || id
                    },
                    allowNegative: false
                });

                await query(
                    `UPDATE client.virtual_cards
                     SET balance = $1,
                         daily_spent = GREATEST(daily_spent - $2, 0)
                     WHERE id = $3`,
                    [accountEntry.balance, txnAmount, txn.card_id]
                );
            } else {
                await query(
                    `UPDATE client.virtual_cards
                     SET balance = balance + $1,
                         daily_spent = GREATEST(daily_spent - $1, 0)
                     WHERE id = $2`,
                    [txnAmount, txn.card_id]
                );
            }
        }

        let ledgerBooked = true;
        if (wasApproved) {
            try {
                await bookMerchantReversal(
                    userId,
                    txn,
                    txnAmount,
                    'VOID',
                    `VOID-${txn.transaction_id || id}`
                );
            } catch (ledgerError: any) {
                ledgerBooked = false;
                logger.error('Merchant ledger booking failed on void', {
                    txnId: id,
                    merchantId: userId,
                    amount: txnAmount,
                    reason,
                    error: ledgerError.message
                });
            }
        }

        logger.info('Transaction voided', { txnId: id, reason, ledgerBooked });

        res.json({
            success: true,
            message: 'Transaction voided successfully',
            ledgerBooked
        });
    } catch (error: any) {
        logger.error('Void transaction error', { error: error.message });
        res.status(500).json({ success: false, error: 'Failed to void transaction' });
    }
};

/**
 * Get POS terminals
 */
export const getPOSTerminals = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.userId;

        const result = await query(
            `SELECT id, terminal_id, terminal_name, terminal_type, status,
                    accepts_contactless, accepts_chip, accepts_magstripe, accepts_manual_entry,
                    supports_3ds, location_name, address, city, country, mcc, merchant_name,
                    last_transaction_at, created_at
             FROM merchant.pos_terminals
             WHERE merchant_id = $1
             ORDER BY created_at DESC`,
            [userId]
        );

        // If no terminals, create a demo one
        if (result.rowCount === 0) {
            const terminalId = `TERM${String(Math.floor(Math.random() * 100000)).padStart(5, '0')}`;

            await query(
                `INSERT INTO merchant.pos_terminals
                 (merchant_id, terminal_id, terminal_name, terminal_type, mcc, merchant_name, location_name)
                 VALUES ($1, $2, 'Terminal Principal', 'STANDARD', '5411', 'Demo Merchant', 'Magasin Principal')`,
                [userId, terminalId]
            );

            const newResult = await query(
                `SELECT * FROM merchant.pos_terminals WHERE merchant_id = $1`,
                [userId]
            );

            return res.json({ success: true, terminals: newResult.rows });
        }

        res.json({ success: true, terminals: result.rows });
    } catch (error: any) {
        logger.error('Get POS terminals error', { error: error.message });
        res.status(500).json({ success: false, error: 'Failed to fetch terminals' });
    }
};

/**
 * Get POS terminal by ID
 */
export const getPOSById = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.userId;
        const { id } = req.params;

        const result = await query(
            `SELECT * FROM merchant.pos_terminals WHERE id = $1 AND merchant_id = $2`,
            [id, userId]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ success: false, error: 'Terminal not found' });
        }

        // Get recent transactions for this terminal
        const txnResult = await query(
            `SELECT id, transaction_id, amount, currency, type, status, timestamp
             FROM client.transactions
             WHERE terminal_id = $1
               AND merchant_id = $2
               AND ${buildRealTransactionIntegrityClause()}
             ORDER BY timestamp DESC LIMIT 10`,
            [result.rows[0].terminal_id, userId]
        );

        res.json({
            success: true,
            terminal: result.rows[0],
            recentTransactions: txnResult.rows
        });
    } catch (error: any) {
        logger.error('Get POS by ID error', { error: error.message });
        res.status(500).json({ success: false, error: 'Failed to fetch terminal' });
    }
};

/**
 * Create POS transaction (simulate encaissement)
 */
export const createPOSTransaction = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.userId;
        const { terminalId, maskedPan, amount, paymentMethod } = req.body;

        const normalizedAmount = normalizePositiveAmount(amount);
        if (normalizedAmount === null) {
            return res.status(400).json({ success: false, error: 'Amount must be a positive number' });
        }

        // Get terminal
        let terminal;
        if (terminalId) {
            const termResult = await query(
                `SELECT * FROM merchant.pos_terminals WHERE terminal_id = $1 AND merchant_id = $2`,
                [terminalId, userId]
            );
            if (termResult.rowCount === 0) {
                return res.status(404).json({ success: false, error: 'Terminal not found' });
            }
            terminal = termResult.rows[0];
        } else {
            // Use first available terminal
            const termResult = await query(
                `SELECT * FROM merchant.pos_terminals WHERE merchant_id = $1 AND status = 'ACTIVE' LIMIT 1`,
                [userId]
            );
            if (termResult.rowCount === 0) {
                return res.status(400).json({ success: false, error: 'No active terminal found' });
            }
            terminal = termResult.rows[0];
        }

        // Generate transaction
        const transactionId = `POS${Date.now()}${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
        const authCode = Math.random().toString(36).substr(2, 6).toUpperCase();
        const stan = String(Math.floor(Math.random() * 1000000)).padStart(6, '0');
        const pan = maskedPan || '4916****' + String(Math.floor(Math.random() * 10000)).padStart(4, '0');

        // Simulate random decline (10% chance for educational purposes)
        const approved = Math.random() > 0.1;
        const responseCode = approved ? '00' : '05';
        const status = approved ? 'APPROVED' : 'DECLINED';

        const txnResult = await query(
            `INSERT INTO client.transactions
             (transaction_id, stan, masked_pan, merchant_id, amount, currency, type, status,
              response_code, authorization_code, merchant_name, merchant_mcc, terminal_id)
             VALUES ($1, $2, $3, $4, $5, 'EUR', 'PURCHASE', $6, $7, $8, $9, $10, $11)
             RETURNING *`,
            [
                transactionId, stan, pan, userId, normalizedAmount, status, responseCode,
                approved ? authCode : null, terminal.merchant_name, terminal.mcc, terminal.terminal_id
            ]
        );

        let ledgerBooked = true;
        if (approved) {
            try {
                await applyMerchantAccountEntry(userId, {
                    entryType: 'PURCHASE',
                    direction: 'CREDIT',
                    bucket: 'PENDING',
                    amount: normalizedAmount,
                    relatedTransactionId: transactionId,
                    reference: terminal.terminal_id,
                    description: 'POS purchase authorized and pending settlement',
                    metadata: {
                        terminalId: terminal.terminal_id,
                        paymentMethod: paymentMethod || 'CARD_PRESENT',
                        stan
                    },
                    allowNegative: false
                });
            } catch (ledgerError: any) {
                ledgerBooked = false;
                logger.error('Merchant ledger booking failed on POS purchase', {
                    transactionId,
                    merchantId: userId,
                    amount: normalizedAmount,
                    error: ledgerError.message
                });
            }
        }

        // Update terminal last transaction
        await query(
            `UPDATE merchant.pos_terminals SET last_transaction_at = NOW() WHERE id = $1`,
            [terminal.id]
        );

        logger.info('POS transaction created', {
            transactionId,
            terminalId: terminal.terminal_id,
            status,
            amount: normalizedAmount,
            ledgerBooked
        });

        res.json({
            success: true,
            approved,
            transaction: txnResult.rows[0],
            ledgerBooked,
            _educational: {
                isoMessage: {
                    mti: '0100',
                    de2: pan,
                    de3: '000000',
                    de4: String(Math.round(normalizedAmount * 100)).padStart(12, '0'),
                    de11: stan,
                    de22: paymentMethod === 'contactless' ? '071' : '051',
                    de38: approved ? authCode : '',
                    de39: responseCode,
                    de41: terminal.terminal_id,
                    de42: terminal.merchant_name.substring(0, 15)
                },
                note: 'This simulates an ISO 8583 POS authorization'
            }
        });
    } catch (error: any) {
        logger.error('Create POS transaction error', { error: error.message });
        res.status(500).json({ success: false, error: 'Failed to create transaction' });
    }
};

/**
 * Get reports
 */
export const getReports = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.userId;

        const result = await query(
            `SELECT id, report_type, report_date, total_transactions, total_amount,
                    total_refunds, refund_amount, net_amount, status, created_at
             FROM merchant.reports
             WHERE merchant_id = $1
             ORDER BY report_date DESC LIMIT 30`,
            [userId]
        );

        res.json({ success: true, reports: result.rows });
    } catch (error: any) {
        logger.error('Get reports error', { error: error.message });
        res.status(500).json({ success: false, error: 'Failed to fetch reports' });
    }
};

/**
 * Get daily report
 */
export const getDailyReport = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.userId;
        const date = req.query.date as string || new Date().toISOString().split('T')[0];

        // Generate report from transactions
        const result = await query(
            `SELECT
                COUNT(*) as total_transactions,
                COALESCE(SUM(CASE WHEN status = 'APPROVED' AND type = 'PURCHASE' THEN amount ELSE 0 END), 0) as total_amount,
                COUNT(CASE WHEN type = 'REFUND' THEN 1 END) as total_refunds,
                COALESCE(SUM(CASE WHEN type = 'REFUND' THEN amount ELSE 0 END), 0) as refund_amount,
                COUNT(CASE WHEN status = 'APPROVED' THEN 1 END) as approved_count,
                COUNT(CASE WHEN status = 'DECLINED' THEN 1 END) as declined_count,
                COALESCE(SUM(CASE WHEN masked_pan LIKE '4%' THEN amount ELSE 0 END), 0) as visa_amount,
                COALESCE(SUM(CASE WHEN masked_pan LIKE '5%' THEN amount ELSE 0 END), 0) as mastercard_amount
             FROM client.transactions
             WHERE merchant_id = $1
               AND DATE(timestamp) = $2
               AND ${buildRealTransactionIntegrityClause()}`,
            [userId, date]
        );

        const stats = result.rows[0];
        const netAmount = parseFloat(stats.total_amount) - parseFloat(stats.refund_amount);

        // Get hourly breakdown
        const hourlyResult = await query(
            `SELECT
                EXTRACT(HOUR FROM timestamp) as hour,
                COUNT(*) as count,
                SUM(CASE WHEN status = 'APPROVED' THEN amount ELSE 0 END) as amount
             FROM client.transactions
             WHERE merchant_id = $1
               AND DATE(timestamp) = $2
               AND ${buildRealTransactionIntegrityClause()}
             GROUP BY EXTRACT(HOUR FROM timestamp)
             ORDER BY hour`,
            [userId, date]
        );

        res.json({
            success: true,
            report: {
                date,
                totalTransactions: parseInt(stats.total_transactions) || 0,
                totalAmount: parseFloat(stats.total_amount) || 0,
                totalRefunds: parseInt(stats.total_refunds) || 0,
                refundAmount: parseFloat(stats.refund_amount) || 0,
                netAmount,
                approvedCount: parseInt(stats.approved_count) || 0,
                declinedCount: parseInt(stats.declined_count) || 0,
                visaAmount: parseFloat(stats.visa_amount) || 0,
                mastercardAmount: parseFloat(stats.mastercard_amount) || 0,
                hourlyBreakdown: hourlyResult.rows
            }
        });
    } catch (error: any) {
        logger.error('Get daily report error', { error: error.message });
        res.status(500).json({ success: false, error: 'Failed to fetch daily report' });
    }
};

/**
 * Get reconciliation report
 */
export const getReconciliationReport = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.userId;
        const fromDate = req.query.fromDate as string;
        const toDate = req.query.toDate as string;

        let dateFilter = '';
        const params: any[] = [userId];

        if (fromDate && toDate) {
            dateFilter = 'AND DATE(timestamp) BETWEEN $2 AND $3';
            params.push(fromDate, toDate);
        } else {
            dateFilter = 'AND DATE(timestamp) = CURRENT_DATE';
        }

        // Get all transactions
        const result = await query(
            `SELECT
                transaction_id, stan, masked_pan, amount, currency, type, status,
                response_code, authorization_code, terminal_id, timestamp
             FROM client.transactions
             WHERE merchant_id = $1
               ${dateFilter}
               AND ${buildRealTransactionIntegrityClause()}
             ORDER BY timestamp`,
            params
        );

        // Calculate totals
        let totalDebits = 0;
        let totalCredits = 0;
        let discrepancies: any[] = [];

        result.rows.forEach(txn => {
            if (txn.status === 'APPROVED') {
                if (txn.type === 'REFUND') {
                    totalCredits += parseFloat(txn.amount);
                } else {
                    totalDebits += parseFloat(txn.amount);
                }
            }
        });

        const netAmount = totalDebits - totalCredits;

        res.json({
            success: true,
            reconciliation: {
                period: {
                    from: fromDate || new Date().toISOString().split('T')[0],
                    to: toDate || new Date().toISOString().split('T')[0]
                },
                totalTransactions: result.rows.length,
                totalDebits,
                totalCredits,
                netAmount,
                transactions: result.rows,
                discrepancies,
                status: discrepancies.length === 0 ? 'BALANCED' : 'DISCREPANCIES_FOUND'
            }
        });
    } catch (error: any) {
        logger.error('Get reconciliation report error', { error: error.message });
        res.status(500).json({ success: false, error: 'Failed to fetch reconciliation' });
    }
};

/**
 * Export report
 */
export const exportReport = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.userId;
        const { reportType, fromDate, toDate, format } = req.body;

        // Generate report data
        const result = await query(
            `SELECT * FROM client.transactions
             WHERE merchant_id = $1
               AND DATE(timestamp) BETWEEN $2 AND $3
               AND ${buildRealTransactionIntegrityClause()}
             ORDER BY timestamp`,
            [userId, fromDate, toDate]
        );

        // For now, return JSON (CSV/PDF generation would require additional libraries)
        res.json({
            success: true,
            export: {
                format: format || 'json',
                generatedAt: new Date().toISOString(),
                period: { from: fromDate, to: toDate },
                data: result.rows
            }
        });
    } catch (error: any) {
        logger.error('Export report error', { error: error.message });
        res.status(500).json({ success: false, error: 'Failed to export report' });
    }
};

/**
 * Get API keys
 */
export const getAPIKeys = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.userId;

        const result = await query(
            `SELECT id, key_name, api_key_prefix, permissions, allowed_ips,
                    rate_limit_per_minute, is_active, last_used_at, expires_at, created_at
             FROM merchant.api_keys
             WHERE merchant_id = $1 AND revoked_at IS NULL
             ORDER BY created_at DESC`,
            [userId]
        );

        res.json({ success: true, apiKeys: result.rows });
    } catch (error: any) {
        logger.error('Get API keys error', { error: error.message });
        res.status(500).json({ success: false, error: 'Failed to fetch API keys' });
    }
};

/**
 * Create API key
 */
export const createAPIKey = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.userId;
        const { keyName, permissions, allowedIps, rateLimitPerMinute, expiresAt } = req.body;

        if (!keyName) {
            return res.status(400).json({ success: false, error: 'Key name is required' });
        }

        // Generate API key
        const rawKey = `pmp_${crypto.randomBytes(32).toString('hex')}`;
        const keyPrefix = rawKey.substring(0, 12);
        const keyHash = await bcrypt.hash(rawKey, 10);

        const result = await query(
            `INSERT INTO merchant.api_keys
             (merchant_id, key_name, api_key_hash, api_key_prefix, permissions, allowed_ips, rate_limit_per_minute, expires_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING id, key_name, api_key_prefix, permissions, rate_limit_per_minute, created_at`,
            [
                userId, keyName, keyHash, keyPrefix,
                JSON.stringify(permissions || ['transactions.read']),
                allowedIps ? JSON.stringify(allowedIps) : null,
                rateLimitPerMinute || 60,
                expiresAt
            ]
        );

        logger.info('API key created', { merchantId: userId, keyName });

        // Return the raw key only once (it won't be retrievable later)
        res.status(201).json({
            success: true,
            message: 'API key created. Save this key securely - it will not be shown again.',
            apiKey: {
                ...result.rows[0],
                key: rawKey // Only shown once
            }
        });
    } catch (error: any) {
        logger.error('Create API key error', { error: error.message });
        res.status(500).json({ success: false, error: 'Failed to create API key' });
    }
};

/**
 * Revoke API key
 */
export const revokeAPIKey = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.userId;
        const { id } = req.params;

        const result = await query(
            `UPDATE merchant.api_keys SET revoked_at = NOW(), is_active = false
             WHERE id = $1 AND merchant_id = $2
             RETURNING id, key_name`,
            [id, userId]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ success: false, error: 'API key not found' });
        }

        logger.info('API key revoked', { keyId: id, merchantId: userId });

        res.json({
            success: true,
            message: 'API key revoked successfully'
        });
    } catch (error: any) {
        logger.error('Revoke API key error', { error: error.message });
        res.status(500).json({ success: false, error: 'Failed to revoke API key' });
    }
};

/**
 * Get webhooks
 */
export const getWebhooks = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.userId;

        const result = await query(
            `SELECT id, url, events, is_active, last_triggered_at, consecutive_failures, created_at
             FROM merchant.webhooks
             WHERE merchant_id = $1
             ORDER BY created_at DESC`,
            [userId]
        );

        res.json({ success: true, webhooks: result.rows });
    } catch (error: any) {
        logger.error('Get webhooks error', { error: error.message });
        res.status(500).json({ success: false, error: 'Failed to fetch webhooks' });
    }
};

/**
 * Create webhook
 */
export const createWebhook = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.userId;
        const { url, events } = req.body;

        if (!url) {
            return res.status(400).json({ success: false, error: 'URL is required' });
        }

        // Generate webhook secret
        const secret = crypto.randomBytes(32).toString('hex');
        const secretHash = await bcrypt.hash(secret, 10);

        const result = await query(
            `INSERT INTO merchant.webhooks (merchant_id, url, events, secret_hash)
             VALUES ($1, $2, $3, $4)
             RETURNING id, url, events, is_active, created_at`,
            [userId, url, JSON.stringify(events || ['transaction.approved', 'transaction.declined']), secretHash]
        );

        logger.info('Webhook created', { merchantId: userId, url });

        res.status(201).json({
            success: true,
            message: 'Webhook created. Save the secret securely.',
            webhook: {
                ...result.rows[0],
                secret // Only shown once
            }
        });
    } catch (error: any) {
        logger.error('Create webhook error', { error: error.message });
        res.status(500).json({ success: false, error: 'Failed to create webhook' });
    }
};

/**
 * Delete webhook
 */
export const deleteWebhook = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.userId;
        const { id } = req.params;

        const result = await query(
            `DELETE FROM merchant.webhooks WHERE id = $1 AND merchant_id = $2 RETURNING id`,
            [id, userId]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ success: false, error: 'Webhook not found' });
        }

        res.json({ success: true, message: 'Webhook deleted successfully' });
    } catch (error: any) {
        logger.error('Delete webhook error', { error: error.message });
        res.status(500).json({ success: false, error: 'Failed to delete webhook' });
    }
};
