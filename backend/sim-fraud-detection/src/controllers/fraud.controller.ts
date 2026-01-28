import { Request, Response } from 'express';
import * as fraudService from '../services/fraud.service';

export const checkFraud = (req: Request, res: Response): void => {
    const { pan, amount, merchantId, mcc, country, ip } = req.body;

    if (!pan || !amount) {
        res.status(400).json({ success: false, error: 'pan and amount are required' });
        return;
    }

    const result = fraudService.checkFraud({ pan, amount, merchantId, mcc, country, ip });

    res.json({
        success: true,
        ...result,
        _educational: {
            rulesApplied: [
                'Velocity: Max transactions per hour',
                'Amount: High value threshold',
                'MCC: Suspicious merchant categories',
                'Geography: Blocked countries',
                'Behavior: First transaction patterns'
            ],
            scoringExplanation: 'Score 0-100: LOW (0-30), MEDIUM (30-50), HIGH (50-70), CRITICAL (70+)'
        }
    });
};

export const getAlerts = (req: Request, res: Response): void => {
    const unresolvedOnly = req.query.unresolved === 'true';
    res.json({ success: true, data: fraudService.getAlerts(unresolvedOnly) });
};

export const resolveAlert = (req: Request, res: Response): void => {
    const resolved = fraudService.resolveAlert(req.params.id);
    if (!resolved) {
        res.status(404).json({ success: false, error: 'Alert not found' });
        return;
    }
    res.json({ success: true, message: 'Alert resolved' });
};

export const getStats = (req: Request, res: Response): void => {
    res.json({ success: true, data: fraudService.getStats() });
};
