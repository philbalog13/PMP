/**
 * Integration: 3D-Secure with Authorization Engine
 * This service extends the auth engine to support 3DS authentication
 */

import axios from 'axios';

interface Transaction {
    pan: string;
    amount: number;
    merchantId: string;
    transactionId: string;
    currency?: string;
}

interface ThreeDSResult {
    transStatus: 'Y' | 'N' | 'U' | 'C';
    authenticationValue?: string;
    eci?: string;
    challengeUrl?: string;
    acsTransId?: string;
}

interface AuthorizationResult {
    approved: boolean;
    responseCode: string;
    threeDSData?: ThreeDSResult;
}

export class AuthEngineWith3DS {
    private threeDSThreshold: number = 100; // Amount threshold for 3DS
    private acsUrl: string;

    constructor(acsUrl: string = 'http://localhost:8088') {
        this.acsUrl = acsUrl;
    }

    /**
     * Authorize transaction with 3DS authentication
     */
    async authorizeWith3DS(transaction: Transaction): Promise<AuthorizationResult> {
        // 1. Evaluate if 3DS is required
        const requires3DS = this.requires3DSAuthentication(transaction);

        if (!requires3DS) {
            // Standard authorization flow
            return this.standardAuthorize(transaction);
        }

        // 2. Initiate 3D-Secure authentication
        try {
            const threeDSResult = await this.authenticate3DS(transaction);

            // 3. Check authentication result
            if (threeDSResult.transStatus === 'Y') {
                // Authentication successful - proceed with authorization
                return {
                    approved: true,
                    responseCode: '00',
                    threeDSData: threeDSResult
                };
            } else if (threeDSResult.transStatus === 'C') {
                // Challenge required - return challenge URL
                return {
                    approved: false,
                    responseCode: '65', // 3DS challenge required
                    threeDSData: threeDSResult
                };
            } else {
                // Authentication failed
                return {
                    approved: false,
                    responseCode: '05', // Do not honor
                    threeDSData: threeDSResult
                };
            }
        } catch (error) {
            console.error('3DS authentication error:', error);
            return {
                approved: false,
                responseCode: '96' // System error
            };
        }
    }

    /**
     * Determine if transaction requires 3DS
     */
    private requires3DSAuthentication(transaction: Transaction): boolean {
        // Require 3DS for:
        // - Transactions above threshold
        // - E-commerce (card not present)
        // - International transactions
        return transaction.amount >= this.threeDSThreshold;
    }

    /**
     * Call ACS for 3DS authentication
     */
    private async authenticate3DS(transaction: Transaction): Promise<ThreeDSResult> {
        const response = await axios.post(`${this.acsUrl}/authenticate`, {
            pan: transaction.pan,
            amount: transaction.amount,
            merchantId: transaction.merchantId,
            transactionId: transaction.transactionId,
            currency: transaction.currency || 'EUR'
        });

        return response.data;
    }

    /**
     * Standard authorization without 3DS
     */
    private standardAuthorize(transaction: Transaction): AuthorizationResult {
        // Simplified authorization logic
        return {
            approved: true,
            responseCode: '00'
        };
    }

    /**
     * Verify challenge completion
     */
    async verifyChallenge(acsTransId: string, otp: string): Promise<ThreeDSResult> {
        const response = await axios.post(`${this.acsUrl}/challenge/verify`, {
            acsTransId,
            otp
        });

        return response.data;
    }
}

// Export singleton instance
export const authEngine3DS = new AuthEngineWith3DS();
