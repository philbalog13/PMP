import { Request, Response } from 'express';
import * as transactionService from '../services/transaction.service';

/**
 * Create a new transaction
 */
export const createTransaction = async (req: Request, res: Response): Promise<void> => {
    try {
        const { pan, amount, currency, merchantId, transactionType, cvv, expiryMonth, expiryYear } = req.body;

        // Validation
        if (!pan) {
            res.status(400).json({ success: false, error: 'pan is required' });
            return;
        }
        if (!amount || amount <= 0) {
            res.status(400).json({ success: false, error: 'Valid amount is required' });
            return;
        }

        const transaction = await transactionService.initiateTransaction({
            pan,
            amount,
            currency: currency || 'EUR',
            merchantId,
            transactionType: transactionType || 'PURCHASE',
            cvv,
            expiryMonth,
            expiryYear
        });

        const statusCode = transaction.status === 'APPROVED' ? 200 :
            transaction.status === 'ERROR' ? 502 : 200;

        res.status(statusCode).json({
            success: transaction.status === 'APPROVED',
            data: {
                transactionId: transaction.id,
                status: transaction.status,
                responseCode: transaction.responseCode,
                authorizationCode: transaction.authorizationCode,
                amount: transaction.amount,
                currency: transaction.currency,
                maskedPan: transaction.maskedPan,
                timestamp: transaction.completedAt || transaction.createdAt
            },
            _educational: {
                responseCodeMeaning: getResponseCodeMeaning(transaction.responseCode),
                transactionFlow: [
                    '1. POS receives card data',
                    '2. Forward to Acquirer',
                    '3. Acquirer routes via Network Switch',
                    '4. Issuer authorizes',
                    '5. Response returns to POS'
                ]
            }
        });
    } catch (error) {
        console.error('Transaction error:', error);
        res.status(500).json({
            success: false,
            error: 'Transaction processing failed',
            responseCode: '96'
        });
    }
};

/**
 * Get transaction by ID
 */
export const getTransaction = (req: Request, res: Response): void => {
    const { id } = req.params;
    const transaction = transactionService.getTransaction(id);

    if (!transaction) {
        res.status(404).json({ success: false, error: 'Transaction not found' });
        return;
    }

    res.json({
        success: true,
        data: {
            ...transaction,
            pan: undefined // Never return full PAN
        }
    });
};

/**
 * Get all transactions
 */
export const getAllTransactions = (req: Request, res: Response): void => {
    const limit = parseInt(req.query.limit as string) || 50;
    const transactions = transactionService.getAllTransactions(limit);

    res.json({
        success: true,
        data: transactions.map(t => ({
            ...t,
            pan: undefined
        })),
        count: transactions.length
    });
};

/**
 * Cancel transaction
 */
export const cancelTransaction = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const reversal = await transactionService.cancelTransaction(id);

    if (!reversal) {
        res.status(400).json({
            success: false,
            error: 'Transaction cannot be cancelled'
        });
        return;
    }

    res.json({
        success: reversal.status === 'APPROVED',
        data: {
            originalTransactionId: id,
            reversalTransactionId: reversal.id,
            status: reversal.status,
            responseCode: reversal.responseCode
        }
    });
};

/**
 * Get response code meaning
 */
function getResponseCodeMeaning(code: string): string {
    const codes: Record<string, string> = {
        '00': 'Approved',
        '51': 'Insufficient funds',
        '54': 'Expired card',
        '57': 'Transaction not permitted',
        '61': 'Exceeds withdrawal limit',
        '91': 'Issuer unavailable',
        '96': 'System malfunction',
        '05': 'Do not honor',
        '14': 'Invalid card number'
    };
    return codes[code] || 'Unknown response code';
}
