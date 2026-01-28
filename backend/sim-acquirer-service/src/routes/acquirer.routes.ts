import { Router } from 'express';
import * as controller from '../controllers/acquirer.controller';

const router = Router();

router.get('/health', (req, res) => {
    res.json({ status: 'healthy', service: 'sim-acquirer-service', timestamp: new Date().toISOString() });
});

// Transaction processing
router.post('/process', controller.processTransaction);

// Merchant management
router.get('/merchants', controller.getAllMerchants);
router.get('/merchants/:id', controller.getMerchant);
router.post('/merchants', controller.createMerchant);

export default router;
