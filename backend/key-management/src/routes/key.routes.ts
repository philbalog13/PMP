import { Router } from 'express';
import * as controller from '../controllers/key.controller';

const router = Router();

router.get('/health', (req, res) => {
    res.json({ status: 'healthy', service: 'key-management', timestamp: new Date().toISOString() });
});

// Key CRUD
router.post('/keys', controller.generateKey);
router.get('/keys', controller.getAllKeys);
router.get('/keys/:id', controller.getKey);
router.delete('/keys/:id', controller.deleteKey);

// Key operations
router.post('/keys/:id/rotate', controller.rotateKey);
router.post('/keys/import', controller.importKey);
router.post('/keys/:id/export', controller.exportKey);

export default router;
