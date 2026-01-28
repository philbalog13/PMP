/**
 * Authorization Routes
 */
import { Router } from 'express';
import {
    authorize,
    getTransactions,
    simulate,
    // simulate already imported above
} from '../controllers/authorization.controller';

const router = Router();

// Authorization
router.post('/authorize', authorize);

// Transactions
router.get('/transactions/:pan', getTransactions);

// Simulation
router.post('/simulate/:scenario', simulate);

// Rules management handled in rules.routes.ts

export default router;
