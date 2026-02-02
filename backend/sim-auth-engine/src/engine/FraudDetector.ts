/**
 * Fraud Detector
 * AI-powered fraud detection with pattern analysis
 * Conformant to Phase 5 Step 5.3: Détection fraude IA
 */

import { AuthorizationContext } from '../models';

export interface FraudIndicator {
    name: string;
    score: number;        // 0-1 (probability)
    reason: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface FraudAnalysis {
    fraudScore: number;   // 0-1 (higher = more likely fraud)
    isFraudulent: boolean;
    confidence: number;   // 0-1 (model confidence)
    indicators: FraudIndicator[];
    modelVersion: string;
    analysisTime: number; // milliseconds
    _educational: {
        explanation: string;
        factors: string[];
    };
}

export class FraudDetector {
    private readonly MODEL_VERSION = 'FD-SIM-v2.0';
    private readonly FRAUD_THRESHOLD = 0.7;

    /**
     * Analyze transaction for fraud (Step 5.3)
     * Uses rule-based simulation of ML/AI fraud detection
     */
    async analyze(context: AuthorizationContext): Promise<FraudAnalysis> {
        const startTime = Date.now();
        console.log(`[FRAUD AI] Analyzing transaction for fraud patterns...`);

        const indicators = this.detectIndicators(context);
        const fraudScore = this.calculateFraudScore(indicators);
        const confidence = this.calculateConfidence(indicators);

        const analysis: FraudAnalysis = {
            fraudScore,
            isFraudulent: fraudScore >= this.FRAUD_THRESHOLD,
            confidence,
            indicators,
            modelVersion: this.MODEL_VERSION,
            analysisTime: Date.now() - startTime,
            _educational: {
                explanation: this.generateExplanation(fraudScore, indicators),
                factors: indicators.map(i => `${i.name}: ${(i.score * 100).toFixed(0)}%`)
            }
        };

        console.log(`[FRAUD AI] Score: ${(fraudScore * 100).toFixed(1)}% (${analysis.isFraudulent ? 'FRAUD' : 'LEGIT'})`);
        return analysis;
    }

    private detectIndicators(context: AuthorizationContext): FraudIndicator[] {
        const indicators: FraudIndicator[] = [];

        // 1. Card-Not-Present without 3DS
        if (context.transaction.isEcommerce && !context.transaction.threeDsAuthenticated) {
            indicators.push({
                name: 'CNP_NO_3DS',
                score: 0.4,
                reason: 'E-commerce transaction without 3D-Secure',
                severity: 'MEDIUM'
            });
        }

        // 2. First-time high-value transaction
        if (context.history.recentTransactions.length < 3 && context.transaction.amount > 500) {
            indicators.push({
                name: 'NEW_CARD_HIGH_VALUE',
                score: 0.35,
                reason: 'High value on card with little history',
                severity: 'MEDIUM'
            });
        }

        // 3. Velocity anomaly
        const recentCount = this.countRecentTransactions(context, 3600000); // 1 hour
        if (recentCount > 5) {
            indicators.push({
                name: 'VELOCITY_SPIKE',
                score: Math.min(recentCount * 0.1, 0.8),
                reason: `${recentCount} transactions in last hour`,
                severity: 'HIGH'
            });
        }

        // 4. Amount pattern (testing card)
        if (this.detectTestingPattern(context)) {
            indicators.push({
                name: 'TESTING_PATTERN',
                score: 0.9,
                reason: 'Small test transactions followed by large one',
                severity: 'HIGH'
            });
        }

        // 5. Geographic anomaly
        if (this.detectGeoAnomaly(context)) {
            indicators.push({
                name: 'GEO_ANOMALY',
                score: 0.6,
                reason: 'Transaction location inconsistent with pattern',
                severity: 'HIGH'
            });
        }

        // 6. Time anomaly
        const hour = new Date().getHours();
        if (hour >= 2 && hour <= 5) {
            indicators.push({
                name: 'UNUSUAL_TIME',
                score: 0.25,
                reason: 'Transaction during unusual hours (2-5 AM)',
                severity: 'LOW'
            });
        }

        // 7. Known fraud merchant
        if (this.isHighRiskMerchant(context.transaction.merchantId)) {
            indicators.push({
                name: 'HIGH_RISK_MERCHANT',
                score: 0.5,
                reason: 'Merchant in high-risk category',
                severity: 'MEDIUM'
            });
        }

        // 8. Round amount indicator
        if (context.transaction.amount % 100 === 0 && context.transaction.amount >= 500) {
            indicators.push({
                name: 'ROUND_AMOUNT',
                score: 0.15,
                reason: 'Suspiciously round amount',
                severity: 'LOW'
            });
        }

        return indicators;
    }

    private countRecentTransactions(context: AuthorizationContext, periodMs: number): number {
        const cutoff = Date.now() - periodMs;
        return context.history.recentTransactions.filter(txn =>
            new Date(txn.timestamp).getTime() > cutoff
        ).length;
    }

    private detectTestingPattern(context: AuthorizationContext): boolean {
        if (context.history.recentTransactions.length < 2) return false;

        const recent = context.history.recentTransactions.slice(-3);
        const smallTxns = recent.filter((t: any) => t.amount < 5);

        // Pattern: 2+ small transactions followed by large one
        return smallTxns.length >= 2 && context.transaction.amount > 200;
    }

    private detectGeoAnomaly(context: AuthorizationContext): boolean {
        if (context.history.recentTransactions.length === 0 || !context.transaction.location) {
            return false;
        }

        // Check if current country differs from recent transactions
        const currentCountry = context.transaction.location.country;
        const recentCountries = context.history.recentTransactions
            .slice(-5)
            .map(t => t.location?.split(', ')[1])
            .filter(Boolean);

        if (recentCountries.length === 0) return false;

        return !recentCountries.includes(currentCountry);
    }

    private isHighRiskMerchant(merchantId: string): boolean {
        // Simulated high-risk merchant list
        const highRiskPrefixes = ['HR_', 'CRYPTO_', 'GAMBL_', 'ADULT_'];
        return highRiskPrefixes.some(prefix => merchantId.startsWith(prefix));
    }

    private calculateFraudScore(indicators: FraudIndicator[]): number {
        if (indicators.length === 0) return 0;

        // Combine indicators with diminishing returns
        let combinedScore = 0;
        const sortedIndicators = [...indicators].sort((a, b) => b.score - a.score);

        for (let i = 0; i < sortedIndicators.length; i++) {
            const weight = 1 / (i + 1); // Diminishing weight
            combinedScore += sortedIndicators[i].score * weight;
        }

        // Normalize to 0-1
        const maxPossible = sortedIndicators.reduce((sum, _, i) => sum + 1 / (i + 1), 0);
        return Math.min(combinedScore / maxPossible, 1);
    }

    private calculateConfidence(indicators: FraudIndicator[]): number {
        if (indicators.length === 0) return 0.95; // High confidence no fraud
        if (indicators.length >= 3) return 0.85; // High confidence with multiple indicators
        return 0.7; // Medium confidence
    }

    private generateExplanation(score: number, indicators: FraudIndicator[]): string {
        if (score < 0.3) {
            return 'Transaction appears legitimate with no significant risk indicators.';
        }
        if (score < 0.7) {
            return `Moderate risk detected: ${indicators.length} indicator(s) triggered. Consider additional verification.`;
        }
        return `High fraud probability: ${indicators.length} risk indicator(s) detected. Manual review recommended.`;
    }
}

// Export singleton
export const fraudDetector = new FraudDetector();
