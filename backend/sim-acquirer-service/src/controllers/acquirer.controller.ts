import { Request, Response } from 'express';
import * as acquirerService from '../services/acquirer.service';
import * as merchantService from '../services/merchant.service';

export const processTransaction = async (req: Request, res: Response): Promise<void> => {
    try {
        const result = await acquirerService.processTransaction(req.body);

        res.json({
            success: result.approved,
            ...result,
            _educational: {
                acquirerRole: 'The acquirer is the merchant\'s bank that processes card payments',
                flow: [
                    '1. Receive transaction from POS',
                    '2. Validate merchant',
                    '3. Format ISO 8583 message',
                    '4. Route to payment network',
                    '5. Return authorization response'
                ]
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Processing failed' });
    }
};

export const getAllMerchants = (req: Request, res: Response): void => {
    res.json({ success: true, data: merchantService.getAllMerchants() });
};

export const getMerchant = (req: Request, res: Response): void => {
    const merchant = merchantService.getMerchant(req.params.id);
    if (!merchant) {
        res.status(404).json({ success: false, error: 'Merchant not found' });
        return;
    }
    res.json({ success: true, data: merchant });
};

export const createMerchant = (req: Request, res: Response): void => {
    const { name, mcc, address, city, country } = req.body;
    if (!name || !mcc) {
        res.status(400).json({ success: false, error: 'name and mcc are required' });
        return;
    }
    const merchant = merchantService.createMerchant({
        name, mcc, address: address || '', city: city || '', country: country || 'FR', status: 'ACTIVE'
    });
    res.status(201).json({ success: true, data: merchant });
};
