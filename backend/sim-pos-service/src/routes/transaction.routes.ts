import { Router } from 'express';
import * as transactionController from '../controllers/transaction.controller';

const router = Router();

router.get('/health', (req, res) => {
    res.json({ status: 'healthy', service: 'sim-pos-service', timestamp: new Date().toISOString() });
});

router.post('/transactions', transactionController.createTransaction);
router.get('/transactions', transactionController.getAllTransactions);
router.get('/transactions/:id', transactionController.getTransaction);
router.post('/transactions/:id/cancel', transactionController.cancelTransaction);

export default router;
