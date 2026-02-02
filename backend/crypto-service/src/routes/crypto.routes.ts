import { Router, Request, Response } from 'express';
import * as cryptoService from '../services/crypto.service';
import * as controller from '../controllers/crypto.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.get('/health', (req: Request, res: Response) => {
    res.json({ status: 'healthy', service: 'crypto-service', timestamp: new Date().toISOString() });
});

router.post('/encrypt', authenticate, (req: Request, res: Response) => {
    res.json({ status: 'healthy', service: 'crypto-service', timestamp: new Date().toISOString() });
});

// Symmetric encryption
router.post('/decrypt', controller.decrypt);

// MAC operations
router.post('/mac/generate', controller.generateMac);
router.post('/mac/verify', controller.verifyMac);

// PIN operations
router.post('/pin/encode', controller.generatePinBlock);

// CVV operations
router.post('/cvv/generate', controller.generateCvv);

export default router;
