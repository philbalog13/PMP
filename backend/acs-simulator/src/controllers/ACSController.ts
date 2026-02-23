import { Request, Response } from 'express';
import { ThreeDSecureService } from '../services/ThreeDSecureService';
import { generateFlag } from '../ctfFlag';

type ThreeDsSession = {
    studentId?: string;
    otp: string;
    createdAt: number;
};

export class ACSController {
    private threeDSService: ThreeDSecureService;
    private sessions = new Map<string, ThreeDsSession>();

    constructor() {
        this.threeDSService = new ThreeDSecureService();
    }

    private getStudentId(req: Request): string | undefined {
        return req.headers['x-student-id'] as string | undefined;
    }

    // 3DS-002 weakness: predictable transaction IDs based on Math.random()
    private nextPredictableTransId(): string {
        const weakPart = `${Math.floor(Math.random() * 1_000_000)}`.padStart(6, '0');
        return `3ds-${Date.now()}-${weakPart}`;
    }

    private parseAmount(body: any): number {
        const direct = Number(body?.amount);
        if (Number.isFinite(direct)) {
            return direct;
        }
        const purchaseAmount = Number(body?.purchaseAmount);
        if (Number.isFinite(purchaseAmount)) {
            return purchaseAmount;
        }
        return 0;
    }

    private isEmailInjection(body: any): boolean {
        const email = String(body?.cardholderInfo?.email || body?.email || '');
        return /('|--|;|or\s+1=1|union\s+select)/i.test(email);
    }

    /**
     * POST /acs/areq
     * AReq -> ARes
     */
    areq = async (req: Request, res: Response) => {
        try {
            const studentId = this.getStudentId(req);
            const amount = this.parseAmount(req.body);
            const requestedTransId = String(req.body?.threeDSServerTransID || '').trim();
            const threeDSServerTransID = requestedTransId || this.nextPredictableTransId();

            const response: Record<string, unknown> = {
                messageType: 'ARes',
                messageVersion: '2.2.0',
                threeDSServerTransID,
                acsTransID: `ACS-${Date.now()}`,
                transStatus: amount >= 500 ? 'C' : 'Y',
            };

            // 3DS-003: email injection in cardholderInfo bypasses authentication.
            if (this.isEmailInjection(req.body)) {
                response.transStatus = 'Y';
                response.authenticationValue = `AAV_${Date.now()}`;
                response._ctf = '3DS-003: Injection in cardholderInfo.email bypassed challenge';
                if (studentId) {
                    const flag = generateFlag(studentId, '3DS-003');
                    if (flag) response.flag = flag;
                }
            }

            // If challenge is required, create session with static OTP
            if (response.transStatus === 'C') {
                this.sessions.set(threeDSServerTransID, {
                    studentId,
                    otp: '123456', // 3DS-001 static OTP weakness
                    createdAt: Date.now(),
                });
            }

            res.json(response);
        } catch (error: any) {
            res.status(500).json({ success: false, error: error.message || 'AReq processing failed' });
        }
    };

    /**
     * POST /acs/creq
     * CReq -> CRes
     */
    evaluateCreq(threeDSServerTransID: string, otp: string, studentId?: string): Record<string, unknown> {
        const session = this.sessions.get(threeDSServerTransID);
        const isForgedFlow = !session && Boolean(threeDSServerTransID);

        const otpExpected = session?.otp || '123456';
        const success = otp === otpExpected;

        const response: Record<string, unknown> = {
            messageType: 'CRes',
            messageVersion: '2.2.0',
            threeDSServerTransID,
            transStatus: success ? 'Y' : 'N',
            challengeCompletionInd: success ? 'Y' : 'N',
        };

        // 3DS-001: static OTP accepted universally
        if (studentId && success && otp === '123456') {
            const flag = generateFlag(studentId, '3DS-001');
            if (flag) {
                response.flag = flag;
                response._ctf = '3DS-001: Static OTP accepted';
            }
        }

        // 3DS-002: transID not validated, forged CReq accepted
        if (studentId && success && isForgedFlow) {
            const flag = generateFlag(studentId, '3DS-002');
            if (flag) {
                response.flag = response.flag ?? flag;
                response._ctf = '3DS-002: Forged CReq accepted without validating threeDSServerTransID';
            }
        }

        return response;
    }

    creq = async (req: Request, res: Response) => {
        try {
            const studentId = this.getStudentId(req);
            const threeDSServerTransID = String(
                req.body?.threeDSServerTransID || req.body?.acsTransID || req.body?.challengeId || '',
            ).trim();
            const otp = String(req.body?.otp || req.body?.challengeData || '').trim();
            const response = this.evaluateCreq(threeDSServerTransID, otp, studentId);
            res.json(response);
        } catch (error: any) {
            res.status(500).json({ success: false, error: error.message || 'CReq processing failed' });
        }
    };

    /**
     * POST /ds/rreq
     * RReq -> RRes
     */
    rreq = async (req: Request, res: Response) => {
        try {
            const threeDSServerTransID = String(req.body?.threeDSServerTransID || '').trim();
            const transStatus = String(req.body?.transStatus || 'Y');
            res.json({
                messageType: 'RRes',
                messageVersion: '2.2.0',
                threeDSServerTransID,
                transStatus,
                result: 'FINALIZED',
            });
        } catch (error: any) {
            res.status(500).json({ success: false, error: error.message || 'RReq processing failed' });
        }
    };

    /**
     * Legacy endpoint compatibility
     * POST /authenticate
     */
    authenticate = async (req: Request, res: Response) => {
        return this.areq(req, res);
    };

    /**
     * Legacy endpoint compatibility
     * POST /challenge/verify
     */
    verifyChallenge = async (req: Request, res: Response) => {
        return this.creq(req, res);
    };

    /**
     * Legacy helper endpoint
     * POST /ares
     */
    sendARes = async (req: Request, res: Response) => {
        const body = req.body || {};
        const response: Record<string, unknown> = {
            messageType: 'ARes',
            messageVersion: '2.2.0',
            threeDSServerTransID: body.threeDSServerTransID || this.nextPredictableTransId(),
            acsTransID: `ACS-${Date.now()}`,
            transStatus: body.transStatus || 'C',
        };
        res.json(response);
    };

    getChallengeUrl = (req: Request, res: Response) => {
        const txId = typeof req.query.txId === 'string' ? req.query.txId : `TX_${Date.now()}`;
        const acsTransId = typeof req.query.acsTransId === 'string' ? req.query.acsTransId : `ACS_${Date.now()}`;
        const returnUrl = typeof req.query.returnUrl === 'string' ? req.query.returnUrl : undefined;
        const challengeBaseUrl = (process.env.THREEDS_CHALLENGE_URL || 'http://localhost:3088').replace(/\/$/, '');
        const challengeUrl = new URL(challengeBaseUrl);
        challengeUrl.searchParams.set('txId', txId);
        challengeUrl.searchParams.set('acsTransId', acsTransId);
        if (returnUrl) {
            challengeUrl.searchParams.set('returnUrl', returnUrl);
        }

        res.json({
            challengeUrl: challengeUrl.toString(),
            method: 'GET'
        });
    };
}
