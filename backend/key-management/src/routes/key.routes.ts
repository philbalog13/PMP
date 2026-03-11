import { Router } from 'express';
import * as keyController from '../controllers/key.controller';
import * as pkiController from '../controllers/pki.controller';

const router = Router();

router.get('/health', (req, res) => {
    res.json({ status: 'healthy', service: 'key-management', timestamp: new Date().toISOString() });
});

// PKI Operations
router.get('/pki/ca', pkiController.getRootCA);
router.post('/pki/cert', pkiController.generateCertificate);

// Key CRUD
router.post('/keys', keyController.generateKey);
router.get('/keys', keyController.getAllKeys);
router.get('/keys/:id', keyController.getKey);
router.delete('/keys/:id', keyController.deleteKey);

// Key operations
router.post('/keys/:id/rotate', keyController.rotateKey);
router.post('/keys/import', keyController.importKey);
router.post('/keys/:id/export', keyController.exportKey);

export default router;
