/**
 * Token Controller
 * REST API handlers for tokenization operations
 */

import { Request, Response } from 'express';
import { TokenVault } from '../services/tokenVault';

export class TokenController {
    constructor(private vault: TokenVault) { }

    /**
     * POST /tokenize
     * Body: { pan, ttl?, maxUsages? }
     */
    tokenize = async (req: Request, res: Response) => {
        try {
            const { pan, ttl = 3600, maxUsages = 10 } = req.body;

            if (!pan || !/^\d{13,19}$/.test(pan)) {
                return res.status(400).json({ error: 'Invalid PAN format' });
            }

            const metadata = await this.vault.tokenize(pan, ttl, maxUsages);

            res.json({
                token: metadata.token,
                expiresAt: metadata.expiresAt,
                maxUsages: metadata.maxUsages
            });
        } catch (error: any) {
            console.error('Tokenize error:', error);
            res.status(500).json({ error: error.message });
        }
    };

    /**
     * POST /detokenize
     * Body: { token }
     */
    detokenize = async (req: Request, res: Response) => {
        try {
            const { token } = req.body;

            if (!token) {
                return res.status(400).json({ error: 'Token required' });
            }

            const pan = await this.vault.detokenize(token);

            if (!pan) {
                return res.status(404).json({ error: 'Token not found or expired' });
            }

            // Mask PAN for response (only return last 4)
            const maskedPan = `******${pan.slice(-4)}`;

            res.json({ pan: maskedPan, fullPan: pan });
        } catch (error: any) {
            console.error('Detokenize error:', error);
            res.status(500).json({ error: error.message });
        }
    };

    /**
     * POST /token/refresh
     * Body: { token, ttl? }
     */
    refreshToken = async (req: Request, res: Response) => {
        try {
            const { token, ttl = 3600 } = req.body;

            if (!token) {
                return res.status(400).json({ error: 'Token required' });
            }

            const metadata = await this.vault.refreshToken(token, ttl);

            if (!metadata) {
                return res.status(404).json({ error: 'Token not found' });
            }

            res.json({
                token: metadata.token,
                expiresAt: metadata.expiresAt
            });
        } catch (error: any) {
            console.error('Refresh error:', error);
            res.status(500).json({ error: error.message });
        }
    };

    /**
     * GET /token/:token/info
     */
    getTokenInfo = async (req: Request, res: Response) => {
        try {
            const { token } = req.params;

            const metadata = await this.vault.getTokenMetadata(token);

            if (!metadata) {
                return res.status(404).json({ error: 'Token not found' });
            }

            res.json({
                token: metadata.token,
                expiresAt: metadata.expiresAt,
                usageCount: metadata.usageCount,
                maxUsages: metadata.maxUsages,
                createdAt: metadata.createdAt
            });
        } catch (error: any) {
            console.error('Get info error:', error);
            res.status(500).json({ error: error.message });
        }
    };
}
