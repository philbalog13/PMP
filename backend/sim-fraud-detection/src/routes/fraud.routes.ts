import { Router } from 'express';
import * as controller from '../controllers/fraud.controller';

const router = Router();

router.get('/health', (req, res) => {
    res.json({ status: 'healthy', service: 'sim-fraud-detection', timestamp: new Date().toISOString() });
});

router.post('/check', controller.checkFraud);
router.get('/alerts', controller.getAlerts);
router.patch('/alerts/:id/resolve', controller.resolveAlert);
router.get('/stats', controller.getStats);

export default router;
