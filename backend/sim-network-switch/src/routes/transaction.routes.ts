/**
 * Transaction Routes
 */
import { Router } from 'express';
import {
    routeTransaction,
    authorizeLegacy,
    rawMessageLegacy,
    getRecentLogs,
    identifyNetwork,
    getSupportedNetworks,
    getBinTable,
} from '../controllers/transaction.controller';

const router = Router();

/**
 * @route POST /transaction
 * @description Route a transaction through the network switch
 */
router.post('/', routeTransaction);

/**
 * @route POST /transaction/authorize
 * @description Legacy CTF authorize endpoint with simplified payload
 */
router.post('/authorize', authorizeLegacy);

/**
 * @route POST /transaction/raw-message
 * @description Legacy CTF raw ISO message endpoint
 */
router.post('/raw-message', rawMessageLegacy);

/**
 * @route GET /transaction/recent-logs
 * @description Legacy CTF endpoint exposing recent raw messages
 */
router.get('/recent-logs', getRecentLogs);

/**
 * @route GET /transaction/network/:pan
 * @description Identify card network from PAN
 */
router.get('/network/:pan', identifyNetwork);

/**
 * @route GET /transaction/networks
 * @description Get all supported networks
 */
router.get('/networks', getSupportedNetworks);

/**
 * @route GET /transaction/bin-table
 * @description Get BIN routing table (admin/debug)
 */
router.get('/bin-table', getBinTable);

export default router;
