import { Request, Response } from 'express';
import { HSMSimulator } from '../core/HSMSimulator';
import { HsmError, isHsmError } from '../core/errors';
import { JSONRPCProtocol } from '../protocols/JSONRPC';
import { VulnEngine } from '../services/VulnEngine';

const hsm = HSMSimulator.getInstance();
const rpcAdapter = new JSONRPCProtocol(hsm);

export class HSMController {
    private async handleCommand(method: string, req: Request, res: Response): Promise<void> {
        try {
            const result = await rpcAdapter.handleRequest(method, req.body);
            const body = typeof result === 'object' && result !== null
                ? result as Record<string, unknown>
                : { result };
            res.json({ success: true, ...body });
        } catch (error: unknown) {
            const err = error as Error;
            if (isHsmError(error)) {
                const hsmError = error as HsmError;
                res.status(hsmError.statusCode).json({
                    success: false,
                    error: hsmError.message,
                    code: hsmError.code,
                    details: hsmError.details,
                });
                return;
            }

            console.error('[HSM] Unhandled error:', err.message);
            res.status(500).json({
                success: false,
                error: 'Internal HSM error',
                code: 'INTERNAL_ERROR',
            });
        }
    }

    public encryptPin = async (req: Request, res: Response): Promise<void> => {
        await this.handleCommand('encrypt-pin', req, res);
    };

    public decryptPin = async (req: Request, res: Response): Promise<void> => {
        await this.handleCommand('decrypt-pin', req, res);
    };

    public generateMac = async (req: Request, res: Response): Promise<void> => {
        await this.handleCommand('generate-mac', req, res);
    };

    public verifyMac = async (req: Request, res: Response): Promise<void> => {
        await this.handleCommand('verify-mac', req, res);
    };

    public translateKey = async (req: Request, res: Response): Promise<void> => {
        await this.handleCommand('translate-key', req, res);
    };

    public generateCvv = async (req: Request, res: Response): Promise<void> => {
        await this.handleCommand('generate-cvv', req, res);
    };

    public encryptData = async (req: Request, res: Response): Promise<void> => {
        await this.handleCommand('encrypt-data', req, res);
    };

    public calculateKcv = async (req: Request, res: Response): Promise<void> => {
        await this.handleCommand('calculate-kcv', req, res);
    };

    public listKeys = (_req: Request, res: Response): void => {
        res.json({ keys: hsm.keyStorage.listKeys() });
    };

    public status = (_req: Request, res: Response): void => {
        res.json({ success: true, status: hsm.getStatus() });
    };

    public getConfig = (_req: Request, res: Response): void => {
        res.json({
            success: true,
            vulnerabilities: VulnEngine.getConfig(),
            status: hsm.getStatus(),
        });
    };

    public setConfig = (req: Request, res: Response): void => {
        const body = (req.body ?? {}) as {
            vulnerabilities?: Partial<ReturnType<typeof VulnEngine.getConfig>>;
            simulateTamper?: boolean;
            resetTamper?: boolean;
            reloadKeys?: boolean;
        };

        if (body.vulnerabilities) {
            VulnEngine.updateConfig(body.vulnerabilities);
        }

        if (body.simulateTamper) {
            hsm.triggerTamper('MANUAL_TRIGGER');
        }

        if (body.resetTamper) {
            hsm.resetAfterTamper();
        }

        if (body.reloadKeys) {
            hsm.keyStorage.reloadDefaults();
        }

        res.json({
            success: true,
            vulnerabilities: VulnEngine.getConfig(),
            status: hsm.getStatus(),
        });
    };
}
