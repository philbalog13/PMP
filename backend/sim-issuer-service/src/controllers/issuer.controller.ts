import { Request, Response } from 'express';
import * as issuerService from '../services/issuer.service';
import * as accountService from '../services/account.service';

export const authorize = async (req: Request, res: Response): Promise<void> => {
    try {
        const result = await issuerService.authorizeTransaction(req.body);
        res.json({
            success: result.approved,
            ...result,
            _educational: {
                issuerRole: 'The issuer is the cardholder\'s bank that issued the card',
                flow: [
                    '1. Receive authorization request',
                    '2. Validate card and account',
                    '3. Check fraud indicators',
                    '4. Apply authorization rules',
                    '5. Debit/credit account',
                    '6. Return authorization code'
                ]
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Authorization failed' });
    }
};

export const getAccount = (req: Request, res: Response): void => {
    const account = accountService.getAccountByPan(req.params.pan);
    if (!account) {
        res.status(404).json({ success: false, error: 'Account not found' });
        return;
    }
    res.json({
        success: true,
        data: {
            ...account,
            pan: account.pan.substring(0, 4) + '****' + account.pan.substring(account.pan.length - 4)
        }
    });
};

export const getAllAccounts = (req: Request, res: Response): void => {
    res.json({ success: true, data: accountService.getAllAccounts() });
};

export const updateBalance = (req: Request, res: Response): void => {
    const { pan } = req.params;
    const { balance } = req.body;

    if (typeof balance !== 'number') {
        res.status(400).json({ success: false, error: 'balance must be a number' });
        return;
    }

    const account = accountService.updateAccountBalance(pan, balance);
    if (!account) {
        res.status(404).json({ success: false, error: 'Account not found' });
        return;
    }

    res.json({ success: true, message: 'Balance updated', newBalance: balance });
};

export const createAccount = (req: Request, res: Response): void => {
    const { pan, balance, cardholderName } = req.body;
    if (!pan) {
        res.status(400).json({ success: false, error: 'pan is required' });
        return;
    }
    const account = accountService.createAccount({ pan, balance, cardholderName });
    res.status(201).json({ success: true, data: account });
};
