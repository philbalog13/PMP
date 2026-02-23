import { Router } from 'express';
import * as controller from '../controllers/issuer.controller';

const router = Router();

router.get('/health', (req, res) => {
    res.json({ status: 'healthy', service: 'sim-issuer-service', timestamp: new Date().toISOString() });
});

router.post('/authorize', controller.authorize);
router.get('/accounts', controller.getAllAccounts);
router.get('/accounts/:pan', controller.getAccount);
router.patch('/accounts/:pan/balance', controller.updateBalance);
router.put('/accounts/:pan/balance', controller.updateBalance);
router.post('/accounts', controller.createAccount);

export default router;
