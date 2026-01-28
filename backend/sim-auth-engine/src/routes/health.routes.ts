/**
 * Health Routes
 */
import { Router } from 'express';
import { health, liveness, readiness } from '../controllers/health.controller';

const router = Router();

router.get('/', health);
router.get('/live', liveness);
router.get('/ready', readiness);

export default router;
