/**
 * Client Controller - PMP
 * Virtual cards and transactions for clients
 */
import { Request, Response } from 'express';
import { query } from '../config/database';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcrypt';

/**
 * Generate a mock PAN
 */
function generatePAN(): string {
    const prefix = '4916'; // Visa test range
    let pan = prefix;
    for (let i = 0; i < 12; i++) {
        pan += Math.floor(Math.random() * 10);
    }
    return pan;
}

/**
 * Mask PAN (show first 4 and last 4)
 */
function maskPAN(pan: string): string {
    return pan.substring(0, 4) + '****' + pan.substring(pan.length - 4);
}

/**
 * Generate mock expiry date (2 years from now)
 */
function generateExpiry(): string {
    const now = new Date();
    const expiry = new Date(now.setFullYear(now.getFullYear() + 2));
    const month = String(expiry.getMonth() + 1).padStart(2, '0');
    const year = String(expiry.getFullYear()).slice(-2);
    return `${month}/${year}`;
}

/**
 * Get client dashboard
 */
export const getDashboard = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.userId;

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
                COALESCE(SUM(amount), 0) as today_spent
             FROM client.transactions
             WHERE client_id = $1 AND DATE(timestamp) = CURRENT_DATE`,
            [userId]
        );

        // Get recent transactions
        const recentTxn = await query(
            `SELECT id, transaction_id, masked_pan, amount, currency, type, status,
                    merchant_name, timestamp
             FROM client.transactions
             WHERE client_id = $1
             ORDER BY timestamp DESC LIMIT 5`,
            [userId]
        );

        // Get active cards
        const activeCards = await query(
            `SELECT id, masked_pan, cardholder_name, card_type, network, status,
                    balance, daily_limit, daily_spent
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
 * Get my cards
 */
export const getMyCards = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.userId;
        const status = req.query.status as string;

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
             FROM client.virtual_cards
             WHERE ${whereClause}
             ORDER BY created_at DESC`,
            params
        );

        // If no cards exist, create a demo card
        if (result.rowCount === 0) {
            const pan = generatePAN();
            const maskedPan = maskPAN(pan);
            const expiry = generateExpiry();
            const cvvHash = await bcrypt.hash('123', 10);

            await query(
                `INSERT INTO client.virtual_cards
                 (client_id, pan, masked_pan, cardholder_name, expiry_date, cvv_hash, card_type, network)
                 VALUES ($1, $2, $3, 'DEMO USER', $4, $5, 'DEBIT', 'VISA')`,
                [userId, pan, maskedPan, expiry, cvvHash]
            );

            // Fetch again
            const newResult = await query(
                `SELECT id, masked_pan, cardholder_name, expiry_date, card_type, network, status,
                        daily_limit, monthly_limit, single_txn_limit, daily_spent, monthly_spent,
                        threeds_enrolled, contactless_enabled, international_enabled, ecommerce_enabled,
                        balance, currency, issue_date, last_used_date
                 FROM client.virtual_cards WHERE client_id = $1`,
                [userId]
            );

            return res.json({ success: true, cards: newResult.rows });
        }

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

        const result = await query(
            `SELECT id, masked_pan, cardholder_name, expiry_date, card_type, network, status,
                    daily_limit, monthly_limit, single_txn_limit, daily_spent, monthly_spent,
                    threeds_enrolled, contactless_enabled, international_enabled, ecommerce_enabled,
                    balance, currency, issue_date, last_used_date, created_at
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
            `SELECT id, transaction_id, masked_pan, amount, currency, type, status,
                    response_code, authorization_code, merchant_name, merchant_mcc,
                    merchant_location, threeds_version, threeds_status, timestamp
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
 * Simulate a payment
 */
export const simulatePayment = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.userId;
        const { cardId, amount, merchantName, merchantMcc, paymentType, use3DS } = req.body;

        if (!cardId || !amount || !merchantName) {
            return res.status(400).json({ success: false, error: 'Missing required fields' });
        }

        // Get card
        const cardResult = await query(
            `SELECT * FROM client.virtual_cards WHERE id = $1 AND client_id = $2`,
            [cardId, userId]
        );

        if (cardResult.rowCount === 0) {
            return res.status(404).json({ success: false, error: 'Card not found' });
        }

        const card = cardResult.rows[0];

        // Validate card status
        if (card.status !== 'ACTIVE') {
            return res.status(400).json({
                success: false,
                error: 'Card is not active',
                responseCode: '14'
            });
        }

        // Check limits
        if (amount > card.single_txn_limit) {
            return res.status(400).json({
                success: false,
                error: 'Amount exceeds single transaction limit',
                responseCode: '61'
            });
        }

        if (card.daily_spent + amount > card.daily_limit) {
            return res.status(400).json({
                success: false,
                error: 'Daily limit exceeded',
                responseCode: '65'
            });
        }

        // Check balance
        if (amount > card.balance) {
            return res.status(400).json({
                success: false,
                error: 'Insufficient funds',
                responseCode: '51'
            });
        }

        // Generate transaction
        const transactionId = `TXN${Date.now()}${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
        const authCode = Math.random().toString(36).substr(2, 6).toUpperCase();
        const stan = String(Math.floor(Math.random() * 1000000)).padStart(6, '0');

        // Simulate 3DS if enabled
        let threedsStatus: string | null = null;
        let threedsVersion: string | null = null;
        let eci: string | null = null;

        if (use3DS && card.threeds_enrolled) {
            threedsVersion = '2.2.0';
            threedsStatus = 'Y'; // Authenticated
            eci = '05'; // Visa fully authenticated
        }

        // Create transaction
        const txnResult = await query(
            `INSERT INTO client.transactions
             (transaction_id, stan, card_id, masked_pan, client_id, amount, currency, type, status,
              response_code, authorization_code, merchant_name, merchant_mcc,
              threeds_version, threeds_status, eci)
             VALUES ($1, $2, $3, $4, $5, $6, 'EUR', $7, 'APPROVED', '00', $8, $9, $10, $11, $12, $13)
             RETURNING *`,
            [
                transactionId, stan, cardId, card.masked_pan, userId, amount,
                paymentType || 'PURCHASE', authCode, merchantName, merchantMcc || '5411',
                threedsVersion, threedsStatus, eci
            ]
        );

        // Update card balance and spent
        await query(
            `UPDATE client.virtual_cards
             SET balance = balance - $1, daily_spent = daily_spent + $1, monthly_spent = monthly_spent + $1,
                 last_used_date = NOW()
             WHERE id = $2`,
            [amount, cardId]
        );

        logger.info('Payment simulated', { transactionId, amount, cardId: card.masked_pan });

        res.json({
            success: true,
            message: 'Payment approved',
            transaction: txnResult.rows[0],
            _educational: {
                isoMessage: {
                    mti: '0100',
                    de2: card.masked_pan,
                    de3: '000000',
                    de4: String(Math.round(amount * 100)).padStart(12, '0'),
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
            `SELECT id, masked_pan, threeds_enrolled, contactless_enabled,
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
