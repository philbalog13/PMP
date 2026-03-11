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

/**
 * @route POST /transaction/key-exchange
 * @description Cold Boot / NAC: derive a session ZPK from HSM for a POS terminal.
 * Called by sim-acquirer-service during terminal Cold Boot sequence.
 * Flow: Acquirer → Network Switch → HSM Simulator
 */
router.post('/key-exchange', async (req, res) => {
    const { terminalId, sessionId } = req.body as { terminalId?: string; sessionId?: string };
    const hsmUrl = process.env.HSM_SIMULATOR_URL || 'http://hsm-simulator:8011';

    try {
        const axios = require('axios');
        console.log(`[SWITCH] Cold Boot key-exchange for terminal ${terminalId}`);
        const hsmResponse = await axios.post(
            `${hsmUrl}/session-key`,
            { terminalId, sessionId },
            { timeout: 5000 }
        );
        res.json({
            success: true,
            data: hsmResponse.data?.data,
            _educational: {
                role: 'Network Switch (Réseau Monétique)',
                description: 'Le switch route la demande de clé de session vers le HSM de l\'émetteur',
                flow: 'POS → Acquéreur → Switch (vlan-acquereur ∩ vlan-emetteur) → HSM'
            }
        });
    } catch (error: any) {
        console.error(`[SWITCH] key-exchange failed:`, error.message);
        res.status(503).json({ success: false, error: 'HSM unavailable for key exchange' });
    }
});

export default router;
