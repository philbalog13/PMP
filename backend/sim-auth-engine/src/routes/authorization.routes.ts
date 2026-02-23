/**
 * Authorization Routes
 */
import { Router } from 'express';
import {
    authorize,
    getTransactions,
    simulate,
    generateCode,
    // simulate already imported above
} from '../controllers/authorization.controller';

const router = Router();

// Authorization
router.post('/authorize', authorize);

// Transactions
router.get('/transactions/:pan', getTransactions);

// Simulation
router.post('/simulate/:scenario', simulate);
router.post('/auth/generate-code', generateCode);

// Rules management handled in rules.routes.ts

export default router;
