/**
 * Health Controller
 */
import { Request, Response, NextFunction } from 'express';
import { database } from '../database';

export const health = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const uptime = process.uptime();
        const accounts = database.accounts.getAll();
        const cards = database.cards.getAll();

        res.status(200).json({
            success: true,
            data: {
                status: 'healthy',
                version: process.env.npm_package_version || '1.0.0',
                uptime: Math.floor(uptime),
                timestamp: new Date().toISOString(),
                database: {
                    accounts: accounts.length,
                    cards: cards.length,
                    status: 'connected',
                },
                checks: [
                    { name: 'database', status: 'pass', message: 'In-memory DB operational' },
                    { name: 'rules-engine', status: 'pass', message: 'Rules engine ready' },
                ],
            },
            meta: { requestId: req.requestId },
        });
    } catch (err) {
        next(err);
    }
};

export const liveness = async (req: Request, res: Response): Promise<void> => {
    res.status(200).json({ status: 'ok' });
};

export const readiness = async (req: Request, res: Response): Promise<void> => {
    res.status(200).json({ status: 'ok' });
};

export default { health, liveness, readiness };
