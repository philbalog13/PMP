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
            res.json(result);
        } catch (error: any) {
            res.status(500).json({
                transStatus: 'U',
                error: error.message
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
            res.json(result);
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
        const { txId } = req.query;
        res.json({
            challengeUrl: `http://localhost:3005/3ds-challenge?txId=${txId}`,
            method: 'GET'
        });
    };
}
