/**
 * ACS Controller
 * HTTP handlers for 3DS authentication endpoints
 */

import { Request, Response } from 'express';
import { ThreeDSecureService } from '../services/ThreeDSecureService';

export class ACSController {
    private threeDSService: ThreeDSecureService;

    constructor() {
        this.threeDSService = new ThreeDSecureService();
    }

    /**
     * POST /authenticate
     * Main 3DS authentication endpoint
     */
    authenticate = async (req: Request, res: Response) => {
        try {
            const result = await this.threeDSService.authenticate(req.body);

            // Add educational metadata
            const eduHint = result.transStatus === 'C'
                ? "L'ACS demande un Challenge (C) car le score de risque est élevé. Le client doit être redirigé vers l'URL de challenge."
                : "L'ACS a validé l'authentification sans friction (Frictionless). Le transStatus est 'Y'.";

            res.json({
                ...result,
                _eduHint: eduHint
            });
        } catch (error: any) {
            res.status(500).json({
                transStatus: 'U',
                error: error.message,
                _eduHint: "Une erreur système s'est produite (U - Unique/Unavailable)."
            });
        }
    };

    /**
     * POST /challenge/verify
     * Verify OTP during challenge flow
     */
    verifyChallenge = async (req: Request, res: Response) => {
        try {
            const { acsTransId, otp } = req.body;
            const result = await this.threeDSService.verifyChallenge(acsTransId, otp);

            const eduHint = result.transStatus === 'Y'
                ? "Succès : L'OTP est valide. L'ACS génère un CAVV/AAV pour prouver l'authentification."
                : "Échec : L'OTP est incorrect. La transaction doit être refusée (N).";

            res.json({
                ...result,
                _eduHint: eduHint
            });
        } catch (error: any) {
            res.status(500).json({
                transStatus: 'U',
                error: error.message
            });
        }
    };

    /**
     * POST /ares
     * Authentication Response (ARes)
     */
    sendARes = async (req: Request, res: Response) => {
        try {
            const { threeDSServerTransID, transStatus } = req.body;

            res.json({
                threeDSServerTransID,
                acsTransID: `ACS_${Date.now()}`,
                transStatus,
                messageType: 'ARes',
                messageVersion: '2.2.0'
            });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    };

    /**
     * GET /challenge
     * Get challenge flow URL
     */
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
