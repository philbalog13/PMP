"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HSMController = void 0;
const HSMSimulator_1 = require("../core/HSMSimulator");
const JSONRPC_1 = require("../protocols/JSONRPC");
// import { KeyStore } from '../services/KeyStore'; // Deprecated in favor of Core KeyStore
// import { PINBlockManager, MACManager, CVVGenerator, hexToBuffer, bufferToHex, encryptTDES, decryptTDES } from '@pmp/crypto-edu';
// Instantiate Firmware
const hsm = HSMSimulator_1.HSMSimulator.getInstance();
const rpcAdapter = new JSONRPC_1.JSONRPCProtocol(hsm);
class HSMController {
    // Generic Command Handler Wrapper
    async handleCommand(method, req, res) {
        try {
            const result = await rpcAdapter.handleRequest(method, req.body);
            res.json({ success: true, ...result });
        }
        catch (error) {
            console.error(error);
            if (error.message.includes('TAMPER')) {
                res.status(503).json({ error: 'HSM TAMPERED - SERVICE HALTED', code: 'TAMPER_DETECTED' });
            }
            else {
                res.status(500).json({ error: error.message });
            }
        }
    }
    encryptPin(req, res) {
        new HSMController().handleCommand('encrypt-pin', req, res);
    }
    generateMac(req, res) {
        new HSMController().handleCommand('generate-mac', req, res);
    }
    verifyMac(req, res) {
        new HSMController().handleCommand('verify-mac', req, res);
    }
    translateKey(req, res) {
        new HSMController().handleCommand('translate-key', req, res);
    }
    generateCvv(req, res) {
        new HSMController().handleCommand('generate-cvv', req, res);
    }
    // Admin Endpoints - Direct Access to Firmware Internals for Education
    listKeys(req, res) {
        // Access Core KeyStorage
        res.json({ keys: hsm.keyStorage.listKeys() });
    }
    getConfig(req, res) {
        // TODO: Move config to HSMSimulator settings
        // const { VulnEngine } = require('../services/VulnEngine');
        // res.json(VulnEngine.getConfig());
        res.json({ note: 'Migrated to Firmware Config' });
    }
    setConfig(req, res) {
        // const { VulnEngine } = require('../services/VulnEngine');
        // VulnEngine.updateConfig(req.body);
        res.json({ success: true });
    }
}
exports.HSMController = HSMController;
