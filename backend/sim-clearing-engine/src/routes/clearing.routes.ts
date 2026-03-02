import { Router } from 'express';
import * as clearingController from '../controllers/clearing.controller';

const router = Router();

router.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        service: 'sim-clearing-engine',
        timestamp: new Date().toISOString(),
        _educational: {
            role: 'Back-Office de Compensation (Télécollecte)',
            description: 'Moteur de réconciliation end-of-day pour le rapprochement des flux acquéreurs.',
            isoStandard: 'ISO 8583 — TC33 (Transaction Clearing Record)'
        }
    });
});

// Batch submission (from acquirer telecollecte)
router.post('/clearing/batch', clearingController.submitBatch);

// Batch listing and details
router.get('/clearing/batches', clearingController.listBatches);
router.get('/clearing/batches/:id', clearingController.getBatch);

// Clearing balance by merchant
router.get('/clearing/balance', clearingController.getClearingBalance);

export default router;
