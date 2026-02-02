import { Router } from 'express';
import { HSMController } from '../controllers/hsm.controller';

const router = Router();
const controller = new HSMController();

// PIN Operations
router.post('/encrypt-pin', controller.encryptPin);
router.post('/decrypt-pin', controller.decryptPin);
// router.post('/translate-pin', controller.translatePin);

// MAC Operations
router.post('/generate-mac', controller.generateMac);
router.post('/verify-mac', controller.verifyMac);

// Crypto & Data
router.post('/encrypt-data', controller.encryptData);
router.post('/calculate-kcv', controller.calculateKcv);

// Key Management
router.post('/translate-key', controller.translateKey);

// CVV Operations
router.post('/generate-cvv', controller.generateCvv);

// Admin Routes
router.get('/keys', controller.listKeys);
router.get('/config', controller.getConfig);
router.post('/config', controller.setConfig);

export const hsmRoutes = router;
