import { Router } from 'express';
import * as controller from '../controllers/acquirer.controller';

const router = Router();

router.get('/health', (req, res) => {
    res.json({ status: 'healthy', service: 'sim-acquirer-service', timestamp: new Date().toISOString() });
});

// Transaction processing
router.post('/process', controller.processTransaction);

// Cold Boot / N.A.C: ZPK key exchange for POS terminal initialization
router.post('/key-exchange', controller.keyExchange);

// Télécollecte: end-of-day batch submission to clearing engine
router.post('/telecollecte', controller.telecollecte);

// Merchant management
router.get('/merchants', controller.getAllMerchants);
router.get('/merchants/:id', controller.getMerchant);
router.post('/merchants', controller.createMerchant);

export default router;
