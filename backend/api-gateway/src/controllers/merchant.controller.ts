/**
 * Merchant Controller - PMP
 * POS terminals, transactions, and reports for merchants
 */
import { Request, Response } from 'express';
import { query } from '../config/database';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

/**
 * Get merchant dashboard
 */
export const getDashboard = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.userId;

        // Get today's stats
        const todayStats = await query(
            `SELECT
                COUNT(*) as transaction_count,
                COALESCE(SUM(CASE WHEN status = 'APPROVED' THEN amount ELSE 0 END), 0) as revenue,
                COALESCE(SUM(CASE WHEN type = 'REFUND' THEN amount ELSE 0 END), 0) as refunds,
                COUNT(CASE WHEN status = 'APPROVED' THEN 1 END) as approved_count,
                COUNT(CASE WHEN status = 'DECLINED' THEN 1 END) as declined_count
             FROM client.transactions
             WHERE merchant_id = $1 AND DATE(timestamp) = CURRENT_DATE`,
            [userId]
        );

        // Get POS terminals
        const posResult = await query(
            `SELECT id, terminal_id, terminal_name, terminal_type, status,
                    location_name, last_transaction_at
             FROM merchant.pos_terminals
             WHERE merchant_id = $1
             ORDER BY last_transaction_at DESC NULLS LAST LIMIT 5`,
            [userId]
        );

        // Get recent transactions
        const recentTxn = await query(
            `SELECT id, transaction_id, masked_pan, amount, currency, type, status,
                    response_code, timestamp
             FROM client.transactions
             WHERE merchant_id = $1
             ORDER BY timestamp DESC LIMIT 10`,
            [userId]
        );

        // Weekly comparison
        const weeklyStats = await query(
            `SELECT
                DATE(timestamp) as date,
                COUNT(*) as count,
                COALESCE(SUM(CASE WHEN status = 'APPROVED' THEN amount ELSE 0 END), 0) as revenue
             FROM client.transactions
             WHERE merchant_id = $1 AND timestamp >= NOW() - INTERVAL '7 days'
             GROUP BY DATE(timestamp)
             ORDER BY date DESC`,
            [userId]
        );

        const stats = todayStats.rows[0];
        const approvalRate = stats.transaction_count > 0
            ? Math.round((parseInt(stats.approved_count) / parseInt(stats.transaction_count)) * 100)
            : 0;

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

        let whereConditions = ['merchant_id = $1'];
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
                    fraud_score, timestamp, settled_at
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
            `SELECT * FROM client.transactions WHERE id = $1 AND merchant_id = $2`,
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
 * Refund a transaction
 */
export const refundTransaction = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.userId;
        const { id } = req.params;
        const { amount, reason } = req.body;

        // Get original transaction
        const txnResult = await query(
            `SELECT * FROM client.transactions WHERE id = $1 AND merchant_id = $2`,
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

        const refundAmount = amount || originalTxn.amount;
        if (refundAmount > originalTxn.amount) {
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

        // Restore balance to card
        if (originalTxn.card_id) {
            await query(
                `UPDATE client.virtual_cards SET balance = balance + $1 WHERE id = $2`,
                [refundAmount, originalTxn.card_id]
            );
        }

        logger.info('Transaction refunded', {
            originalTxnId: id,
            refundTxnId: refundResult.rows[0].id,
            amount: refundAmount
        });

        res.json({
            success: true,
            message: 'Refund processed successfully',
            refund: refundResult.rows[0]
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
            `SELECT * FROM client.transactions WHERE id = $1 AND merchant_id = $2`,
            [id, userId]
        );

        if (txnResult.rowCount === 0) {
            return res.status(404).json({ success: false, error: 'Transaction not found' });
        }

        const txn = txnResult.rows[0];

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

        // Restore balance to card
        if (txn.card_id && txn.status === 'APPROVED') {
            await query(
                `UPDATE client.virtual_cards
                 SET balance = balance + $1, daily_spent = daily_spent - $1
                 WHERE id = $2`,
                [txn.amount, txn.card_id]
            );
        }

        logger.info('Transaction voided', { txnId: id, reason });

        res.json({
            success: true,
            message: 'Transaction voided successfully'
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
             ORDER BY timestamp DESC LIMIT 10`,
            [result.rows[0].terminal_id]
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

        if (!amount) {
            return res.status(400).json({ success: false, error: 'Amount is required' });
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
                transactionId, stan, pan, userId, amount, status, responseCode,
                approved ? authCode : null, terminal.merchant_name, terminal.mcc, terminal.terminal_id
            ]
        );

        // Update terminal last transaction
        await query(
            `UPDATE merchant.pos_terminals SET last_transaction_at = NOW() WHERE id = $1`,
            [terminal.id]
        );

        logger.info('POS transaction created', {
            transactionId,
            terminalId: terminal.terminal_id,
            status,
            amount
        });

        res.json({
            success: true,
            approved,
            transaction: txnResult.rows[0],
            _educational: {
                isoMessage: {
                    mti: '0100',
                    de2: pan,
                    de3: '000000',
                    de4: String(Math.round(amount * 100)).padStart(12, '0'),
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
             WHERE merchant_id = $1 AND DATE(timestamp) = $2`,
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
             WHERE merchant_id = $1 AND DATE(timestamp) = $2
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
             WHERE merchant_id = $1 ${dateFilter}
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
             WHERE merchant_id = $1 AND DATE(timestamp) BETWEEN $2 AND $3
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
