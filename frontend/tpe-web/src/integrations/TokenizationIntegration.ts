/**
 * Integration: Tokenization with TPE
 * Tokenize PANs before storage and detokenize for authorization
 */

import axios from 'axios';

export class TokenizationClient {
    private tokenServiceUrl: string;

    constructor(tokenServiceUrl: string = process.env.NEXT_PUBLIC_TOKEN_SERVICE_URL || 'http://localhost:8085') {
        this.tokenServiceUrl = tokenServiceUrl;
    }

    /**
     * Tokenize PAN before storing
     */
    async tokenizePAN(pan: string, ttl: number = 3600, maxUsages: number = 10): Promise<string> {
        try {
            const response = await axios.post(`${this.tokenServiceUrl}/tokenize`, {
                pan,
                ttl,
                maxUsages
            });

            return response.data.token;
        } catch (error) {
            console.error('Tokenization error:', error);
            throw new Error('Failed to tokenize PAN');
        }
    }

    /**
     * Detokenize for authorization
     */
    async detokenizePAN(token: string): Promise<string> {
        try {
            const response = await axios.post(`${this.tokenServiceUrl}/detokenize`, {
                token
            });

            return response.data.fullPan;
        } catch (error) {
            console.error('Detokenization error:', error);
            throw new Error('Failed to detokenize');
        }
    }

    /**
     * Get token metadata
     */
    async getTokenInfo(token: string) {
        try {
            const response = await axios.get(`${this.tokenServiceUrl}/token/${token}/info`);
            return response.data;
        } catch (error) {
            return null;
        }
    }

    /**
     * Refresh token expiry
     */
    async refreshToken(token: string, ttl: number = 3600): Promise<void> {
        await axios.post(`${this.tokenServiceUrl}/token/refresh`, {
            token,
            ttl
        });
    }
}

/**
 * Integration with TPE Web
 */
export class TPEWithTokenization {
    private tokenClient: TokenizationClient;

    constructor() {
        this.tokenClient = new TokenizationClient();
    }

    /**
     * Store card with tokenization
     */
    async storeCard(cardData: { pan: string; expiry: string; cvv: string }): Promise<string> {
        // Tokenize PAN before storage
        const token = await this.tokenClient.tokenizePAN(cardData.pan);

        // Store token (not actual PAN) in database
        console.log(`Storing token: ${token} (PAN not stored)`);

        return token;
    }

    /**
     * Process payment with detokenization
     */
    async processPayment(token: string, amount: number): Promise<{ success: boolean; pan?: string }> {
        try {
            // Detokenize to get actual PAN for authorization
            const pan = await this.tokenClient.detokenizePAN(token);

            console.log(`Processing payment for PAN ending in ${pan.slice(-4)}`);

            // Proceed with authorization using actual PAN
            return { success: true, pan };
        } catch (error) {
            console.error('Payment processing error:', error);
            return { success: false };
        }
    }
}

// Export singleton
export const tpeTokenization = new TPEWithTokenization();
