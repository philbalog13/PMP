/**
 * Routes for service log snapshots collected from health probes.
 */

import { Router, Request, Response } from 'express';
import { elasticsearchService, serviceCollector } from '../index.js';

const router = Router();

// GET /api/logs/services/latest
router.get('/services/latest', async (_req: Request, res: Response) => {
    const latest = serviceCollector.getLatestSnapshots();
    res.json({
        success: true,
        data: latest,
        meta: { count: latest.length }
    });
});

// GET /api/logs/services
router.get('/services', async (req: Request, res: Response) => {
    const limit = Math.min(Number(req.query.limit || 100), 1000);
    const service = req.query.service ? String(req.query.service) : null;

    try {
        const must: any[] = [];
        if (service) {
            must.push({ term: { service } });
        }

        const query = must.length > 0
            ? { bool: { must } }
            : { match_all: {} };

        const logs = await elasticsearchService.search({
            index: 'pmp-service-logs',
            query,
            size: limit,
            from: 0,
            sort: [{ '@timestamp': { order: 'desc' } }]
        });

        if (logs.length === 0) {
            // Fallback when Elasticsearch is empty but collector is running.
            const latest = serviceCollector.getLatestSnapshots();
            return res.json({
                success: true,
                data: latest,
                meta: { count: latest.length, source: 'collector-memory' }
            });
        }

        res.json({
            success: true,
            data: logs,
            meta: { count: logs.length, source: 'elasticsearch' }
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            error: error?.message || 'Failed to fetch service logs'
        });
    }
});

export default router;

