/**
 * Rules Routes
 * Endpoints for managing authorization rules
 */
import { Router } from 'express';
import {
    getRules,
    getRuleById,
    createRule,
    updateRule,
    deleteRule,
    importRules,
    getMetrics
} from '../controllers/rules.controller';

const router = Router();

// Rule Metrics
router.get('/metrics', getMetrics);

// Rules management
router.get('/', getRules);
router.post('/', createRule);
router.post('/import', importRules);
router.get('/:id', getRuleById);
router.put('/:id', updateRule); // Supports full update or partial (enabled/priority)
router.delete('/:id', deleteRule);

export default router;
