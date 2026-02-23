import { Router } from 'express';
import * as controller from '../controllers/fraud.controller';

const router = Router();

router.get('/health', (req, res) => {
    res.json({ status: 'healthy', service: 'sim-fraud-detection', timestamp: new Date().toISOString() });
});

router.post('/check', controller.checkFraud);
router.post('/fraud/check', controller.checkFraud);
router.get('/alerts', controller.getAlerts);
router.get('/fraud/alerts', controller.getAlerts);
router.patch('/alerts/:id/resolve', controller.resolveAlert);
router.patch('/fraud/alerts/:id/resolve', controller.resolveAlert);
router.get('/stats', controller.getStats);
router.get('/fraud/stats', controller.getStats);

// Legacy CTF compatibility routes
router.get('/fraud/config', controller.getConfig);
router.post('/fraud/config', controller.setConfig);
router.get('/fraud/status', controller.getStatus);
router.post('/fraud/reset', controller.resetState);

export default router;
