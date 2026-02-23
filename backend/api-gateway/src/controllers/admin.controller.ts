/**
 * Admin Controller - PMP
 * Client management endpoints for administrators (FORMATEUR role)
 */
import { Request, Response } from 'express';
import { query } from '../config/database';
import { logger } from '../utils/logger';

/**
 * GET /api/admin/clients
 * Returns all clients with their account balance, card count, and status
 */
export const listClients = async (req: Request, res: Response) => {
    try {
        const result = await query(
            `SELECT
                u.id,
                u.username,
                u.email,
                u.first_name,
                u.last_name,
                u.status,
                u.created_at,
                COALESCE(ba.balance, 0) AS account_balance,
                COALESCE(ba.currency, 'EUR') AS currency,
                COALESCE(ba.iban, '') AS iban,
                COALESCE(ba.status, 'UNKNOWN') AS account_status,
                COUNT(DISTINCT vc.id) FILTER (WHERE vc.status = 'ACTIVE') AS active_cards,
                COUNT(DISTINCT vc.id) AS total_cards,
                COUNT(DISTINCT tx.id) AS total_transactions,
                COALESCE(SUM(tx.amount) FILTER (WHERE tx.status = 'APPROVED' AND tx.type = 'PURCHASE'), 0) AS total_spent
            FROM users.users u
            LEFT JOIN client.bank_accounts ba ON ba.client_id = u.id
            LEFT JOIN client.virtual_cards vc ON vc.client_id = u.id
            LEFT JOIN client.transactions tx ON tx.client_id = u.id
            WHERE u.role = 'ROLE_CLIENT'
            GROUP BY u.id, u.username, u.email, u.first_name, u.last_name, u.status, u.created_at,
                     ba.balance, ba.currency, ba.iban, ba.status
            ORDER BY u.created_at DESC`,
            []
        );

        return res.json({
            success: true,
            clients: result.rows.map(row => ({
                id: row.id,
                username: row.username,
                email: row.email,
                firstName: row.first_name,
                lastName: row.last_name,
                status: row.status,
                createdAt: row.created_at,
                accountBalance: parseFloat(row.account_balance) || 0,
                currency: row.currency,
                iban: row.iban,
                accountStatus: row.account_status,
                activeCards: parseInt(row.active_cards) || 0,
                totalCards: parseInt(row.total_cards) || 0,
                totalTransactions: parseInt(row.total_transactions) || 0,
                totalSpent: parseFloat(row.total_spent) || 0,
            }))
        });
    } catch (error: any) {
        logger.error('[ADMIN] listClients failed', { error: error.message });
        return res.status(500).json({ success: false, error: 'Failed to list clients' });
    }
};

/**
 * GET /api/admin/clients/:id
 * Returns full detail for one client: account, cards, recent transactions
 */
export const getClientDetail = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const [userResult, accountResult, cardsResult, txResult] = await Promise.all([
            query(
                `SELECT id, username, email, first_name, last_name, status, created_at
                 FROM users.users WHERE id = $1 AND role = 'ROLE_CLIENT'`,
                [id]
            ),
            query(
                `SELECT * FROM client.bank_accounts WHERE client_id = $1 LIMIT 1`,
                [id]
            ),
            query(
                `SELECT id, masked_pan, card_type, network, status, balance, daily_limit, daily_spent, monthly_limit, monthly_spent, created_at
                 FROM client.virtual_cards WHERE client_id = $1 ORDER BY created_at DESC`,
                [id]
            ),
            query(
                `SELECT id, transaction_id, amount, currency, type, status, merchant_name, merchant_mcc, response_code, created_at
                 FROM client.transactions WHERE client_id = $1 ORDER BY created_at DESC LIMIT 20`,
                [id]
            ),
        ]);

        if (userResult.rowCount === 0) {
            return res.status(404).json({ success: false, error: 'Client not found' });
        }

        const user = userResult.rows[0];
        const account = accountResult.rows[0] || null;

        return res.json({
            success: true,
            client: {
                id: user.id,
                username: user.username,
                email: user.email,
                firstName: user.first_name,
                lastName: user.last_name,
                status: user.status,
                createdAt: user.created_at,
            },
            account: account ? {
                iban: account.iban,
                bic: account.bic,
                balance: parseFloat(account.balance) || 0,
                currency: account.currency,
                status: account.status,
                accountLabel: account.account_label,
                createdAt: account.created_at,
            } : null,
            cards: cardsResult.rows.map(c => ({
                id: c.id,
                maskedPan: c.masked_pan,
                cardType: c.card_type,
                network: c.network,
                status: c.status,
                balance: parseFloat(c.balance) || 0,
                dailyLimit: parseFloat(c.daily_limit) || 0,
                dailySpent: parseFloat(c.daily_spent) || 0,
                monthlyLimit: parseFloat(c.monthly_limit) || 0,
                monthlySpent: parseFloat(c.monthly_spent) || 0,
                createdAt: c.created_at,
            })),
            recentTransactions: txResult.rows.map(tx => ({
                id: tx.id,
                transactionId: tx.transaction_id,
                amount: parseFloat(tx.amount) || 0,
                currency: tx.currency,
                type: tx.type,
                status: tx.status,
                merchantName: tx.merchant_name,
                merchantMcc: tx.merchant_mcc,
                responseCode: tx.response_code,
                createdAt: tx.created_at,
            })),
        });
    } catch (error: any) {
        logger.error('[ADMIN] getClientDetail failed', { error: error.message });
        return res.status(500).json({ success: false, error: 'Failed to get client detail' });
    }
};

/**
 * PATCH /api/admin/clients/:id/suspend
 * Body: { suspended: boolean, reason?: string }
 */
export const suspendClient = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { suspended, reason } = req.body;

        if (typeof suspended !== 'boolean') {
            return res.status(400).json({ success: false, error: 'suspended (boolean) is required' });
        }

        const newStatus = suspended ? 'SUSPENDED' : 'ACTIVE';

        await query(
            `UPDATE users.users SET status = $1 WHERE id = $2 AND role = 'ROLE_CLIENT'`,
            [newStatus, id]
        );

        // Also update bank account status
        await query(
            `UPDATE client.bank_accounts SET status = $1 WHERE client_id = $2`,
            [suspended ? 'SUSPENDED' : 'ACTIVE', id]
        ).catch(() => {}); // non-blocking if no account

        logger.info(`[ADMIN] Client ${id} ${newStatus}${reason ? ` - reason: ${reason}` : ''}`);

        return res.json({
            success: true,
            message: `Client account ${newStatus.toLowerCase()} successfully`,
            clientId: id,
            status: newStatus,
        });
    } catch (error: any) {
        logger.error('[ADMIN] suspendClient failed', { error: error.message });
        return res.status(500).json({ success: false, error: 'Failed to update client status' });
    }
};

/**
 * POST /api/admin/clients/:id/message
 * Body: { subject: string, content: string }
 */
export const sendMessage = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const adminId = (req as any).user?.userId;
        const { subject, content } = req.body;

        if (!subject || !content) {
            return res.status(400).json({ success: false, error: 'subject and content are required' });
        }

        // Check client exists
        const clientCheck = await query(
            `SELECT id FROM users.users WHERE id = $1 AND role = 'ROLE_CLIENT'`,
            [id]
        );
        if (clientCheck.rowCount === 0) {
            return res.status(404).json({ success: false, error: 'Client not found' });
        }

        const msgResult = await query(
            `INSERT INTO client.admin_messages (client_id, admin_id, subject, content)
             VALUES ($1, $2, $3, $4) RETURNING *`,
            [id, adminId || null, subject, content]
        );

        logger.info(`[ADMIN] Message sent to client ${id} by admin ${adminId}`);

        return res.json({
            success: true,
            message: 'Message sent successfully',
            data: msgResult.rows[0],
        });
    } catch (error: any) {
        logger.error('[ADMIN] sendMessage failed', { error: error.message });
        return res.status(500).json({ success: false, error: 'Failed to send message' });
    }
};

/**
 * GET /api/admin/clients/:id/messages
 * Get all messages sent to a client
 */
export const getClientMessages = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const result = await query(
            `SELECT m.*, u.username AS admin_username, u.first_name AS admin_first_name
             FROM client.admin_messages m
             LEFT JOIN users.users u ON u.id = m.admin_id
             WHERE m.client_id = $1
             ORDER BY m.created_at DESC`,
            [id]
        );

        return res.json({
            success: true,
            messages: result.rows,
        });
    } catch (error: any) {
        logger.error('[ADMIN] getClientMessages failed', { error: error.message });
        return res.status(500).json({ success: false, error: 'Failed to get messages' });
    }
};
