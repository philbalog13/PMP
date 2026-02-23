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
        try {
            const result = await rpcAdapter.handleRequest('verify-mac', req.body) as Record<string, unknown>;
            const response: Record<string, unknown> = { success: true, ...result };
            res.json(response);
        } catch (error: unknown) {
            const err = error as { statusCode?: number; message: string; code?: string; details?: unknown };
            if (err.statusCode) {
                res.status(err.statusCode).json({ success: false, error: err.message, code: err.code, details: err.details });
            } else {
                res.status(500).json({ success: false, error: 'Internal HSM error', code: 'INTERNAL_ERROR' });
            }
        }
    };

    public translateKey = async (req: Request, res: Response): Promise<void> => {
        await this.handleCommand('translate-key', req, res);
    };

    public generateCvv = async (req: Request, res: Response): Promise<void> => {
        await this.handleCommand('generate-cvv', req, res);
    };

    public encryptData = async (req: Request, res: Response): Promise<void> => {
        const studentId = req.headers['x-student-id'] as string | undefined;
        const mode = String(req.body?.mode || '').toUpperCase();

        try {
            const result = await rpcAdapter.handleRequest('encrypt-data', req.body) as Record<string, unknown>;
            const response: Record<string, unknown> = { success: true, ...result };

            // HSM-004 : flag retournÃƒÂ© quand mode ECB est utilisÃƒÂ© Ã¢â‚¬â€ rÃƒÂ©vÃƒÂ¨le la vulnÃƒÂ©rabilitÃƒÂ© ECB penguin
            if (mode === 'ECB' && studentId) {
                const flag = VulnEngine.generateFlag(studentId, 'HSM-004');
                if (flag) {
                    response.flag = flag;
                    response._ctf = 'HSM-004: AES-ECB rÃƒÂ©vÃƒÂ¨le les patterns Ã¢â‚¬â€ blocks identiques produisent le mÃƒÂªme chiffrÃƒÂ©';
                }
            }

            res.json(response);
        } catch (error: unknown) {
            const err = error as { statusCode?: number; message: string; code?: string; details?: unknown };
            if (err.statusCode) {
                res.status(err.statusCode).json({ success: false, error: err.message, code: err.code, details: err.details });
            } else {
                res.status(500).json({ success: false, error: 'Internal HSM error', code: 'INTERNAL_ERROR' });
            }
        }
    };

    public calculateKcv = async (req: Request, res: Response): Promise<void> => {
        await this.handleCommand('calculate-kcv', req, res);
    };

    public listKeys = (req: Request, res: Response): void => {
        const studentId = req.headers['x-student-id'] as string | undefined;
        const keys = hsm.keyStorage.listKeys();
        const response: Record<string, unknown> = {
            keys,
            keyMetadata: [
                { label: 'LMK', createdAt: '2020-01-01T00:00:00Z', lastRotated: '2024-01-01T00:00:00Z', rotationCount: 4 },
                { label: 'ZPK_001', createdAt: '2023-06-01T00:00:00Z', lastRotated: '2024-06-01T00:00:00Z', rotationCount: 2 },
                { label: 'ZPK_TEST', createdAt: '2020-01-01T00:00:00Z', lastRotated: '2020-01-01T00:00:00Z', rotationCount: 0 },
                { label: 'KEK', createdAt: '2023-01-01T00:00:00Z', lastRotated: '2024-01-01T00:00:00Z', rotationCount: 1 },
            ]
        };

        const flag001 = VulnEngine.generateFlag(studentId || '', 'HSM-001');
        if (flag001) {
            response.flag = flag001;
            response._ctf = 'HSM-001: Broken Access Control - cles exposees sans authentification';
        }

        if (studentId) {
            const flag002 = VulnEngine.generateFlag(studentId, 'HSM-002');
            if (flag002) {
                res.setHeader('X-CTF-Flag-HSM002', flag002);
            }

            const flag003 = VulnEngine.generateFlag(studentId, 'KEY-003');
            if (flag003) {
                res.setHeader('X-CTF-Flag-KEY003', flag003);
            }
        }

        res.json(response);
    };

    public backup = (req: Request, res: Response): void => {
        const studentId = req.headers['x-student-id'] as string | undefined;

        // KEY-001 : LMK components exposÃƒÂ©s en clair dans le backup
        const flag = VulnEngine.generateFlag(studentId || '', 'KEY-001');

        const response: Record<string, unknown> = {
            success: true,
            generatedAt: new Date().toISOString(),
            lmkComponents: ['AAAABBBBCCCCDDDD', '1111222233334444', 'FFFFEEEEDDDDCCCC'],
            warning: 'Backup is exported in clear text for educational vulnerability labs'
        };
        if (flag) {
            response.flag = flag;
            response._ctf = 'KEY-001: LMK components exposÃƒÂ©s en clair Ã¢â‚¬â€ violation PCI HSM';
        }

        res.json(response);
    };

    public terminalKeys = (req: Request, res: Response): void => {
        const studentId = req.headers['x-student-id'] as string | undefined;

        // KEY-002 : tous les terminaux partagent le mÃƒÂªme KEK Ã¢â€ â€™ flag dans le body
        const flag = VulnEngine.generateFlag(studentId || '', 'KEY-002');

        const terminals = [
            { terminalId: 'TERM001', kek: 'KEK_SHARED_001', zpk: 'ZPK_ENC_TERM001' },
            { terminalId: 'TERM002', kek: 'KEK_SHARED_001', zpk: 'ZPK_ENC_TERM002' },
            { terminalId: 'TERM003', kek: 'KEK_SHARED_001', zpk: 'ZPK_ENC_TERM003' }
        ];

        const response: Record<string, unknown> = { terminals };
        if (flag) {
            response.flag = flag;
            response._ctf = 'KEY-002: Tous les terminaux partagent le mÃƒÂªme KEK Ã¢â‚¬â€ compromission en cascade';
        }

        res.json(response);
    };

    public exportKey = (req: Request, res: Response): void => {
        const keyLabel = String(req.body?.keyLabel || '').trim().toUpperCase();
        const wrapperKeyLabel = String(req.body?.wrapperKeyLabel || '').trim().toUpperCase();
        const studentId = req.headers['x-student-id'] as string | undefined;

        if (!keyLabel || !wrapperKeyLabel) {
            res.status(400).json({ success: false, error: 'keyLabel and wrapperKeyLabel are required' });
            return;
        }

        const key = hsm.keyStorage.getKey(keyLabel);
        const wrapper = hsm.keyStorage.getKey(wrapperKeyLabel);
        if (!key || !wrapper) {
            res.status(404).json({ success: false, error: 'Key not found' });
            return;
        }

        const wrappedKey = Buffer.from(`${wrapper.value}:${key.value}`).toString('base64');
        const response: Record<string, unknown> = {
            success: true,
            keyLabel,
            wrapperKeyLabel,
            wrappedKey,
            _ctf: 'KEY-004: Le HSM permet d\'exporter une clÃƒÂ© forte sous une clÃƒÂ© wrapper Ã¢â‚¬â€ downgrade de sÃƒÂ©curitÃƒÂ©'
        };

        // KEY-004 : flag quand une clÃƒÂ© forte (ZPK_001, LMK) est exportÃƒÂ©e sous une clÃƒÂ© faible (ZPK_TEST)
        // ZPK_TEST est connue (valeur triviale) Ã¢â€ â€™ l'export permet de rÃƒÂ©cupÃƒÂ©rer la clÃƒÂ© forte en clair
        const WEAK_KEYS = ['ZPK_TEST', 'TEST', 'WEAK'];
        const SENSITIVE_KEYS = ['ZPK_001', 'LMK', 'KEK', 'ZPK_PROD'];
        if (studentId && WEAK_KEYS.includes(wrapperKeyLabel) && SENSITIVE_KEYS.includes(keyLabel)) {
            const flag = VulnEngine.generateFlag(studentId, 'KEY-004');
            if (flag) {
                response.flag = flag;
                response._ctf = `KEY-004: ClÃƒÂ© ${keyLabel} exportÃƒÂ©e sous la clÃƒÂ© faible ${wrapperKeyLabel} Ã¢â‚¬â€ brute-force trivial possible`;
            }
        }

        res.json(response);
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

    public verifyPin = (req: Request, res: Response): void => {
        const pinBlock = String(req.body?.pinBlock || '');
        const studentId = req.headers['x-student-id'] as string | undefined;
        const vulns = ((req as any).vulnConfig || VulnEngine.getConfig(req)) as ReturnType<typeof VulnEngine.getConfig>;

        if (vulns.simulateDown) {
            // PIN-001 : fail-open Ã¢â€ â€™ flag dans le body quand HSM simulÃƒÂ© hors-ligne
            const flag = VulnEngine.generateFlag(studentId || '', 'PIN-001');
            const response: Record<string, unknown> = {
                success: true,
                verified: true,
                mode: 'FAIL_OPEN',
                reason: 'HSM unavailable - fallback accepted'
            };
            if (flag) {
                response.flag = flag;
                response._ctf = 'PIN-001: PIN verification dÃƒÂ©sactivÃƒÂ©e Ã¢â‚¬â€ HSM simulÃƒÂ© hors-ligne';
            }
            res.json(response);
            return;
        }

        const isValid = pinBlock.includes('0412') || pinBlock.endsWith('1234');
        res.json({
            success: true,
            verified: isValid
        });
    };

    public generatePinBlock = (req: Request, res: Response): void => {
        const pin = String(req.body?.pin || '1234').replace(/\D/g, '').slice(0, 12) || '1234';
        const pan = String(req.body?.pan || '4111111111111111').replace(/\D/g, '').slice(-12);
        const studentId = req.headers['x-student-id'] as string | undefined;

        // PIN-002 : Math.random() comme PRNG pour le padding Ã¢â‚¬â€ faible entropie
        const weakPadding = `${Math.floor(Math.random() * 99999999)}`.padStart(8, '0');
        const pinBlock = `04${pin}${pan}${weakPadding}`.slice(0, 16).padEnd(16, '0');

        // Flag dans header discret Ã¢â‚¬â€ l'ÃƒÂ©tudiant doit analyser plusieurs pinBlocks pour dÃƒÂ©tecter le pattern
        const flag = VulnEngine.generateFlag(studentId || '', 'PIN-002');
        if (flag && studentId) {
            res.setHeader('X-CTF-Flag-PIN002', flag);
        }

        res.json({
            success: true,
            pinBlock,
            _ctf: 'PIN-002: Padding gÃƒÂ©nÃƒÂ©rÃƒÂ© avec Math.random() Ã¢â‚¬â€ PRNG non cryptographique'
        });
    };
}

