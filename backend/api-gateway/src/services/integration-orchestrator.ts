/**
 * Integration Orchestrator Service
 * Coordinates authorization flow between Auth Engine, 3DS, Fraud Detection, and Crypto
 * 
 * FINED-SIM Pedagogical Platform Integration Layer
 */

import axios, { AxiosInstance } from 'axios';

// Configuration
const CONFIG = {
    authEngine: process.env.AUTH_ENGINE_URL || 'http://sim-auth-engine:8006',
    fraudDetection: process.env.FRAUD_DETECTION_URL || 'http://sim-fraud-detection:8007',
    cryptoService: process.env.CRYPTO_SERVICE_URL || 'http://crypto-service:8010',
    acsSimulator: process.env.ACS_SIMULATOR_URL || 'http://acs-simulator:8013',
    tokenization: process.env.TOKENIZATION_URL || 'http://tokenization-service:8014',

    // Configurable thresholds
    threeDSThreshold: parseInt(process.env.THREE_DS_THRESHOLD || '100'),
    fraudScoreDeclineThreshold: parseInt(process.env.FRAUD_DECLINE_THRESHOLD || '70'),
    threeDSEnabled: process.env.THREE_DS_ENABLED !== 'false',
};

// Interfaces
export interface TransactionRequest {
    pan: string;
    amount: number;
    currency: string;
    merchantId: string;
    terminalId: string;
    transactionId?: string;
    mcc?: string;
    country?: string;
    isEcommerce?: boolean;
    requiresChallenge?: boolean;
}

export interface OrchestratedResult {
    approved: boolean;
    responseCode: string;
    responseMessage: string;
    authCode?: string;

    // Flow details
    fraudCheck?: {
        riskScore: number;
        riskLevel: string;
        recommendation: string;
    };
    threeDSResult?: {
        transStatus: string;
        eci?: string;
        challengeUrl?: string;
    };

    // Processing metadata
    processingTime: number;
    flowSteps: string[];
}

/**
 * Integration Orchestrator
 * Provides unified transaction processing with configurable 3DS and Fraud integration
 */
export class IntegrationOrchestrator {
    private httpClient: AxiosInstance;

    constructor() {
        this.httpClient = axios.create({
            timeout: 10000,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    /**
     * Process transaction through full integration flow
     */
    async processTransaction(request: TransactionRequest): Promise<OrchestratedResult> {
        const startTime = Date.now();
        const flowSteps: string[] = [];
        const txnId = request.transactionId || `TXN_${Date.now()}`;

        console.log(`[ORCHESTRATOR] Processing transaction ${txnId}`);

        try {
            // Step 1: Fraud Check (always runs first)
            flowSteps.push('FRAUD_CHECK_START');
            const fraudResult = await this.checkFraud(request);
            flowSteps.push(`FRAUD_CHECK_COMPLETE: ${fraudResult.riskLevel}`);

            // If fraud score is critical, decline immediately
            if (fraudResult.riskScore >= CONFIG.fraudScoreDeclineThreshold) {
                return {
                    approved: false,
                    responseCode: '57',
                    responseMessage: 'Transaction declined - fraud risk detected',
                    fraudCheck: fraudResult,
                    processingTime: Date.now() - startTime,
                    flowSteps
                };
            }

            // Step 2: 3D-Secure (if enabled and required)
            let threeDSResult: { transStatus: string; eci?: string; challengeUrl?: string } | undefined = undefined;
            if (CONFIG.threeDSEnabled && this.requires3DS(request, fraudResult)) {
                flowSteps.push('3DS_CHECK_START');
                threeDSResult = await this.check3DS(request, txnId);
                flowSteps.push(`3DS_CHECK_COMPLETE: ${threeDSResult.transStatus}`);

                // If challenge required, return challenge info
                if (threeDSResult.transStatus === 'C') {
                    return {
                        approved: false,
                        responseCode: '65',
                        responseMessage: '3D-Secure challenge required',
                        fraudCheck: fraudResult,
                        threeDSResult,
                        processingTime: Date.now() - startTime,
                        flowSteps
                    };
                }

                // If authentication failed
                if (threeDSResult.transStatus === 'N') {
                    return {
                        approved: false,
                        responseCode: '05',
                        responseMessage: '3D-Secure authentication failed',
                        fraudCheck: fraudResult,
                        threeDSResult,
                        processingTime: Date.now() - startTime,
                        flowSteps
                    };
                }
            }

            // Step 3: Authorization via Auth Engine
            flowSteps.push('AUTHORIZATION_START');
            const authResult = await this.authorize(request);
            flowSteps.push(`AUTHORIZATION_COMPLETE: ${authResult.responseCode}`);

            return {
                approved: authResult.approved,
                responseCode: authResult.responseCode,
                responseMessage: authResult.responseMessage,
                authCode: authResult.authCode,
                fraudCheck: fraudResult,
                threeDSResult,
                processingTime: Date.now() - startTime,
                flowSteps
            };

        } catch (error) {
            console.error('[ORCHESTRATOR] Error:', error);
            flowSteps.push(`ERROR: ${error instanceof Error ? error.message : 'Unknown'}`);

            return {
                approved: false,
                responseCode: '96',
                responseMessage: 'System error during processing',
                processingTime: Date.now() - startTime,
                flowSteps
            };
        }
    }

    /**
     * Check fraud score
     */
    private async checkFraud(request: TransactionRequest): Promise<{
        riskScore: number;
        riskLevel: string;
        recommendation: string;
    }> {
        try {
            const response = await this.httpClient.post(`${CONFIG.fraudDetection}/check`, {
                pan: request.pan,
                amount: request.amount,
                merchantId: request.merchantId,
                mcc: request.mcc || '5999',
                country: request.country
            });
            return response.data;
        } catch (error: any) {
            console.log('[ORCHESTRATOR] Fraud service check failed');
            if (error.response) {
                console.error('[ORCHESTRATOR] Fraud Error Data:', JSON.stringify(error.response.data));
                console.error('[ORCHESTRATOR] Fraud Error Status:', error.response.status);
            } else {
                console.error('[ORCHESTRATOR] Fraud Error:', error.message);
            }
            // Fallback: return low risk if fraud service is down (but for 400 we should arguably fail?)
            // For now, let's keep fallback but log loudly.
            return { riskScore: 0, riskLevel: 'LOW', recommendation: 'APPROVE' };
        }
    }

    /**
     * Determine if 3DS is required
     */
    private requires3DS(request: TransactionRequest, fraudResult: { riskScore: number }): boolean {
        // 3DS required if:
        // - E-commerce transaction
        // - Amount above threshold
        // - Medium fraud risk
        return (
            request.isEcommerce === true ||
            request.amount >= CONFIG.threeDSThreshold ||
            fraudResult.riskScore >= 30
        );
    }

    /**
     * Initiate 3DS authentication
     */
    private async check3DS(request: TransactionRequest, txnId: string): Promise<{
        transStatus: string;
        eci?: string;
        challengeUrl?: string;
    }> {
        try {
            const response = await this.httpClient.post(`${CONFIG.acsSimulator}/authenticate`, {
                pan: request.pan,
                amount: request.amount,
                currency: request.currency,
                merchantId: request.merchantId,
                transactionId: txnId
            });
            return response.data;
        } catch (error) {
            console.log('[ORCHESTRATOR] ACS unavailable, returning frictionless approval');
            // Fallback: approve without 3DS if service is down (pedagogical mode)
            return { transStatus: 'Y', eci: '06' };
        }
    }

    /**
     * Authorize transaction via Auth Engine
     */
    private async authorize(request: TransactionRequest): Promise<{
        approved: boolean;
        responseCode: string;
        responseMessage: string;
        authCode?: string;
    }> {
        try {
            const stan = Math.floor(100000 + Math.random() * 900000).toString();
            const safeTerminalId = request.terminalId ? request.terminalId.substring(0, 8) : 'TERM0001';

            const response = await this.httpClient.post(`${CONFIG.authEngine}/authorize`, {
                stan: stan,
                pan: request.pan,
                amount: request.amount,
                currency: request.currency || 'EUR',
                merchantId: request.merchantId,
                terminalId: safeTerminalId,
                mcc: request.mcc || '5999',
                location: {
                    country: request.country || 'FR'
                }
            });
            return response.data;
        } catch (error: any) {
            console.error('[ORCHESTRATOR] Auth engine authorization failed');
            if (error.response) {
                console.error('[ORCHESTRATOR] Auth Error Data:', JSON.stringify(error.response.data));
                console.error('[ORCHESTRATOR] Auth Error Status:', error.response.status);
            } else {
                console.error('[ORCHESTRATOR] Auth Error:', error.message);
            }
            return {
                approved: false,
                responseCode: '96',
                responseMessage: 'Authorization service unavailable'
            };
        }
    }

    /**
     * Verify 3DS challenge completion
     */
    async verifyChallenge(acsTransId: string, otp: string): Promise<OrchestratedResult> {
        const startTime = Date.now();

        try {
            const response = await this.httpClient.post(`${CONFIG.acsSimulator}/challenge/verify`, {
                acsTransId,
                otp
            });

            const result = response.data;

            return {
                approved: result.transStatus === 'Y',
                responseCode: result.transStatus === 'Y' ? '00' : '05',
                responseMessage: result.transStatus === 'Y' ? 'Challenge verified' : 'Challenge failed',
                threeDSResult: result,
                processingTime: Date.now() - startTime,
                flowSteps: ['CHALLENGE_VERIFY']
            };
        } catch (error) {
            return {
                approved: false,
                responseCode: '96',
                responseMessage: 'Challenge verification error',
                processingTime: Date.now() - startTime,
                flowSteps: ['CHALLENGE_VERIFY_ERROR']
            };
        }
    }

    /**
     * Get integration health status
     */
    async getHealth(): Promise<Record<string, boolean>> {
        const services = {
            authEngine: CONFIG.authEngine,
            fraudDetection: CONFIG.fraudDetection,
            acsSimulator: CONFIG.acsSimulator,
            cryptoService: CONFIG.cryptoService
        };

        const health: Record<string, boolean> = {};

        for (const [name, url] of Object.entries(services)) {
            try {
                await this.httpClient.get(`${url}/health`, { timeout: 2000 });
                health[name] = true;
            } catch {
                health[name] = false;
            }
        }

        return health;
    }
}

// Export singleton
export const orchestrator = new IntegrationOrchestrator();
export default orchestrator;
