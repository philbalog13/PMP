/**
 * Client Controller - PMP
 * Virtual cards and transactions for clients
 */
import { Request, Response } from 'express';
import { query } from '../config/database';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';
import { applyMerchantAccountEntry } from '../services/merchantLedger.service';
import {
    CLIENT_CARD_NETWORKS,
    CLIENT_CARD_TYPES,
    ensureAutoIssuedClientCard,
    getAdditionalCardsAllocatedBalance,
    isAutoIssuedColumnAvailable,
    isClientCardNetwork,
    isClientCardType,
    issueClientCard
} from '../services/clientCardProvisioning.service';

type ClientAccountDirection = 'CREDIT' | 'DEBIT';
type ClientAccountEntryType = 'OPENING' | 'DEPOSIT' | 'WITHDRAWAL' | 'ADJUSTMENT' | 'CARD_TOPUP';

type ClientAccountEntryInput = {
    entryType: ClientAccountEntryType;
    direction: ClientAccountDirection;
    amount: number;
    reference?: string | null;
    description?: string | null;
    metadata?: Record<string, any> | null;
    allowNegative?: boolean;
};

const CLIENT_ACCOUNT_SELECT = `
    SELECT
        id,
        client_id,
        iban,
        bic,
        account_holder_name,
        account_label,
        status,
        balance,
        available_balance,
        currency,
        daily_transfer_limit,
        monthly_transfer_limit,
        metadata,
        created_at,
        updated_at
    FROM client.bank_accounts
    WHERE client_id = $1
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

const mapClientAccountRow = (row: any) => ({
    id: row.id,
    clientId: row.client_id,
    iban: row.iban,
    bic: row.bic,
    accountHolderName: row.account_holder_name,
    accountLabel: row.account_label,
    status: row.status,
    balance: toNumber(row.balance),
    availableBalance: toNumber(row.available_balance),
    currency: row.currency,
    dailyTransferLimit: toNumber(row.daily_transfer_limit),
    monthlyTransferLimit: toNumber(row.monthly_transfer_limit),
    metadata: parseJsonColumn(row.metadata),
    createdAt: row.created_at,
    updatedAt: row.updated_at
});

const ensureClientBankAccount = async (clientId: string): Promise<void> => {
    await query(`SELECT client.ensure_bank_account_exists($1)`, [clientId]);
};

const getClientBankAccount = async (clientId: string) => {
    await ensureClientBankAccount(clientId);
    const result = await query(CLIENT_ACCOUNT_SELECT, [clientId]);

    if (result.rowCount === 0) {
        throw new Error('Client bank account not found');
    }

    return mapClientAccountRow(result.rows[0]);
};

const applyClientAccountEntry = async (
    clientId: string,
    payload: ClientAccountEntryInput
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

    const row = result.rows[0];
    return {
        entryId: row.entry_id,
        accountId: row.account_id,
        balance: toNumber(row.balance),
        availableBalance: toNumber(row.available_balance),
        currency: row.currency
    };
};

/**
 * Get client dashboard
 */
export const getDashboard = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.userId;
        await ensureAutoIssuedClientCard(userId);
        const autoIssuedColumnAvailable = await isAutoIssuedColumnAvailable();

        // Get card summary
        const cardsResult = await query(
            `SELECT
                COUNT(*) as total_cards,
                COUNT(CASE WHEN status = 'ACTIVE' THEN 1 END) as active_cards,
                COALESCE(SUM(balance), 0) as total_balance
             FROM client.virtual_cards WHERE client_id = $1`,
            [userId]
        );

        // Get today's transactions
        const txnResult = await query(
            `SELECT
                COUNT(*) as today_count,
                COALESCE(SUM(CASE WHEN status = 'APPROVED' THEN amount ELSE 0 END), 0) as today_spent
             FROM client.transactions
             WHERE client_id = $1 AND DATE(timestamp) = CURRENT_DATE`,
            [userId]
        );

        // Get recent transactions
        const recentTxn = await query(
            `SELECT id, transaction_id, masked_pan, amount, currency, type, status,
                    response_code, authorization_code, merchant_name, merchant_mcc,
                    terminal_id, timestamp
             FROM client.transactions
             WHERE client_id = $1
             ORDER BY timestamp DESC LIMIT 10`,
            [userId]
        );

        // Get active cards
        const activeCards = await query(
            `SELECT id, masked_pan, cardholder_name, card_type, network, status,
                    balance, daily_limit, daily_spent
                    ${autoIssuedColumnAvailable ? ', is_auto_issued' : ''}
             FROM client.virtual_cards
             WHERE client_id = $1 AND status = 'ACTIVE'
             ORDER BY created_at DESC LIMIT 3`,
            [userId]
        );

        res.json({
            success: true,
            dashboard: {
                cards: {
                    total: parseInt(cardsResult.rows[0].total_cards) || 0,
                    active: parseInt(cardsResult.rows[0].active_cards) || 0,
                    totalBalance: parseFloat(cardsResult.rows[0].total_balance) || 0
                },
                today: {
                    transactionCount: parseInt(txnResult.rows[0].today_count) || 0,
                    totalSpent: parseFloat(txnResult.rows[0].today_spent) || 0
                },
                recentTransactions: recentTxn.rows,
                activeCards: activeCards.rows
            }
        });
    } catch (error: any) {
        logger.error('Get client dashboard error', { error: error.message });
        res.status(500).json({ success: false, error: 'Failed to fetch dashboard' });
    }
};

/**
 * Get client bank account
 */
export const getAccount = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.userId;
        await ensureAutoIssuedClientCard(userId);

        const [account, activityResult, cardSummary] = await Promise.all([
            getClientBankAccount(userId),
            query(
                `SELECT
                    COALESCE(SUM(CASE WHEN direction = 'CREDIT' THEN amount ELSE 0 END), 0) as credits_30d,
                    COALESCE(SUM(CASE WHEN direction = 'DEBIT' THEN amount ELSE 0 END), 0) as debits_30d,
                    COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours') as entries_24h
                 FROM client.bank_account_entries
                 WHERE client_id = $1
                   AND created_at >= NOW() - INTERVAL '30 days'`,
                [userId]
            ),
            query(
                `SELECT
                    COUNT(*) as total_cards,
                    COUNT(CASE WHEN status = 'ACTIVE' THEN 1 END) as active_cards,
                    COALESCE(SUM(balance), 0) as cards_total_balance
                 FROM client.virtual_cards
                 WHERE client_id = $1`,
                [userId]
            )
        ]);

        const activity = activityResult.rows[0] || {};
        const cards = cardSummary.rows[0] || {};

        res.json({
            success: true,
            account,
            activity: {
                credits30d: toNumber(activity.credits_30d),
                debits30d: toNumber(activity.debits_30d),
                entries24h: Number.parseInt(activity.entries_24h, 10) || 0
            },
            cards: {
                total: Number.parseInt(cards.total_cards, 10) || 0,
                active: Number.parseInt(cards.active_cards, 10) || 0,
                totalBalance: toNumber(cards.cards_total_balance)
            }
        });
    } catch (error: any) {
        logger.error('Get client account error', { error: error.message });
        res.status(500).json({ success: false, error: 'Failed to fetch bank account' });
    }
};

/**
 * Update client bank account settings
 */
export const updateAccount = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.userId;
        const {
            accountLabel,
            dailyTransferLimit,
            monthlyTransferLimit,
            status
        } = req.body || {};

        const updates: string[] = [];
        const params: any[] = [];
        let index = 1;

        if (accountLabel !== undefined) {
            updates.push(`account_label = $${index}`);
            params.push(String(accountLabel).trim().slice(0, 120) || 'Compte principal');
            index++;
        }

        if (dailyTransferLimit !== undefined) {
            const parsedDaily = Number(dailyTransferLimit);
            if (!Number.isFinite(parsedDaily) || parsedDaily < 0) {
                return res.status(400).json({ success: false, error: 'dailyTransferLimit must be a non-negative number' });
            }
            updates.push(`daily_transfer_limit = $${index}`);
            params.push(parsedDaily);
            index++;
        }

        if (monthlyTransferLimit !== undefined) {
            const parsedMonthly = Number(monthlyTransferLimit);
            if (!Number.isFinite(parsedMonthly) || parsedMonthly < 0) {
                return res.status(400).json({ success: false, error: 'monthlyTransferLimit must be a non-negative number' });
            }
            updates.push(`monthly_transfer_limit = $${index}`);
            params.push(parsedMonthly);
            index++;
        }

        if (status !== undefined) {
            const allowed = ['ACTIVE', 'FROZEN'];
            if (!allowed.includes(status)) {
                return res.status(400).json({ success: false, error: 'Invalid account status' });
            }
            updates.push(`status = $${index}`);
            params.push(status);
            index++;
        }

        if (updates.length === 0) {
            return res.status(400).json({ success: false, error: 'No account field to update' });
        }

        await ensureClientBankAccount(userId);

        params.push(userId);
        const result = await query(
            `UPDATE client.bank_accounts
             SET ${updates.join(', ')}, updated_at = NOW()
             WHERE client_id = $${index}
             RETURNING *`,
            params
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ success: false, error: 'Bank account not found' });
        }

        res.json({
            success: true,
            message: 'Bank account updated',
            account: mapClientAccountRow(result.rows[0])
        });
    } catch (error: any) {
        logger.error('Update client account error', { error: error.message });
        res.status(500).json({ success: false, error: 'Failed to update bank account' });
    }
};

/**
 * Get client bank account entries
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
        const fromDate = req.query.fromDate as string;
        const toDate = req.query.toDate as string;

        const whereConditions = ['client_id = $1'];
        const params: any[] = [userId];
        let index = 2;

        if (type) {
            whereConditions.push(`entry_type = $${index}`);
            params.push(type);
            index++;
        }

        if (direction) {
            whereConditions.push(`direction = $${index}`);
            params.push(direction);
            index++;
        }

        if (fromDate) {
            whereConditions.push(`created_at >= $${index}`);
            params.push(fromDate);
            index++;
        }

        if (toDate) {
            whereConditions.push(`created_at <= $${index}`);
            params.push(toDate);
            index++;
        }

        const whereClause = whereConditions.join(' AND ');

        const [countResult, entriesResult] = await Promise.all([
            query(
                `SELECT COUNT(*) as total
                 FROM client.bank_account_entries
                 WHERE ${whereClause}`,
                params
            ),
            query(
                `SELECT
                    id,
                    account_id,
                    entry_type,
                    direction,
                    amount,
                    currency,
                    balance_before,
                    balance_after,
                    reference,
                    description,
                    metadata,
                    created_at
                 FROM client.bank_account_entries
                 WHERE ${whereClause}
                 ORDER BY created_at DESC
                 LIMIT $${index} OFFSET $${index + 1}`,
                [...params, limit, offset]
            )
        ]);

        const total = Number.parseInt(countResult.rows[0]?.total, 10) || 0;

        res.json({
            success: true,
            entries: entriesResult.rows.map((entry) => ({
                id: entry.id,
                accountId: entry.account_id,
                type: entry.entry_type,
                direction: entry.direction,
                amount: toNumber(entry.amount),
                currency: entry.currency,
                balanceBefore: toNumber(entry.balance_before),
                balanceAfter: toNumber(entry.balance_after),
                reference: entry.reference,
                description: entry.description,
                metadata: parseJsonColumn(entry.metadata),
                createdAt: entry.created_at
            })),
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.max(Math.ceil(total / limit), 1)
            }
        });
    } catch (error: any) {
        logger.error('Get client account entries error', { error: error.message });
        res.status(500).json({ success: false, error: 'Failed to fetch account entries' });
    }
};

/**
 * Deposit on client account
 */
export const deposit = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.userId;
        const { amount, reference, description } = req.body || {};
        const normalizedAmount = normalizePositiveAmount(amount);

        if (normalizedAmount === null) {
            return res.status(400).json({ success: false, error: 'amount must be a positive number' });
        }

        const entry = await applyClientAccountEntry(userId, {
            entryType: 'DEPOSIT',
            direction: 'CREDIT',
            amount: normalizedAmount,
            reference: reference || 'DEPOSIT',
            description: description || 'Manual deposit on client account',
            metadata: { source: 'client-ui' },
            allowNegative: false
        });

        const account = await getClientBankAccount(userId);
        await ensureAutoIssuedClientCard(userId);

        res.json({
            success: true,
            message: 'Deposit applied',
            entry,
            account
        });
    } catch (error: any) {
        if (error.code === 'P0001' || error.code === '22003' || error.code === '22023') {
            return res.status(400).json({ success: false, error: error.message });
        }

        logger.error('Client deposit error', { error: error.message });
        res.status(500).json({ success: false, error: 'Failed to apply deposit' });
    }
};

/**
 * Withdraw from client account
 */
export const withdraw = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.userId;
        const { amount, reference, description } = req.body || {};
        const normalizedAmount = normalizePositiveAmount(amount);

        if (normalizedAmount === null) {
            return res.status(400).json({ success: false, error: 'amount must be a positive number' });
        }

        const entry = await applyClientAccountEntry(userId, {
            entryType: 'WITHDRAWAL',
            direction: 'DEBIT',
            amount: normalizedAmount,
            reference: reference || 'WITHDRAWAL',
            description: description || 'Manual withdrawal on client account',
            metadata: { source: 'client-ui' },
            allowNegative: false
        });

        const account = await getClientBankAccount(userId);
        await ensureAutoIssuedClientCard(userId);

        res.json({
            success: true,
            message: 'Withdrawal applied',
            entry,
            account
        });
    } catch (error: any) {
        if (error.code === 'P0001' || error.code === '22003' || error.code === '22023') {
            return res.status(400).json({ success: false, error: error.message });
        }

        logger.error('Client withdrawal error', { error: error.message });
        res.status(500).json({ success: false, error: 'Failed to apply withdrawal' });
    }
};

/**
 * Create an additional client card
 */
export const createCard = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.userId;
        const {
            amount,
            cardholderName,
            cardType,
            network
        } = req.body || {};

        const normalizedAmount = normalizePositiveAmount(amount);
        if (normalizedAmount === null) {
            return res.status(400).json({ success: false, error: 'amount must be a positive number' });
        }

        const normalizedCardType = cardType ? String(cardType).toUpperCase() : 'PREPAID';
        if (!isClientCardType(normalizedCardType)) {
            return res.status(400).json({
                success: false,
                error: `Invalid cardType. Allowed values: ${CLIENT_CARD_TYPES.join(', ')}`
            });
        }

        const normalizedNetwork = network ? String(network).toUpperCase() : 'VISA';
        if (!isClientCardNetwork(normalizedNetwork)) {
            return res.status(400).json({
                success: false,
                error: `Invalid network. Allowed values: ${CLIENT_CARD_NETWORKS.join(', ')}`
            });
        }

        await ensureAutoIssuedClientCard(userId);
        const account = await getClientBankAccount(userId);
        const allocatedBalance = await getAdditionalCardsAllocatedBalance(userId);

        const accountBalanceCents = Math.round(account.balance * 100);
        const allocatedBalanceCents = Math.round(allocatedBalance * 100);
        const requestedAmountCents = Math.round(normalizedAmount * 100);

        if (allocatedBalanceCents + requestedAmountCents > accountBalanceCents) {
            return res.status(400).json({
                success: false,
                error: 'Allocated amount across generated cards exceeds account balance',
                details: {
                    accountBalance: account.balance,
                    alreadyAllocatedOnGeneratedCards: allocatedBalance,
                    requestedAmount: normalizedAmount,
                    remainingAllocatableAmount: Math.max((accountBalanceCents - allocatedBalanceCents) / 100, 0)
                }
            });
        }

        const card = await issueClientCard({
            clientId: userId,
            amount: normalizedAmount,
            cardholderName: typeof cardholderName === 'string' ? cardholderName : null,
            cardType: normalizedCardType,
            network: normalizedNetwork,
            isAutoIssued: false
        });

        const allocatedAfter = Math.round((allocatedBalance + normalizedAmount) * 100) / 100;

        res.status(201).json({
            success: true,
            message: 'Card created',
            card,
            allocation: {
                accountBalance: account.balance,
                allocatedBefore: allocatedBalance,
                allocatedAfter,
                remainingAllocatableAmount: Math.max(Math.round((account.balance - allocatedAfter) * 100) / 100, 0)
            }
        });
    } catch (error: any) {
        logger.error('Create client card error', { error: error.message });
        res.status(500).json({ success: false, error: 'Failed to create card' });
    }
};

/**
 * Get my cards
 */
export const getMyCards = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.userId;
        const status = req.query.status as string;

        await ensureAutoIssuedClientCard(userId);
        const autoIssuedColumnAvailable = await isAutoIssuedColumnAvailable();

        let whereClause = 'client_id = $1';
        const params: any[] = [userId];

        if (status) {
            whereClause += ' AND status = $2';
            params.push(status);
        }

        const result = await query(
            `SELECT id, masked_pan, cardholder_name, expiry_date, card_type, network, status,
                    daily_limit, monthly_limit, single_txn_limit, daily_spent, monthly_spent,
                    threeds_enrolled, contactless_enabled, international_enabled, ecommerce_enabled,
                    balance, currency, issue_date, last_used_date
                    ${autoIssuedColumnAvailable ? ', is_auto_issued' : ''}
             FROM client.virtual_cards
             WHERE ${whereClause}
             ORDER BY created_at DESC`,
            params
        );

        res.json({ success: true, cards: result.rows });
    } catch (error: any) {
        logger.error('Get my cards error', { error: error.message });
        res.status(500).json({ success: false, error: 'Failed to fetch cards' });
    }
};

/**
 * Get card by ID
 */
export const getCardById = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.userId;
        const { id } = req.params;
        const autoIssuedColumnAvailable = await isAutoIssuedColumnAvailable();

        const result = await query(
            `SELECT id, masked_pan, cardholder_name, expiry_date, card_type, network, status,
                    daily_limit, monthly_limit, single_txn_limit, daily_spent, monthly_spent,
                    threeds_enrolled, contactless_enabled, international_enabled, ecommerce_enabled,
                    balance, currency, issue_date, last_used_date, created_at
                    ${autoIssuedColumnAvailable ? ', is_auto_issued' : ''}
             FROM client.virtual_cards
             WHERE id = $1 AND client_id = $2`,
            [id, userId]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ success: false, error: 'Card not found' });
        }

        // Get recent transactions for this card
        const txnResult = await query(
            `SELECT id, transaction_id, amount, currency, type, status, merchant_name, timestamp
             FROM client.transactions
             WHERE card_id = $1
             ORDER BY timestamp DESC LIMIT 10`,
            [id]
        );

        res.json({
            success: true,
            card: result.rows[0],
            recentTransactions: txnResult.rows
        });
    } catch (error: any) {
        logger.error('Get card by ID error', { error: error.message });
        res.status(500).json({ success: false, error: 'Failed to fetch card' });
    }
};

/**
 * Update card limits
 */
export const updateCardLimits = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.userId;
        const { id } = req.params;
        const { dailyLimit, monthlyLimit, singleTxnLimit } = req.body;

        // Check ownership
        const check = await query(
            'SELECT id FROM client.virtual_cards WHERE id = $1 AND client_id = $2',
            [id, userId]
        );

        if (check.rowCount === 0) {
            return res.status(404).json({ success: false, error: 'Card not found' });
        }

        const updates: string[] = [];
        const params: any[] = [];
        let paramIndex = 1;

        if (dailyLimit !== undefined) {
            updates.push(`daily_limit = $${paramIndex}`);
            params.push(dailyLimit);
            paramIndex++;
        }
        if (monthlyLimit !== undefined) {
            updates.push(`monthly_limit = $${paramIndex}`);
            params.push(monthlyLimit);
            paramIndex++;
        }
        if (singleTxnLimit !== undefined) {
            updates.push(`single_txn_limit = $${paramIndex}`);
            params.push(singleTxnLimit);
            paramIndex++;
        }

        if (updates.length === 0) {
            return res.status(400).json({ success: false, error: 'No limits to update' });
        }

        params.push(id);

        const result = await query(
            `UPDATE client.virtual_cards SET ${updates.join(', ')}, updated_at = NOW()
             WHERE id = $${paramIndex}
             RETURNING id, masked_pan, daily_limit, monthly_limit, single_txn_limit`,
            params
        );

        res.json({
            success: true,
            message: 'Card limits updated',
            card: result.rows[0]
        });
    } catch (error: any) {
        logger.error('Update card limits error', { error: error.message });
        res.status(500).json({ success: false, error: 'Failed to update limits' });
    }
};

/**
 * Toggle card block status
 */
export const toggleCardBlock = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.userId;
        const { id } = req.params;
        const { blocked } = req.body;

        // Check ownership
        const check = await query(
            'SELECT id, status FROM client.virtual_cards WHERE id = $1 AND client_id = $2',
            [id, userId]
        );

        if (check.rowCount === 0) {
            return res.status(404).json({ success: false, error: 'Card not found' });
        }

        const newStatus = blocked ? 'BLOCKED' : 'ACTIVE';

        const result = await query(
            `UPDATE client.virtual_cards SET status = $1, updated_at = NOW()
             WHERE id = $2
             RETURNING id, masked_pan, status`,
            [newStatus, id]
        );

        logger.info('Card status changed', { cardId: id, newStatus, userId });

        res.json({
            success: true,
            message: blocked ? 'Card blocked' : 'Card unblocked',
            card: result.rows[0]
        });
    } catch (error: any) {
        logger.error('Toggle card block error', { error: error.message });
        res.status(500).json({ success: false, error: 'Failed to update card status' });
    }
};

/**
 * Update card features
 */
export const updateCardFeatures = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.userId;
        const { id } = req.params;
        const { contactlessEnabled, internationalEnabled, ecommerceEnabled, threedsEnrolled } = req.body;

        // Check ownership
        const check = await query(
            'SELECT id FROM client.virtual_cards WHERE id = $1 AND client_id = $2',
            [id, userId]
        );

        if (check.rowCount === 0) {
            return res.status(404).json({ success: false, error: 'Card not found' });
        }

        const updates: string[] = [];
        const params: any[] = [];
        let paramIndex = 1;

        if (contactlessEnabled !== undefined) {
            updates.push(`contactless_enabled = $${paramIndex}`);
            params.push(contactlessEnabled);
            paramIndex++;
        }
        if (internationalEnabled !== undefined) {
            updates.push(`international_enabled = $${paramIndex}`);
            params.push(internationalEnabled);
            paramIndex++;
        }
        if (ecommerceEnabled !== undefined) {
            updates.push(`ecommerce_enabled = $${paramIndex}`);
            params.push(ecommerceEnabled);
            paramIndex++;
        }
        if (threedsEnrolled !== undefined) {
            updates.push(`threeds_enrolled = $${paramIndex}`);
            params.push(threedsEnrolled);
            paramIndex++;
        }

        if (updates.length === 0) {
            return res.status(400).json({ success: false, error: 'No features to update' });
        }

        params.push(id);

        const result = await query(
            `UPDATE client.virtual_cards SET ${updates.join(', ')}, updated_at = NOW()
             WHERE id = $${paramIndex}
             RETURNING id, masked_pan, contactless_enabled, international_enabled, ecommerce_enabled, threeds_enrolled`,
            params
        );

        res.json({
            success: true,
            message: 'Card features updated',
            card: result.rows[0]
        });
    } catch (error: any) {
        logger.error('Update card features error', { error: error.message });
        res.status(500).json({ success: false, error: 'Failed to update features' });
    }
};

/**
 * Get my transactions
 */
export const getMyTransactions = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.userId;
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const offset = (page - 1) * limit;
        const status = req.query.status as string;
        const cardId = req.query.cardId as string;
        const fromDate = req.query.fromDate as string;
        const toDate = req.query.toDate as string;

        let whereConditions = ['client_id = $1'];
        let params: any[] = [userId];
        let paramIndex = 2;

        if (status) {
            whereConditions.push(`status = $${paramIndex}`);
            params.push(status);
            paramIndex++;
        }
        if (cardId) {
            whereConditions.push(`card_id = $${paramIndex}`);
            params.push(cardId);
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

        const whereClause = whereConditions.join(' AND ');

        const countResult = await query(
            `SELECT COUNT(*) FROM client.transactions WHERE ${whereClause}`,
            params
        );

        const result = await query(
            `SELECT id, transaction_id, stan, masked_pan, amount, currency, type, status,
                    response_code, authorization_code, merchant_name, merchant_mcc,
                    merchant_location, terminal_id, threeds_version, threeds_status,
                    eci, fraud_score, timestamp, settled_at, created_at
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
        logger.error('Get my transactions error', { error: error.message });
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
            `SELECT * FROM client.transactions WHERE id = $1 AND client_id = $2`,
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
 * List available merchants for payment
 */
export const listMerchants = async (req: Request, res: Response) => {
    try {
        const result = await query(
            `SELECT u.id, u.username, u.email, u.first_name, u.last_name,
                    t.terminal_id, t.merchant_name, t.mcc, t.location_name, t.city
             FROM users.users u
             LEFT JOIN merchant.pos_terminals t ON t.merchant_id = u.id AND t.status = 'ACTIVE'
             WHERE u.role = 'ROLE_MARCHAND' AND UPPER(u.status) = 'ACTIVE'
             ORDER BY u.username`
        );

        // Group by merchant
        const merchantMap = new Map<string, any>();
        for (const row of result.rows) {
            if (!merchantMap.has(row.id)) {
                merchantMap.set(row.id, {
                    id: row.id,
                    username: row.username,
                    email: row.email,
                    firstName: row.first_name,
                    lastName: row.last_name,
                    displayName: row.first_name && row.last_name
                        ? `${row.first_name} ${row.last_name}`
                        : row.username,
                    terminals: []
                });
            }
            if (row.terminal_id) {
                merchantMap.get(row.id).terminals.push({
                    terminalId: row.terminal_id,
                    merchantName: row.merchant_name,
                    mcc: row.mcc,
                    locationName: row.location_name,
                    city: row.city
                });
            }
        }

        res.json({ success: true, merchants: Array.from(merchantMap.values()) });
    } catch (error: any) {
        logger.error('List merchants error', { error: error.message });
        res.status(500).json({ success: false, error: 'Failed to fetch merchants' });
    }
};

/**
 * Simulate a payment with full timeline tracking
 */
export const simulatePayment = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.userId;
        const { cardId, amount, merchantId, merchantName, merchantMcc, paymentType, use3DS } = req.body;

        if (!cardId || !amount) {
            return res.status(400).json({ success: false, error: 'Missing required fields (cardId, amount)' });
        }

        const processingSteps: any[] = [];
        const startTime = Date.now();
        let stepStart = startTime;

        const addStep = (name: string, category: string, status: string, details: any = {}) => {
            const now = Date.now();
            processingSteps.push({
                step: processingSteps.length + 1,
                name,
                category,
                status,
                timestamp: new Date(now).toISOString(),
                duration_ms: now - stepStart,
                details
            });
            stepStart = now;
        };

        // Step 1: Transaction Initiated
        addStep('Transaction Initiated', 'process', 'success', {
            amount, currency: 'EUR', paymentType: paymentType || 'PURCHASE'
        });

        // Resolve merchant
        let resolvedMerchantId = merchantId || null;
        let resolvedMerchantName = merchantName || 'Unknown Merchant';
        let resolvedMerchantMcc = merchantMcc || '5411';
        let resolvedTerminalId: string | null = null;

        if (merchantId) {
            const merchantResult = await query(
                `SELECT u.id, u.username, u.first_name, u.last_name,
                        t.terminal_id, t.merchant_name, t.mcc, t.location_name
                 FROM users.users u
                 LEFT JOIN merchant.pos_terminals t ON t.merchant_id = u.id AND t.status = 'ACTIVE'
                 WHERE u.id = $1 AND u.role = 'ROLE_MARCHAND' AND UPPER(u.status) = 'ACTIVE'
                 LIMIT 1`,
                [merchantId]
            );

            if (merchantResult.rowCount === 0) {
                return res.status(404).json({ success: false, error: 'Merchant not found or inactive' });
            }

            const merchant = merchantResult.rows[0];
            resolvedMerchantName = merchant.merchant_name || merchant.first_name + ' ' + merchant.last_name || merchant.username;
            resolvedMerchantMcc = merchant.mcc || '5411';
            resolvedTerminalId = merchant.terminal_id || null;
        }

        addStep('Merchant Resolution', 'process', 'success', {
            merchantId: resolvedMerchantId,
            merchantName: resolvedMerchantName,
            mcc: resolvedMerchantMcc,
            terminalId: resolvedTerminalId
        });

        // Get card
        const cardResult = await query(
            `SELECT * FROM client.virtual_cards WHERE id = $1 AND client_id = $2`,
            [cardId, userId]
        );

        if (cardResult.rowCount === 0) {
            return res.status(404).json({ success: false, error: 'Card not found' });
        }

        const card = cardResult.rows[0];
        const autoIssuedColumnAvailable = await isAutoIssuedColumnAvailable();
        const isAutoIssuedCard = autoIssuedColumnAvailable && Boolean(card.is_auto_issued);
        let accountBalanceBefore: number | null = null;

        if (isAutoIssuedCard) {
            const account = await getClientBankAccount(userId);
            accountBalanceBefore = account.balance;
        }

        // Step 2: Card Validation
        if (card.status !== 'ACTIVE') {
            addStep('Card Validation', 'security', 'failed', {
                cardStatus: card.status, reason: 'Card is not active'
            });
            return res.status(400).json({
                success: false, error: 'Card is not active', responseCode: '14',
                processingSteps
            });
        }
        addStep('Card Validation', 'security', 'success', {
            cardStatus: card.status, cardType: card.card_type, network: card.network,
            maskedPan: card.masked_pan,
            fundingSource: isAutoIssuedCard ? 'BANK_ACCOUNT' : 'CARD_ALLOCATION'
        });

        // Step 3: Limit Checks
        const parsedAmount = parseFloat(amount);
        if (parsedAmount > parseFloat(card.single_txn_limit)) {
            addStep('Limit Verification', 'decision', 'failed', {
                singleTxnLimit: parseFloat(card.single_txn_limit), amount: parsedAmount,
                reason: 'Amount exceeds single transaction limit'
            });
            return res.status(400).json({
                success: false, error: 'Amount exceeds single transaction limit', responseCode: '61',
                processingSteps
            });
        }

        if (parseFloat(card.daily_spent) + parsedAmount > parseFloat(card.daily_limit)) {
            addStep('Limit Verification', 'decision', 'failed', {
                dailyLimit: parseFloat(card.daily_limit), dailySpent: parseFloat(card.daily_spent),
                amount: parsedAmount, reason: 'Daily limit exceeded'
            });
            return res.status(400).json({
                success: false, error: 'Daily limit exceeded', responseCode: '65',
                processingSteps
            });
        }

        addStep('Limit Verification', 'decision', 'success', {
            singleTxnLimit: parseFloat(card.single_txn_limit),
            dailyLimit: parseFloat(card.daily_limit),
            dailySpent: parseFloat(card.daily_spent),
            monthlyLimit: parseFloat(card.monthly_limit),
            monthlySpent: parseFloat(card.monthly_spent),
            remainingDaily: parseFloat(card.daily_limit) - parseFloat(card.daily_spent) - parsedAmount,
            amount: parsedAmount
        });

        // Step 4: Balance Check
        const availableBalance = isAutoIssuedCard
            ? (accountBalanceBefore ?? 0)
            : parseFloat(card.balance);

        if (parsedAmount > availableBalance) {
            addStep('Balance Check', 'decision', 'failed', {
                availableBalance,
                requestedAmount: parsedAmount,
                fundingSource: isAutoIssuedCard ? 'BANK_ACCOUNT' : 'CARD_ALLOCATION',
                reason: 'Insufficient funds'
            });
            return res.status(400).json({
                success: false, error: 'Insufficient funds', responseCode: '51',
                processingSteps
            });
        }

        addStep('Balance Check', 'decision', 'success', {
            availableBalance,
            requestedAmount: parsedAmount,
            balanceAfter: availableBalance - parsedAmount,
            fundingSource: isAutoIssuedCard ? 'BANK_ACCOUNT' : 'CARD_ALLOCATION'
        });

        // Step 5: Fraud Detection (simulated realistic scores)
        const fraudScore = Math.round(Math.random() * 25);
        const fraudRulesChecked = ['VELOCITY_CHECK', 'AMOUNT_PATTERN', 'GEO_CHECK', 'DEVICE_FINGERPRINT', 'BIN_RISK', 'MERCHANT_RISK', 'TIME_PATTERN', 'FREQUENCY_CHECK'];
        const fraudRulesTriggered: string[] = [];
        if (fraudScore > 20) fraudRulesTriggered.push('ELEVATED_RISK_SCORE');
        if (parsedAmount > 500) fraudRulesTriggered.push('HIGH_AMOUNT');
        const riskLevel = fraudScore < 10 ? 'LOW' : fraudScore < 20 ? 'MEDIUM' : 'HIGH';

        addStep('Fraud Detection', 'security', 'success', {
            score: fraudScore,
            riskLevel,
            rulesChecked: fraudRulesChecked.length,
            rulesTriggered: fraudRulesTriggered,
            recommendation: 'APPROVE',
            model: 'RULE_ENGINE_V2'
        });

        // Step 6: 3DS Authentication
        let threedsStatus: string | null = null;
        let threedsVersion: string | null = null;
        let eci: string | null = null;

        if (use3DS && card.threeds_enrolled) {
            threedsVersion = '2.2.0';
            threedsStatus = 'Y';
            eci = '05';
            addStep('3DS Authentication', 'security', 'success', {
                version: '2.2.0',
                transStatus: 'Y',
                eci: '05',
                authMethod: parsedAmount < 30 ? 'FRICTIONLESS' : 'CHALLENGE',
                dsTransId: uuidv4(),
                acsTransId: uuidv4()
            });
        } else if (use3DS && !card.threeds_enrolled) {
            addStep('3DS Authentication', 'security', 'skipped', {
                reason: 'Card not enrolled in 3DS'
            });
        }

        // Step 7: Authorization Decision
        const transactionId = `TXN${Date.now()}${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
        const authCode = Math.random().toString(36).substr(2, 6).toUpperCase();
        const stan = String(Math.floor(Math.random() * 1000000)).padStart(6, '0');

        addStep('Authorization Decision', 'decision', 'approved', {
            responseCode: '00',
            authorizationCode: authCode,
            transactionId,
            stan,
            isoMTI: '0110'
        });

        // Create transaction
        const txnResult = await query(
            `INSERT INTO client.transactions
             (transaction_id, stan, card_id, masked_pan, client_id, merchant_id, amount, currency, type, status,
              response_code, authorization_code, merchant_name, merchant_mcc, terminal_id,
              threeds_version, threeds_status, eci, fraud_score, processing_steps)
             VALUES ($1, $2, $3, $4, $5, $6, $7, 'EUR', $8, 'APPROVED', '00', $9, $10, $11, $12,
                     $13, $14, $15, $16, $17::jsonb)
             RETURNING *`,
            [
                transactionId, stan, cardId, card.masked_pan, userId, resolvedMerchantId,
                parsedAmount, paymentType || 'PURCHASE', authCode,
                resolvedMerchantName, resolvedMerchantMcc, resolvedTerminalId,
                threedsVersion, threedsStatus, eci, fraudScore,
                JSON.stringify([]) // placeholder, will update at end
            ]
        );

        // Step 8: Card Balance Debit
        const balanceBefore = availableBalance;
        let balanceAfter = balanceBefore - parsedAmount;

        if (isAutoIssuedCard) {
            const accountEntry = await applyClientAccountEntry(userId, {
                entryType: 'WITHDRAWAL',
                direction: 'DEBIT',
                amount: parsedAmount,
                reference: transactionId,
                description: `Card payment from auto-issued card ${card.masked_pan}`,
                metadata: {
                    source: 'auto-issued-card-payment',
                    cardId,
                    merchantId: resolvedMerchantId || null
                },
                allowNegative: false
            });

            balanceAfter = accountEntry.balance;

            await query(
                `UPDATE client.virtual_cards
                 SET balance = $1,
                     daily_spent = daily_spent + $2,
                     monthly_spent = monthly_spent + $2,
                     last_used_date = NOW()
                 WHERE id = $3`,
                [balanceAfter, parsedAmount, cardId]
            );
        } else {
            await query(
                `UPDATE client.virtual_cards
                 SET balance = balance - $1,
                     daily_spent = daily_spent + $1,
                     monthly_spent = monthly_spent + $1,
                     last_used_date = NOW()
                 WHERE id = $2`,
                [parsedAmount, cardId]
            );
        }

        addStep('Card Balance Debit', 'data', 'success', {
            balanceBefore,
            balanceAfter,
            dailySpentAfter: parseFloat(card.daily_spent) + parsedAmount,
            monthlySpentAfter: parseFloat(card.monthly_spent) + parsedAmount,
            fundingSource: isAutoIssuedCard ? 'BANK_ACCOUNT' : 'CARD_ALLOCATION'
        });

        // Step 9: Merchant Ledger Booking
        let ledgerBooked = false;
        let ledgerDetails: any = {};

        if (resolvedMerchantId) {
            try {
                const ledgerResult = await applyMerchantAccountEntry(resolvedMerchantId, {
                    entryType: 'PURCHASE',
                    direction: 'CREDIT',
                    bucket: 'PENDING',
                    amount: parsedAmount,
                    relatedTransactionId: transactionId,
                    reference: resolvedTerminalId || 'TPE_WEB',
                    description: `Purchase payment from client card ${card.masked_pan}`,
                    metadata: {
                        clientId: userId,
                        cardMaskedPan: card.masked_pan,
                        stan,
                        paymentMethod: 'CARD_NOT_PRESENT'
                    },
                    allowNegative: false
                });

                ledgerBooked = true;
                ledgerDetails = {
                    bucket: 'PENDING',
                    entryType: 'PURCHASE',
                    pendingBalanceAfter: ledgerResult.pendingBalance,
                    entryId: ledgerResult.entryId
                };
            } catch (ledgerError: any) {
                logger.error('Merchant ledger booking failed', {
                    transactionId, merchantId: resolvedMerchantId, error: ledgerError.message
                });
                ledgerDetails = { error: 'Ledger booking failed', reason: ledgerError.message };
            }
        }

        addStep('Merchant Ledger Booking', 'data', ledgerBooked ? 'success' : 'warning', {
            merchantId: resolvedMerchantId,
            merchantName: resolvedMerchantName,
            ...ledgerDetails
        });

        // Step 10: Settlement Queued
        addStep('Settlement Queued', 'process', 'queued', {
            estimatedSettlement: 'T+1',
            settlementMethod: 'BATCH',
            status: 'PENDING'
        });

        // Update transaction with full processing_steps
        await query(
            `UPDATE client.transactions SET processing_steps = $1::jsonb WHERE transaction_id = $2`,
            [JSON.stringify(processingSteps), transactionId]
        );

        logger.info('Payment simulated with timeline', {
            transactionId, amount: parsedAmount, cardId: card.masked_pan,
            merchantId: resolvedMerchantId, ledgerBooked, steps: processingSteps.length
        });

        res.json({
            success: true,
            message: 'Payment approved',
            transaction: { ...txnResult.rows[0], processing_steps: processingSteps },
            ledgerBooked,
            _educational: {
                isoMessage: {
                    mti: '0100',
                    de2: card.masked_pan,
                    de3: '000000',
                    de4: String(Math.round(parsedAmount * 100)).padStart(12, '0'),
                    de11: stan,
                    de38: authCode,
                    de39: '00'
                },
                note: 'This simulates an ISO 8583 authorization request'
            }
        });
    } catch (error: any) {
        logger.error('Simulate payment error', { error: error.message });
        res.status(500).json({ success: false, error: 'Payment simulation failed' });
    }
};

/**
 * Generate retrospective timeline for old transactions
 */
const generateRetrospectiveTimeline = (txn: any): any[] => {
    const steps: any[] = [];
    const baseTime = new Date(txn.timestamp || txn.created_at).getTime();
    let elapsed = 0;

    const addRetroStep = (name: string, category: string, status: string, durationMs: number, details: any = {}) => {
        elapsed += durationMs;
        steps.push({
            step: steps.length + 1,
            name,
            category,
            status,
            timestamp: new Date(baseTime - 200 + elapsed).toISOString(),
            duration_ms: durationMs,
            details
        });
    };

    const isApproved = txn.status === 'APPROVED';
    const amount = parseFloat(txn.amount);

    addRetroStep('Transaction Initiated', 'process', 'success', 0, {
        amount, currency: txn.currency || 'EUR',
        merchantName: txn.merchant_name,
        paymentType: txn.type
    });

    addRetroStep('Card Validation', 'security', 'success', 12, {
        maskedPan: txn.masked_pan,
        status: 'ACTIVE'
    });

    addRetroStep('Limit Verification', 'decision', isApproved ? 'success' : (txn.response_code === '61' || txn.response_code === '65' ? 'failed' : 'success'), 3, {
        amount
    });

    addRetroStep('Balance Check', 'decision', isApproved ? 'success' : (txn.response_code === '51' ? 'failed' : 'success'), 3, {
        requestedAmount: amount
    });

    const fraudScore = txn.fraud_score ? parseFloat(txn.fraud_score) : Math.round(Math.random() * 15 * 100) / 100;
    addRetroStep('Fraud Detection', 'security', 'success', 17, {
        score: fraudScore,
        riskLevel: fraudScore < 10 ? 'LOW' : fraudScore < 20 ? 'MEDIUM' : 'HIGH',
        rulesTriggered: txn.fraud_rules_triggered || [],
        recommendation: isApproved ? 'APPROVE' : 'REVIEW'
    });

    if (txn.threeds_status) {
        addRetroStep('3DS Authentication', 'security',
            txn.threeds_status === 'Y' ? 'success' : 'failed', 20, {
            version: txn.threeds_version || '2.2.0',
            transStatus: txn.threeds_status,
            eci: txn.eci
        });
    }

    addRetroStep('Authorization Decision', 'decision', isApproved ? 'approved' : 'declined', 5, {
        responseCode: txn.response_code,
        authorizationCode: txn.authorization_code || null,
        isoMTI: '0110'
    });

    if (isApproved) {
        addRetroStep('Card Balance Debit', 'data', 'success', 10, {
            amount
        });

        if (txn.merchant_id) {
            addRetroStep('Merchant Ledger Booking', 'data', 'success', 15, {
                merchantName: txn.merchant_name,
                bucket: 'PENDING',
                entryType: 'PURCHASE'
            });
        }

        addRetroStep('Settlement Queued', 'process', txn.settled_at ? 'settled' : 'queued', 5, {
            estimatedSettlement: 'T+1',
            settledAt: txn.settled_at || null,
            status: txn.settled_at ? 'SETTLED' : 'PENDING'
        });
    }

    return steps;
};

/**
 * Get transaction timeline
 */
export const getTransactionTimeline = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.userId;
        const { id } = req.params;

        const result = await query(
            `SELECT * FROM client.transactions WHERE id = $1 AND client_id = $2`,
            [id, userId]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ success: false, error: 'Transaction not found' });
        }

        const txn = result.rows[0];
        let timeline = txn.processing_steps;

        // Parse if string
        if (typeof timeline === 'string') {
            try { timeline = JSON.parse(timeline); } catch { timeline = []; }
        }

        // Generate retrospective timeline if empty
        if (!timeline || !Array.isArray(timeline) || timeline.length === 0) {
            timeline = generateRetrospectiveTimeline(txn);
        }

        res.json({ success: true, transaction: txn, timeline });
    } catch (error: any) {
        logger.error('Get transaction timeline error', { error: error.message });
        res.status(500).json({ success: false, error: 'Failed to fetch transaction timeline' });
    }
};

/**
 * Get security settings
 */
export const getSecuritySettings = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.userId;

        // Get 2FA status from users table
        const userResult = await query(
            'SELECT totp_enabled FROM users.users WHERE id = $1',
            [userId]
        );

        // Get cards with their security features
        const cardsResult = await query(
            `SELECT id, masked_pan, card_type, threeds_enrolled, contactless_enabled,
                    international_enabled, ecommerce_enabled, status
             FROM client.virtual_cards WHERE client_id = $1`,
            [userId]
        );

        res.json({
            success: true,
            security: {
                twoFactorEnabled: userResult.rows[0]?.totp_enabled || false,
                cards: cardsResult.rows
            }
        });
    } catch (error: any) {
        logger.error('Get security settings error', { error: error.message });
        res.status(500).json({ success: false, error: 'Failed to fetch security settings' });
    }
};

/**
 * Update security settings
 */
export const updateSecuritySettings = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.userId;
        const { cardSecurityUpdates } = req.body;

        if (!cardSecurityUpdates || !Array.isArray(cardSecurityUpdates)) {
            return res.status(400).json({ success: false, error: 'Card security updates required' });
        }

        const updates: any[] = [];
        for (const update of cardSecurityUpdates) {
            const { cardId, ...settings } = update;
            if (!cardId) continue;

            // Verify ownership and update
            const result = await query(
                `UPDATE client.virtual_cards
                 SET threeds_enrolled = COALESCE($2, threeds_enrolled),
                     contactless_enabled = COALESCE($3, contactless_enabled),
                     international_enabled = COALESCE($4, international_enabled),
                     ecommerce_enabled = COALESCE($5, ecommerce_enabled),
                     updated_at = NOW()
                 WHERE id = $1 AND client_id = $6
                 RETURNING id, masked_pan`,
                [
                    cardId,
                    settings.threedsEnrolled,
                    settings.contactlessEnabled,
                    settings.internationalEnabled,
                    settings.ecommerceEnabled,
                    userId
                ]
            );

            if (result.rowCount && result.rowCount > 0) {
                updates.push(result.rows[0]);
            }
        }

        res.json({
            success: true,
            message: `Updated security settings for ${updates.length} card(s)`,
            updatedCards: updates
        });
    } catch (error: any) {
        logger.error('Update security settings error', { error: error.message });
        res.status(500).json({ success: false, error: 'Failed to update security settings' });
    }
};
