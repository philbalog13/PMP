import { Router } from 'express';
import * as cardController from '../controllers/card.controller';

const router = Router();

// Health check
router.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        service: 'sim-card-service',
        timestamp: new Date().toISOString()
    });
});

// Card CRUD
router.post('/cards', cardController.createCard);
router.get('/cards', cardController.getAllCards);
router.get('/cards/:pan', cardController.getCardByPan);
router.patch('/cards/:pan/status', cardController.updateCardStatus);
router.delete('/cards/:pan', cardController.deleteCard);

// Validation endpoints
router.post('/cards/validate', cardController.validatePan);
router.post('/cards/validate-transaction', cardController.validateCardForTransaction);

export default router;
