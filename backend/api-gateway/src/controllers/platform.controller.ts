/**
 * Platform Controller - PMP
 * Platform-wide transaction access for ETUDIANT and FORMATEUR roles
 */
import { Request, Response } from 'express';
import { query } from '../config/database';
import { logger } from '../utils/logger';

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

    addRetroStep('Limit Verification', 'decision',
        isApproved ? 'success' : (txn.response_code === '61' || txn.response_code === '65' ? 'failed' : 'success'), 3, {
        amount
    });

    addRetroStep('Balance Check', 'decision',
        isApproved ? 'success' : (txn.response_code === '51' ? 'failed' : 'success'), 3, {
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
        addRetroStep('Card Balance Debit', 'data', 'success', 10, { amount });

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
 * Get all platform transactions (paginated, filterable)
 */
export const getAllTransactions = async (req: Request, res: Response) => {
    try {
        const { status, type, search, fromDate, toDate, page = '1', limit = '20' } = req.query;

        const pageNum = Math.max(1, parseInt(page as string) || 1);
        const limitNum = Math.min(100, Math.max(1, parseInt(limit as string) || 20));
        const offset = (pageNum - 1) * limitNum;

        let where = 'WHERE 1=1';
        const params: any[] = [];
        let paramIdx = 0;

        if (status) {
            paramIdx++;
            where += ` AND t.status = $${paramIdx}`;
            params.push(status);
        }

        if (type) {
            paramIdx++;
            where += ` AND t.type = $${paramIdx}`;
            params.push(type);
        }

        if (search) {
            paramIdx++;
            where += ` AND (t.transaction_id ILIKE $${paramIdx} OR t.masked_pan ILIKE $${paramIdx} OR t.merchant_name ILIKE $${paramIdx})`;
            params.push(`%${search}%`);
        }

        if (fromDate) {
            paramIdx++;
            where += ` AND t.timestamp >= $${paramIdx}`;
            params.push(fromDate);
        }

        if (toDate) {
            paramIdx++;
            where += ` AND t.timestamp <= $${paramIdx}`;
            params.push(toDate);
        }

        // Count query
        const countResult = await query(
            `SELECT COUNT(*) FROM client.transactions t ${where}`,
            params
        );

        // Data query with client and merchant info
        const dataResult = await query(
            `SELECT t.id, t.transaction_id, t.stan, t.masked_pan,
                    t.client_id, t.merchant_id,
                    t.amount, t.currency, t.type, t.status,
                    t.response_code, t.authorization_code,
                    t.merchant_name, t.merchant_mcc, t.terminal_id,
                    t.threeds_version, t.threeds_status, t.eci,
                    t.fraud_score,
                    t.timestamp, t.settled_at,
                    uc.username AS client_username,
                    uc.first_name AS client_first_name,
                    uc.last_name AS client_last_name,
                    um.username AS merchant_username,
                    um.first_name AS merchant_first_name,
                    um.last_name AS merchant_last_name
             FROM client.transactions t
             LEFT JOIN users.users uc ON uc.id = t.client_id
             LEFT JOIN users.users um ON um.id = t.merchant_id
             ${where}
             ORDER BY t.timestamp DESC
             LIMIT $${paramIdx + 1} OFFSET $${paramIdx + 2}`,
            [...params, limitNum, offset]
        );

        res.json({
            success: true,
            transactions: dataResult.rows,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total: parseInt(countResult.rows[0].count),
                totalPages: Math.ceil(parseInt(countResult.rows[0].count) / limitNum)
            }
        });
    } catch (error: any) {
        logger.error('Platform getAllTransactions error', { error: error.message });
        res.status(500).json({ success: false, error: 'Failed to fetch platform transactions' });
    }
};

/**
 * Get transaction by ID (no ownership filter)
 */
export const getTransactionById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const result = await query(
            `SELECT t.*,
                    uc.username AS client_username,
                    uc.first_name AS client_first_name,
                    uc.last_name AS client_last_name,
                    um.username AS merchant_username,
                    um.first_name AS merchant_first_name,
                    um.last_name AS merchant_last_name
             FROM client.transactions t
             LEFT JOIN users.users uc ON uc.id = t.client_id
             LEFT JOIN users.users um ON um.id = t.merchant_id
             WHERE t.id = $1`,
            [id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ success: false, error: 'Transaction not found' });
        }

        res.json({ success: true, transaction: result.rows[0] });
    } catch (error: any) {
        logger.error('Platform getTransactionById error', { error: error.message });
        res.status(500).json({ success: false, error: 'Failed to fetch transaction' });
    }
};

/**
 * Get transaction timeline (no ownership filter)
 */
export const getTransactionTimeline = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const result = await query(
            `SELECT t.*,
                    uc.username AS client_username,
                    uc.first_name AS client_first_name,
                    uc.last_name AS client_last_name,
                    um.username AS merchant_username,
                    um.first_name AS merchant_first_name,
                    um.last_name AS merchant_last_name
             FROM client.transactions t
             LEFT JOIN users.users uc ON uc.id = t.client_id
             LEFT JOIN users.users um ON um.id = t.merchant_id
             WHERE t.id = $1`,
            [id]
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
            timeline = generateRetrospectiveTimeline(txn);
        }

        res.json({ success: true, transaction: txn, timeline });
    } catch (error: any) {
        logger.error('Platform getTransactionTimeline error', { error: error.message });
        res.status(500).json({ success: false, error: 'Failed to fetch transaction timeline' });
    }
};
