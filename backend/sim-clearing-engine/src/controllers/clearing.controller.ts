import { Request, Response } from 'express';
import * as clearingService from '../services/clearing.service';

export const submitBatch = async (req: Request, res: Response): Promise<void> => {
    try {
        const batch: clearingService.BatchFile = req.body;

        if (!batch.terminalId || !batch.merchantId) {
            res.status(400).json({ success: false, error: 'terminalId and merchantId are required' });
            return;
        }
        if (!Array.isArray(batch.transactions) || batch.transactions.length === 0) {
            res.status(400).json({ success: false, error: 'transactions array cannot be empty' });
            return;
        }

        const result = await clearingService.processBatch(batch);
        res.status(201).json({ success: true, data: result });
    } catch (error: any) {
        console.error('[CLEARING CTRL] submitBatch error:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
};

export const listBatches = async (req: Request, res: Response): Promise<void> => {
    try {
        const limit = parseInt(req.query.limit as string || '20');
        const batches = await clearingService.listBatches(limit);
        res.json({ success: true, data: batches, count: batches.length });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
};

export const getBatch = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const batch = await clearingService.getBatchDetail(id);
        if (!batch) {
            res.status(404).json({ success: false, error: 'Batch not found' });
            return;
        }
        res.json({ success: true, data: batch });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
};

export const getClearingBalance = async (req: Request, res: Response): Promise<void> => {
    try {
        const merchantId = req.query.merchantId as string | undefined;
        const balance = await clearingService.getClearingBalance(merchantId);
        res.json({ success: true, data: balance });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
};
