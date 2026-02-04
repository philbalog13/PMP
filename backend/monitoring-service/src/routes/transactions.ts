/**
 * Routes API pour les transactions
 */

import { Router, Request, Response } from 'express';
import { elasticsearchService, metricsService, serviceCollector } from '../index.js';

const router = Router();

// GET /api/transactions - Liste des transactions
router.get('/', async (req: Request, res: Response) => {
    const { limit = 100, from = 0, responseCode, terminalId } = req.query;

    try {
        let query: any = { match_all: {} };

        // Filtres
        if (responseCode || terminalId) {
            query = {
                bool: {
                    must: []
                }
            };
            if (responseCode) {
                query.bool.must.push({ term: { responseCode } });
            }
            if (terminalId) {
                query.bool.must.push({ term: { terminalId } });
            }
        }

        const transactions = await elasticsearchService.search({
            index: 'pmp-transactions',
            query,
            size: Number(limit),
            from: Number(from)
        });

        res.json({
            success: true,
            data: transactions,
            meta: {
                total: transactions.length,
                limit: Number(limit),
                from: Number(from)
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to fetch transactions'
        });
    }
});

// GET /api/transactions/stats - Statistiques globales
router.get('/stats', async (req: Request, res: Response) => {
    try {
        const stats = metricsService.getTransactionStats();
        const responseCodes = metricsService.getResponseCodeDistribution();
        const successRate = metricsService.getSuccessRate();

        res.json({
            success: true,
            data: {
                stats,
                responseCodes,
                successRate
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to fetch transaction stats'
        });
    }
});

// GET /api/transactions/realtime - Données temps réel
router.get('/realtime', async (req: Request, res: Response) => {
    try {
        const data = metricsService.getDashboardData();
        res.json({
            success: true,
            data
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to fetch realtime data'
        });
    }
});

// GET /api/transactions/latency - Latences par service
router.get('/latency', async (req: Request, res: Response) => {
    const { service } = req.query;

    try {
        const latency = service
            ? metricsService.getLatencyStats(String(service))
            : metricsService.getLatencyStats();

        res.json({
            success: true,
            data: latency
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to fetch latency data'
        });
    }
});

// GET /api/transactions/services - État des services
router.get('/services', async (req: Request, res: Response) => {
    try {
        const collected = serviceCollector.getLatestSnapshots();
        const services = collected.length > 0 ? collected : metricsService.getServiceStatuses();
        res.json({
            success: true,
            data: services
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to fetch service statuses'
        });
    }
});

export default router;
