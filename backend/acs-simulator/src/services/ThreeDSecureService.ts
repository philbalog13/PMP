/**
 * 3D-Secure Service Layer
 * Core business logic for 3DS authentication
 */

export interface ThreeDSRequest {
    pan: string;
    amount: number;
    currency: string;
    merchantId: string;
    transactionId: string;
    returnUrl?: string;
    cardholderName?: string;
    billingAddress?: Address;
}

export interface Address {
    street: string;
    city: string;
    country: string;
    postalCode: string;
}

export interface ThreeDSResult {
    transStatus: 'Y' | 'N' | 'U' | 'A' | 'C' | 'R';
    authenticationValue?: string;
    eci?: string;
    acsTransId?: string;
    challengeUrl?: string;
    riskScore: number;
    protocolVersion: string;
}

export class ThreeDSecureService {
    private readonly HIGH_RISK_THRESHOLD = 50;
    private readonly VERY_HIGH_RISK_THRESHOLD = 80;
    private readonly challengeBaseUrl = (process.env.THREEDS_CHALLENGE_URL || 'http://localhost:3088').replace(/\/$/, '');

    /**
     * Perform risk-based authentication (RBA)
     * EDUCATIONAL TIP: This is the "Frictionless" entry point. 
     * The Directory Server (DS) asks the ACS if the transaction is risky.
     */
    async authenticate(request: ThreeDSRequest): Promise<ThreeDSResult> {
        console.log(`\n[3DS-ACS] 🛡️ Incoming Authentication Request (AReq)`);
        console.log(`[3DS-ACS] Transaction ID: ${request.transactionId}`);
        console.log(`[3DS-ACS] Amount: ${request.amount} ${request.currency}`);

        const riskScore = this.calculateRiskScore(request);
        const protocolVersion = this.determineProtocolVersion(request);

        // PEDAGOGICAL SCENARIOS
        if (request.cardholderName?.toUpperCase() === 'SUCCESS') {
            console.log(`[3DS-ACS] ✅ Scenario FORCE_SUCCESS detected.`);
            return {
                transStatus: 'Y',
                authenticationValue: this.generateAuthValue(),
                eci: '05',
                riskScore: 0,
                protocolVersion
            };
        }

        if (request.cardholderName?.toUpperCase() === 'FAILURE') {
            console.log(`[3DS-ACS] ❌ Scenario FORCE_FAILURE detected.`);
            return {
                transStatus: 'N',
                riskScore: 95,
                protocolVersion
            };
        }

        // Frictionless flow (low risk)
        if (riskScore < this.HIGH_RISK_THRESHOLD) {
            console.log(`[3DS-ACS] ✌️ Low Risk (${riskScore}). Proceeding with Frictionless Flow (transStatus: Y).`);
            return {
                transStatus: 'Y',
                authenticationValue: this.generateAuthValue(),
                eci: '05',
                riskScore,
                protocolVersion
            };
        }

        // Challenge required
        console.log(`[3DS-ACS] ⚠️ Medium/High Risk (${riskScore}). Challenge Required (transStatus: C).`);
        const acsTransId = `ACS_${Date.now()}`;
        return {
            transStatus: 'C',
            challengeUrl: this.buildChallengeUrl(request.transactionId, acsTransId, request.returnUrl),
            acsTransId,
            riskScore,
            protocolVersion
        };
    }

    /**
     * Calculate transaction risk score
     * EDUCATIONAL TIP: Banks use IP address, device fingerprinting, and history to calculate this.
     */
    private calculateRiskScore(request: ThreeDSRequest): number {
        let score = 0;

        // Amount-based risk
        if (request.amount > 500) score += 40;
        else if (request.amount > 100) score += 20;

        // Name-based simulation
        if (request.cardholderName?.includes('TEST')) score += 10;

        // Random factor to simulate reality
        score += Math.floor(Math.random() * 20);

        return Math.min(score, 100);
    }

    private determineProtocolVersion(request: ThreeDSRequest): string {
        return '2.2.0';
    }

    private generateAuthValue(): string {
        return Buffer.from(`AAV_EDU_${Date.now()}`).toString('base64').substring(0, 28);
    }

    private buildChallengeUrl(transactionId: string, acsTransId: string, returnUrl?: string): string {
        const challengeUrl = new URL(this.challengeBaseUrl);
        challengeUrl.searchParams.set('txId', transactionId);
        challengeUrl.searchParams.set('acsTransId', acsTransId);
        if (returnUrl) {
            challengeUrl.searchParams.set('returnUrl', returnUrl);
        }
        return challengeUrl.toString();
    }

    /**
     * Verify OTP for challenge flow
     * EDUCATIONAL TIP: The CReq (Challenge Request) carries the OTP. 
     * The ACS verifies it and returns a CRes (Challenge Response).
     */
    async verifyChallenge(acsTransId: string, otp: string): Promise<ThreeDSResult> {
        console.log(`\n[3DS-ACS] 🔑 Received Challenge Verification (CReq)`);
        console.log(`[3DS-ACS] ACS Trans ID: ${acsTransId}`);
        console.log(`[3DS-ACS] OTP provided: ${otp}`);

        // Simplified Pedagogical OTP verification
        // Code 123456 is ALWAYS valid in this lab
        const isValid = otp === '123456';

        if (isValid) {
            console.log(`[3DS-ACS] ✅ OTP Verified. Returning transStatus: Y`);
            return {
                transStatus: 'Y',
                authenticationValue: this.generateAuthValue(),
                eci: '05',
                riskScore: 30,
                protocolVersion: '2.2.0'
            };
        }

        console.log(`[3DS-ACS] ❌ Invalid OTP. Returning transStatus: N`);
        return {
            transStatus: 'N',
            riskScore: 100,
            protocolVersion: '2.2.0'
        };
    }
}
