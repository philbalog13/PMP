/**
 * Crypto Service
 * Cryptographic operations for authorization responses
 * Conformant to Phase 5 Step 5.6: Signature cryptographique
 */

import axios from 'axios';
import * as crypto from 'crypto';

export interface SignedResponse {
    data: unknown;
    signature: string;
    signatureAlgorithm: string;
    keyId: string;
    timestamp: Date;
    _educational: {
        signatureProcess: string[];
        securityLevel: string;
    };
}

export class CryptoService {
    private readonly HSM_URL: string;
    private readonly LOCAL_KEY: string;

    constructor(hsmUrl: string = 'http://localhost:8009') {
        this.HSM_URL = hsmUrl;
        // Fallback local key for simulation when HSM unavailable
        this.LOCAL_KEY = crypto.randomBytes(32).toString('hex');
    }

    /**
     * Sign authorization response (Step 5.6)
     * Attempts HSM first, falls back to local signing
     */
    async sign(response: unknown): Promise<SignedResponse> {
        console.log(`[CRYPTO] Signing authorization response...`);
        const steps: string[] = [];

        try {
            // Try HSM signing first
            steps.push('1. Connecting to HSM...');
            const hsmResult = await this.signWithHSM(response);
            steps.push('2. HSM signing successful');
            steps.push('3. MAC generated with bank key');

            return {
                data: response,
                signature: hsmResult.signature,
                signatureAlgorithm: 'HMAC-SHA256',
                keyId: hsmResult.keyId,
                timestamp: new Date(),
                _educational: {
                    signatureProcess: steps,
                    securityLevel: 'PRODUCTION (HSM)'
                }
            };
        } catch (error) {
            console.log(`[CRYPTO] HSM unavailable, using local signing`);
            steps.push('1. HSM unavailable');
            steps.push('2. Using local HMAC signing (simulation)');
            steps.push('3. WARNING: Production should use HSM');

            // Fallback to local signing
            const signature = this.signLocally(response);

            return {
                data: response,
                signature,
                signatureAlgorithm: 'HMAC-SHA256-LOCAL',
                keyId: 'LOCAL_SIM_KEY',
                timestamp: new Date(),
                _educational: {
                    signatureProcess: steps,
                    securityLevel: 'SIMULATION (Local)'
                }
            };
        }
    }

    /**
     * Verify a signed response
     */
    async verify(signedResponse: SignedResponse): Promise<boolean> {
        console.log(`[CRYPTO] Verifying signature...`);

        if (signedResponse.keyId === 'LOCAL_SIM_KEY') {
            // Verify local signature
            const expectedSignature = this.signLocally(signedResponse.data);
            return expectedSignature === signedResponse.signature;
        }

        try {
            // Verify with HSM
            const result = await axios.post(`${this.HSM_URL}/mac/verify`, {
                data: JSON.stringify(signedResponse.data),
                mac: signedResponse.signature,
                keyId: signedResponse.keyId
            }, { timeout: 2000 });

            return result.data.valid === true;
        } catch (error) {
            console.log(`[CRYPTO] HSM verification failed, cannot verify`);
            return false;
        }
    }

    /**
     * Generate ARPC (Authorization Response Cryptogram)
     * Used for chip card response authentication
     */
    async generateARPC(arqc: string, authCode: string): Promise<string> {
        console.log(`[CRYPTO] Generating ARPC...`);

        try {
            const result = await axios.post(`${this.HSM_URL}/arpc/generate`, {
                arqc,
                authorizationCode: authCode,
                keyId: 'IMK_001'  // Issuer Master Key
            }, { timeout: 2000 });

            return result.data.arpc;
        } catch (error) {
            // Simulate ARPC generation
            const combined = arqc + authCode;
            return crypto.createHmac('sha256', this.LOCAL_KEY)
                .update(combined)
                .digest('hex')
                .substring(0, 16)
                .toUpperCase();
        }
    }

    private async signWithHSM(data: unknown): Promise<{ signature: string; keyId: string }> {
        const response = await axios.post(`${this.HSM_URL}/mac/generate`, {
            data: JSON.stringify(data),
            keyId: 'ZAK_001'  // Zone Authentication Key
        }, { timeout: 2000 });

        return {
            signature: response.data.mac || response.data.cryptogram,
            keyId: 'ZAK_001'
        };
    }

    private signLocally(data: unknown): string {
        const dataStr = JSON.stringify(data);
        return crypto.createHmac('sha256', this.LOCAL_KEY)
            .update(dataStr)
            .digest('hex');
    }
}

// Export singleton
export const cryptoService = new CryptoService();
