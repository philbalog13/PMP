import { Request, Response } from 'express';
import { HSMSimulator } from '../core/HSMSimulator';
import { JSONRPCProtocol } from '../protocols/JSONRPC';
// import { KeyStore } from '../services/KeyStore'; // Deprecated in favor of Core KeyStore
// import { PINBlockManager, MACManager, CVVGenerator, hexToBuffer, bufferToHex, encryptTDES, decryptTDES } from '@pmp/crypto-edu';

// Instantiate Firmware
const hsm = HSMSimulator.getInstance();
const rpcAdapter = new JSONRPCProtocol(hsm);

export class HSMController {

    // Generic Command Handler Wrapper
    private async handleCommand(method: string, req: Request, res: Response) {
        try {
            const result = await rpcAdapter.handleRequest(method, req.body);
            res.json({ success: true, ...result });
        } catch (error: any) {
            console.error(error);
            if (error.message.includes('TAMPER')) {
                res.status(503).json({ error: 'HSM TAMPERED - SERVICE HALTED', code: 'TAMPER_DETECTED' });
            } else {
                res.status(500).json({ error: error.message });
            }
        }
    }

    encryptPin(req: Request, res: Response) {
        new HSMController().handleCommand('encrypt-pin', req, res);
    }

    decryptPin(req: Request, res: Response) {
        new HSMController().handleCommand('decrypt-pin', req, res);
    }

    generateMac(req: Request, res: Response) {
        new HSMController().handleCommand('generate-mac', req, res);
    }

    verifyMac(req: Request, res: Response) {
        new HSMController().handleCommand('verify-mac', req, res);
    }

    translateKey(req: Request, res: Response) {
        new HSMController().handleCommand('translate-key', req, res);
    }

    generateCvv(req: Request, res: Response) {
        new HSMController().handleCommand('generate-cvv', req, res);
    }

    encryptData(req: Request, res: Response) {
        new HSMController().handleCommand('encrypt-data', req, res);
    }

    calculateKcv(req: Request, res: Response) {
        new HSMController().handleCommand('calculate-kcv', req, res);
    }

    // Admin Endpoints - Direct Access to Firmware Internals for Education
    listKeys(req: Request, res: Response) {
        // Access Core KeyStorage
        res.json({ keys: hsm.keyStorage.listKeys() });
    }

    getConfig(req: Request, res: Response) {
        // TODO: Move config to HSMSimulator settings
        // const { VulnEngine } = require('../services/VulnEngine');
        // res.json(VulnEngine.getConfig());
        res.json({ note: 'Migrated to Firmware Config' });
    }

    setConfig(req: Request, res: Response) {
        // const { VulnEngine } = require('../services/VulnEngine');
        // VulnEngine.updateConfig(req.body);
        res.json({ success: true });
    }
}
