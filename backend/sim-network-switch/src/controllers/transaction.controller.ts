/**
 * Transaction Controller
 * Handles transaction routing requests
 */
import { Request, Response, NextFunction } from 'express';
import { routingService } from '../services/routing.service';
import { validateTransactionRequest, validateBinLookup, ValidationError } from '../middleware';
import { TransactionRequest } from '../models';
import { logger } from '../utils/logger';
import { recordTransaction } from '../utils/metrics';
import { generateFlag } from '../ctfFlag';
import { ctfRedis } from '../services/ctfRedis.service';

interface LegacyTrafficLogEntry {
    id: string;
    timestamp: string;
    rawMessage: string;
    pan: string;
    amount: number;
    currency: string;
}

const legacyTrafficLogs: LegacyTrafficLogEntry[] = [];
let emvNonceCounter = 1000;

const nowParts = () => {
    const now = new Date();
    const pad = (value: number, size = 2): string => value.toString().padStart(size, '0');
    return {
        transmissionDateTime: `${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`,
        localTransactionTime: `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`,
        localTransactionDate: `${pad(now.getMonth() + 1)}${pad(now.getDate())}`,
    };
};

const toAmount = (value: unknown, fallback = 100): number => {
    if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
        return value;
    }
    if (typeof value === 'string') {
        const parsed = Number(value);
        if (Number.isFinite(parsed) && parsed > 0) {
            return parsed;
        }
    }
    return fallback;
};

const toThreeDigitString = (value: unknown, fallback: string): string => {
    if (typeof value === 'string' && /^\d{3}$/.test(value)) {
        return value;
    }
    return fallback;
};

const buildLegacyTransaction = (body: Record<string, unknown>): TransactionRequest => {
    const timestamps = nowParts();
    const generatedStan = `${Math.floor(Math.random() * 1000000)}`.padStart(6, '0');
    const generatedArn = `ARN${Date.now().toString().slice(-15)}`.slice(0, 23);

    return {
        mti: typeof body.mti === 'string' && /^\d{4}$/.test(body.mti) ? body.mti : '0100',
        pan: typeof body.pan === 'string' ? body.pan : '4111111111111111',
        processingCode: typeof body.processingCode === 'string' && /^\d{6}$/.test(body.processingCode)
            ? body.processingCode
            : '000000',
        amount: toAmount(body.amount),
        currency: typeof body.currency === 'string' && body.currency.length === 3 ? body.currency : '978',
        transmissionDateTime: timestamps.transmissionDateTime,
        localTransactionTime: timestamps.localTransactionTime,
        localTransactionDate: timestamps.localTransactionDate,
        stan: typeof body.stan === 'string' && /^\d{6}$/.test(body.stan) ? body.stan : generatedStan,
        terminalId: typeof body.terminalId === 'string' ? body.terminalId.slice(0, 8) : 'TERM0001',
        merchantId: typeof body.merchantId === 'string' ? body.merchantId.slice(0, 15) : 'SHOP001',
        merchantCategoryCode: typeof body.merchantCategoryCode === 'string' && /^\d{4}$/.test(body.merchantCategoryCode)
            ? body.merchantCategoryCode
            : (typeof body.mcc === 'string' && /^\d{4}$/.test(body.mcc) ? body.mcc : '5411'),
        expiryDate: typeof body.expiryDate === 'string' && /^\d{4}$/.test(body.expiryDate) ? body.expiryDate : '2812',
        posEntryMode: toThreeDigitString(body.posEntryMode, '010'),
        acquirerReferenceNumber: typeof body.acquirerReferenceNumber === 'string'
            ? body.acquirerReferenceNumber.slice(0, 23)
            : generatedArn,
        transactionId: typeof body.transactionId === 'string' ? body.transactionId : undefined,
        transactionType: typeof body.transactionType === 'string' ? body.transactionType : undefined,
        additionalData: {
            ...body,
            _legacyAuthorize: true,
        },
        pinBlock: typeof body.pinBlock === 'string' ? body.pinBlock : undefined,
    };
};

const pushTrafficLog = (transaction: TransactionRequest): void => {
    const cvv = typeof transaction.additionalData?.cvv === 'string'
        ? transaction.additionalData.cvv
        : undefined;

    const rawMessage = [
        transaction.mti,
        transaction.pan,
        transaction.processingCode,
        Math.round(transaction.amount * 100).toString().padStart(12, '0'),
        transaction.stan,
        ...(cvv ? [`cvv=${cvv}`] : []),
    ].join('|');

    legacyTrafficLogs.unshift({
        id: `${Date.now()}-${transaction.stan}`,
        timestamp: new Date().toISOString(),
        rawMessage,
        pan: transaction.pan,
        amount: transaction.amount,
        currency: transaction.currency,
    });

    if (legacyTrafficLogs.length > 100) {
        legacyTrafficLogs.length = 100;
    }
};

/**
 * Route a transaction through the network switch
 * POST /transaction
 */
export const routeTransaction = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    const startTime = Date.now();

    try {
        // Log incoming request for debugging
        logger.info('Received transaction request', {
            body: JSON.stringify(req.body).substring(0, 500),
            requestId: req.requestId,
        });

        // Validate input
        const { error, value } = validateTransactionRequest(req.body);
        if (error) {
            logger.error('Validation failed', {
                details: JSON.stringify(error.details),
                requestId: req.requestId,
            });
            throw new ValidationError('Invalid transaction request', error.details);
        }

        const transaction: TransactionRequest = value;

        logger.info('Processing transaction', {
            stan: transaction.stan,
            amount: transaction.amount,
            currency: transaction.currency,
            merchantId: transaction.merchantId,
            requestId: req.requestId,
        });

        // Route transaction
        const response = await routingService.routeTransaction(transaction);

        // Record metrics
        const duration = Date.now() - startTime;
        recordTransaction(
            response.networkId,
            response.responseCode === '00' ? 'APPROVED' : 'DECLINED',
            response.responseCode,
            duration
        );

        // Send response
        res.status(200).json({
            success: response.responseCode === '00',
            data: response,
            meta: {
                requestId: req.requestId,
                processingTime: duration,
            },
        });

    } catch (err) {
        next(err);
    }
};

/**
 * Identify network from BIN
 * GET /transaction/network/:pan
 */
export const identifyNetwork = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { pan } = req.params;

        // Validate
        const { error, value } = validateBinLookup({ pan });
        if (error) {
            throw new ValidationError('Invalid PAN format', error.details);
        }

        const network = routingService.identifyNetwork(value.pan);
        const binConfig = routingService.getBinConfig(value.pan);

        res.status(200).json({
            success: true,
            data: {
                network,
                binConfig: binConfig ? {
                    network: binConfig.network,
                    issuerName: binConfig.issuerName,
                    cardType: binConfig.cardType,
                    country: binConfig.country,
                } : null,
            },
            meta: {
                requestId: req.requestId,
            },
        });

    } catch (err) {
        next(err);
    }
};

/**
 * Get supported networks
 * GET /transaction/networks
 */
export const getSupportedNetworks = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const networks = routingService.getSupportedNetworks();

        res.status(200).json({
            success: true,
            data: {
                networks,
                count: networks.length,
            },
            meta: {
                requestId: req.requestId,
            },
        });

    } catch (err) {
        next(err);
    }
};

/**
 * Get BIN routing table (admin/debug)
 * GET /transaction/bin-table
 */
export const getBinTable = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const studentId = req.headers['x-student-id'] as string | undefined;
        const binTable = routingService.getBinTable();

        const response: Record<string, unknown> = {
            success: true,
            data: {
                entries: binTable.length,
                table: binTable,
            },
            meta: {
                requestId: req.requestId,
            },
        };

        // ISO-001 : BIN table exposÃ©e sans auth â€” flag dans le body JSON
        if (studentId) {
            const flag = generateFlag(studentId, 'ISO-001');
            if (flag) {
                response.flag = flag;
                response._ctf = 'ISO-001: Table de routage BIN exposÃ©e sans authentification â€” topologie rÃ©seau rÃ©vÃ©lÃ©e';
            }
        }

        res.status(200).json(response);

    } catch (err) {
        next(err);
    }
};

/**
 * Legacy CTF endpoint
 * POST /transaction/authorize
 */
export const authorizeLegacy = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const body = (req.body ?? {}) as Record<string, unknown>;
        const studentId = req.headers['x-student-id'] as string | undefined;
        const transaction = buildLegacyTransaction(body);
        const response = await routingService.routeTransaction(transaction);
        const cvv = typeof body.cvv === 'string' ? body.cvv : undefined;

        pushTrafficLog(transaction);

        const authorizationCode = response.authorizationCode || `AUTH${response.stan.slice(-2)}`;
        const result: Record<string, unknown> = {
            success: response.responseCode === '00',
            responseCode: response.responseCode,
            responseMessage: response.responseMessage,
            authCode: authorizationCode,
            authorizationCode,
            stan: response.stan,
            rrn: response.acquirerReferenceNumber,
            emvData: {
                tc: `TC${response.stan}`,
            },
            ...(cvv ? { cvv } : {})
        };

        // ISO-002 : montant astronomique acceptÃ© sans validation â€” flag si amount > 100 000
        // REPLAY-001: same payload accepted repeatedly without deduplication.
        if (studentId) {
            const replayFingerprint = [
                transaction.pan,
                transaction.amount,
                transaction.currency,
                transaction.merchantId,
                transaction.posEntryMode
            ].join('|');
            const replayCount = await ctfRedis.incrementReplayCounter(studentId, replayFingerprint);
            if (replayCount >= 2) {
                const flag = generateFlag(studentId, 'REPLAY-001');
                if (flag) {
                    result.flag = result.flag ?? flag;
                    result._ctf_replay001 = `REPLAY-001: Identical authorization replayed ${replayCount} times and still accepted`;
                }
            }
        }

        if (studentId && transaction.amount > 100000) {
            const flag = generateFlag(studentId, 'ISO-002');
            if (flag) {
                result.flag = flag;
                result._ctf = `ISO-002: Montant ${transaction.amount}â‚¬ acceptÃ© sans plafond â€” absence de validation business`;
            }
        }

        // MITM-001: Persist captured CVV for proof validation.
        if (studentId && cvv) {
            await ctfRedis.storeMitmProofCvv(studentId, cvv);
        }

        // EMV-001 : magstripe fallback (posEntryMode=090 ou 800)
        const posMode = typeof body.posEntryMode === 'string' ? body.posEntryMode : '';
        const isMagstripe = posMode === '090' || posMode === '800' || body.fallbackIndicator === true || body.track2;
        if (studentId && isMagstripe) {
            const flag = generateFlag(studentId, 'EMV-001');
            if (flag) {
                result.flag = result.flag ?? flag;
                result._ctf_emv001 = 'EMV-001: Fallback magstripe acceptÃ© sans vÃ©rification EMV supplÃ©mentaire';
            }
        }

        // EMV-003 : TC rejouÃ© â€” montant modifiÃ© avec TC existant
        const emvDataBody = body.emvData as Record<string, unknown> | undefined;
        if (studentId && emvDataBody?.replayedTC === true) {
            const flag = generateFlag(studentId, 'EMV-003');
            if (flag) {
                result.flag = result.flag ?? flag;
                result._ctf_emv003 = 'EMV-003: TC non vÃ©rifiÃ© en temps rÃ©el â€” montant modifiÃ© acceptÃ© avec TC original';
            }
        }

        // EMV-004 : downgrade chip â†’ magstripe via chipError
        if (studentId && typeof body.chipError === 'string' && body.chipError) {
            const flag = generateFlag(studentId, 'EMV-004');
            if (flag) {
                result.flag = result.flag ?? flag;
                result._ctf_emv004 = `EMV-004: Erreur chip (${body.chipError}) forcÃ© un downgrade vers magstripe`;
            }
        }

        // NET-002 : injection SQL dans merchantName
        const merchantName = typeof body.merchantName === 'string' ? body.merchantName : '';
        if (studentId && (merchantName.includes("'") || merchantName.toLowerCase().includes('or 1=1') || merchantName.includes('--'))) {
            const flag = generateFlag(studentId, 'NET-002');
            if (flag) {
                result.flag = result.flag ?? flag;
                result._ctf_net002 = 'NET-002: Injection SQL dÃ©tectÃ©e dans DE 43 (merchantName) â€” champ non assaini';
            }
        }

        res.status(200).json(result);
    } catch (err) {
        next(err);
    }
};

/**
 * Legacy CTF endpoint
 * POST /transaction/raw-message
 */
export const rawMessageLegacy = async (
    req: Request,
    res: Response,
    _next: NextFunction
): Promise<void> => {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const mti = typeof body.mti === 'string' ? body.mti : '0100';
    const de2 = typeof body.de2 === 'string' ? body.de2 : '4111111111111111';
    const de4 = typeof body.de4 === 'string' ? body.de4 : '000000010000';
    const de39 = typeof body.de39 === 'string' ? body.de39 : '00';
    const de11 = typeof body.de11 === 'string' ? body.de11 : `${Math.floor(Math.random() * 1000000)}`.padStart(6, '0');

    const rawMessage = `${mti}|${de2}|000000|${de4}|${de11}|${de39}`;
    legacyTrafficLogs.unshift({
        id: `${Date.now()}-${de11}`,
        timestamp: new Date().toISOString(),
        rawMessage,
        pan: de2,
        amount: Number.parseInt(de4, 10) / 100,
        currency: typeof body.de49 === 'string' ? body.de49 : '978',
    });

    if (legacyTrafficLogs.length > 100) {
        legacyTrafficLogs.length = 100;
    }

    const studentId = req.headers['x-student-id'] as string | undefined;
    const result: Record<string, unknown> = {
        success: true,
        mti,
        de39,
        responseCode: de39,
        accepted: true
    };

    // NET-003 : MTI forgÃ© â€” injection de rÃ©ponse 0110 avec approbation forcÃ©e
    if (studentId && mti === '0110') {
        const flag = generateFlag(studentId, 'NET-003');
        if (flag) {
            result.flag = flag;
            result._ctf = 'NET-003: MTI 0110 (rÃ©ponse) acceptÃ© en entrÃ©e â€” injection de fausse approbation rÃ©ussie';
        }
    }

    // NET-004 : reversal forgÃ© (MTI 0420) avec STAN prÃ©dictible
    if (studentId && (mti === '0420' || mti === '0400')) {
        const flag = generateFlag(studentId, 'NET-004');
        if (flag) {
            result.flag = result.flag ?? flag;
            result._ctf = 'NET-004: Reversal 0420 forgÃ© avec STAN prÃ©dit â€” annulation de transaction lÃ©gitime';
        }
    }

    // NET-005 : absence de MAC â€” montant modifiÃ© sans dÃ©tection
    if (studentId && Number.parseInt(de4, 10) > 1000000) {
        const flag = generateFlag(studentId, 'NET-005');
        if (flag) {
            result.flag = result.flag ?? flag;
            result._ctf = 'NET-005: Montant modifiÃ© en transit acceptÃ© sans MAC (DE64/128) â€” absence de contrÃ´le d\'intÃ©gritÃ©';
        }
    }

    res.json(result);
};

/**
 * Legacy CTF endpoint
 * GET /transaction/recent-logs
 */
export const getRecentLogs = async (
    req: Request,
    res: Response,
    _next: NextFunction
): Promise<void> => {
    const studentId = req.headers['x-student-id'] as string | undefined;

    // NET-001 : logs ISO en clair sans TLS â€” flag dans header discret
    // INFRA-003 : donnÃ©es PCI dans les logs â€” mÃªme endpoint, deux challenges (perspectives diffÃ©rentes)
    if (studentId) {
        const flagNet001 = generateFlag(studentId, 'NET-001');
        if (flagNet001) res.setHeader('X-CTF-Flag-NET001', flagNet001);

        const flagInfra003 = generateFlag(studentId, 'INFRA-003');
        if (flagInfra003) res.setHeader('X-CTF-Flag-INFRA003', flagInfra003);
    }

    res.json(legacyTrafficLogs);
};

/**
 * Legacy CTF endpoint
 * POST /emv/session
 */
export const startEmvSession = async (
    req: Request,
    res: Response,
    _next: NextFunction
): Promise<void> => {
    const studentId = req.headers['x-student-id'] as string | undefined;
    const result: Record<string, unknown> = {
        sessionId: `emv_${Date.now()}`,
        apdus: [
            '00A4040007A0000000031010',
            '80A80000028300',
            '00B2010C00'
        ]
    };
    // EMV-001 : magstripe fallback flag exposÃ© via la session (point d'entrÃ©e du challenge)
    if (studentId) {
        const flag = generateFlag(studentId, 'EMV-001');
        if (flag) {
            result.flag = flag;
            result._ctf = 'EMV-001: Session EMV capturÃ©e â€” exploitez maintenant le fallback magstripe (posEntryMode=090)';
        }
    }
    res.json(result);
};

/**
 * Legacy CTF endpoint
 * POST /emv/relay-test
 */
export const relayEmvSession = async (
    req: Request,
    res: Response,
    _next: NextFunction
): Promise<void> => {
    const studentId = req.headers['x-student-id'] as string | undefined;
    const body = (req.body ?? {}) as Record<string, unknown>;
    const isRelay = body.relayedApdus === true || body.distance === 'remote';

    const result: Record<string, unknown> = {
        success: true,
        approved: true,
        message: 'Relayed APDUs accepted',
        _vuln: 'No distance bounding â€” APDUs accepted regardless of physical proximity'
    };

    // EMV-002 : relay attack â€” flag quand relayedApdus=true (distance non vÃ©rifiÃ©e)
    if (studentId && isRelay) {
        const flag = generateFlag(studentId, 'EMV-002');
        if (flag) {
            result.flag = flag;
            result._ctf = 'EMV-002: NFC relay acceptÃ© sans vÃ©rification de distance â€” attaque de relais rÃ©ussie';
        }
    }
    res.json(result);
};

/**
 * Legacy CTF endpoint
 * GET /emv/terminal-nonce
 */
export const getTerminalNonce = async (
    req: Request,
    res: Response,
    _next: NextFunction
): Promise<void> => {
    const studentId = req.headers['x-student-id'] as string | undefined;
    emvNonceCounter += 1;
    const result: Record<string, unknown> = {
        unpredictableNumber: emvNonceCounter.toString(16).toUpperCase().padStart(8, '0'),
        _vuln: 'Sequential counter used as Unpredictable Number â€” predictable, enables pre-play attack'
    };

    // EMV-005 : UN sÃ©quentiel â€” flag dans la rÃ©ponse (le pattern +1 est Ã©vident)
    if (studentId) {
        const flag = generateFlag(studentId, 'EMV-005');
        if (flag) {
            result.flag = flag;
            result._ctf = 'EMV-005: Nonce terminal sÃ©quentiel (+1) â€” pre-play attack possible';
        }
    }
    res.json(result);
};

export default {
    routeTransaction,
    identifyNetwork,
    getSupportedNetworks,
    getBinTable,
    authorizeLegacy,
    rawMessageLegacy,
    getRecentLogs,
    startEmvSession,
    relayEmvSession,
    getTerminalNonce,
};
