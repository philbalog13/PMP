/**
 * Routes Index
 */
import { Router } from 'express';
import authorizationRoutes from './authorization.routes';
import healthRoutes from './health.routes';

import rulesRoutes from './rules.routes';

const router = Router();

router.use('/', authorizationRoutes);
router.use('/health', healthRoutes);
router.use('/rules', rulesRoutes);

export default router;
