import { Router } from 'express';
import * as transactionController from '../controllers/transaction.controller';
import { ColdBootService } from '../services/coldboot.service';

const router = Router();

router.get('/health', (req, res) => {
    const coldBoot = ColdBootService.getInstance();
    const session = coldBoot.getSessionInfo();
    res.json({
        status: 'healthy',
        service: 'sim-pos-service',
        timestamp: new Date().toISOString(),
        coldBoot: {
            ready: session.ready,
            sessionId: session.sessionId,
            expiresAt: session.expiresAt,
            zpkKcv: session.zpkKcv
        }
    });
});

router.post('/transactions', transactionController.createTransaction);
router.post('/telecollecte', transactionController.triggerTelecollecte);
router.get('/transactions', transactionController.getAllTransactions);
router.get('/transactions/:id', transactionController.getTransaction);
router.post('/transactions/:id/cancel', transactionController.cancelTransaction);

export default router;
