/**
 * Risk Engine
 * Calculates risk scores based on transaction characteristics
 * Conformant to Phase 5 Step 5.2: Calcul score risque
 */

import { AuthorizationContext } from '../models';

export interface RiskFactors {
    velocityRisk: number;      // 0-100: Too many transactions
    amountRisk: number;        // 0-100: Unusual amount
    locationRisk: number;      // 0-100: High-risk location
    timeRisk: number;          // 0-100: Unusual hour
    merchantRisk: number;      // 0-100: High-risk MCC
    behaviorRisk: number;      // 0-100: Deviation from pattern
}

export interface RiskAssessment {
    overallScore: number;      // 0-100 (higher = more risky)
    factors: RiskFactors;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    recommendations: string[];
    timestamp: Date;
}

// High-risk country codes
const HIGH_RISK_COUNTRIES = ['NK', 'IR', 'SY', 'CU', 'VE', 'MM', 'BY', 'RU'];

// High-risk MCCs (gambling, adult, crypto, money transfer)
const HIGH_RISK_MCCS = ['7995', '5816', '5967', '6051', '6211', '4829'];

export class RiskEngine {
    /**
     * Calculate comprehensive risk score (Step 5.2)
     */
    calculateRisk(context: AuthorizationContext): RiskAssessment {
        console.log(`[RISK ENGINE] Calculating risk score...`);

        const factors = this.calculateFactors(context);
        const overallScore = this.computeOverallScore(factors);
        const riskLevel = this.determineRiskLevel(overallScore);
        const recommendations = this.generateRecommendations(factors, riskLevel);

        const assessment: RiskAssessment = {
            overallScore,
            factors,
            riskLevel,
            recommendations,
            timestamp: new Date()
        };

        console.log(`[RISK ENGINE] Score: ${overallScore} (${riskLevel})`);
        return assessment;
    }

    private calculateFactors(context: AuthorizationContext): RiskFactors {
        return {
            velocityRisk: this.calculateVelocityRisk(context),
            amountRisk: this.calculateAmountRisk(context),
            locationRisk: this.calculateLocationRisk(context),
            timeRisk: this.calculateTimeRisk(context),
            merchantRisk: this.calculateMerchantRisk(context),
            behaviorRisk: this.calculateBehaviorRisk(context)
        };
    }

    /**
     * Velocity Risk: Too many transactions in short period
     */
    private calculateVelocityRisk(context: AuthorizationContext): number {
        const recentTxns = context.history.recentTransactions.filter(txn => {
            const txnTime = new Date(txn.timestamp).getTime();
            const hourAgo = Date.now() - 3600000;
            return txnTime > hourAgo;
        });

        if (recentTxns.length >= 10) return 100;
        if (recentTxns.length >= 5) return 60;
        if (recentTxns.length >= 3) return 30;
        return 0;
    }

    /**
     * Amount Risk: Unusual transaction amount
     */
    private calculateAmountRisk(context: AuthorizationContext): number {
        const amount = context.transaction.amount;
        const balance = context.account.balance;

        // Large percentage of balance
        if (amount > balance * 0.8) return 80;
        if (amount > balance * 0.5) return 40;

        // High absolute amounts
        if (amount > 5000) return 70;
        if (amount > 1000) return 30;

        // Round amounts (potential fraud indicator)
        if (amount % 100 === 0 && amount >= 500) return 20;

        return 0;
    }

    /**
     * Location Risk: High-risk countries
     */
    private calculateLocationRisk(context: AuthorizationContext): number {
        const location = context.transaction.location;
        if (!location) return 10; // No location is slightly suspicious

        if (HIGH_RISK_COUNTRIES.includes(location.country)) {
            return 100;
        }

        // Check for location inconsistency with history
        const lastLocation = this.getLastLocation(context);
        if (lastLocation && lastLocation !== location.country) {
            return 40; // Different country from last transaction
        }

        return 0;
    }

    /**
     * Time Risk: Unusual hours (2-5 AM)
     */
    private calculateTimeRisk(context: AuthorizationContext): number {
        const hour = new Date().getHours();
        if (hour >= 2 && hour <= 5) return 50;
        if (hour >= 0 && hour <= 6) return 25;
        return 0;
    }

    /**
     * Merchant Risk: High-risk merchant categories
     */
    private calculateMerchantRisk(context: AuthorizationContext): number {
        const mcc = context.transaction.mcc;
        if (HIGH_RISK_MCCS.includes(mcc)) {
            return 70;
        }
        return 0;
    }

    /**
     * Behavior Risk: Deviation from normal patterns
     */
    private calculateBehaviorRisk(context: AuthorizationContext): number {
        if (context.history.recentTransactions.length === 0) {
            return 30; // New card, no history
        }

        const avgAmount = context.history.recentTransactions.reduce((sum, txn) => sum + txn.amount, 0) / context.history.recentTransactions.length;
        const currentAmount = context.transaction.amount;

        // Transaction much larger than average
        if (currentAmount > avgAmount * 5) return 70;
        if (currentAmount > avgAmount * 3) return 40;
        if (currentAmount > avgAmount * 2) return 20;

        return 0;
    }

    private getLastLocation(context: AuthorizationContext): string | null {
        if (context.history.recentTransactions.length === 0) return null;
        const lastTxn = context.history.recentTransactions[context.history.recentTransactions.length - 1];
        // Parse location from stored format "City, Country"
        const parts = lastTxn.location?.split(', ');
        return parts?.[1] || null;
    }

    /**
     * Compute weighted overall score
     */
    private computeOverallScore(factors: RiskFactors): number {
        const weights = {
            velocityRisk: 0.15,
            amountRisk: 0.20,
            locationRisk: 0.25,
            timeRisk: 0.10,
            merchantRisk: 0.15,
            behaviorRisk: 0.15
        };

        const score =
            factors.velocityRisk * weights.velocityRisk +
            factors.amountRisk * weights.amountRisk +
            factors.locationRisk * weights.locationRisk +
            factors.timeRisk * weights.timeRisk +
            factors.merchantRisk * weights.merchantRisk +
            factors.behaviorRisk * weights.behaviorRisk;

        return Math.round(score);
    }

    private determineRiskLevel(score: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
        if (score >= 80) return 'CRITICAL';
        if (score >= 60) return 'HIGH';
        if (score >= 30) return 'MEDIUM';
        return 'LOW';
    }

    private generateRecommendations(factors: RiskFactors, level: string): string[] {
        const recommendations: string[] = [];

        if (factors.velocityRisk > 50) {
            recommendations.push('Consider velocity limit enforcement');
        }
        if (factors.locationRisk > 50) {
            recommendations.push('Trigger 3D-Secure for cross-border');
        }
        if (factors.amountRisk > 50) {
            recommendations.push('Request additional authentication');
        }
        if (level === 'CRITICAL') {
            recommendations.push('Manual review recommended');
        }

        return recommendations;
    }
}

// Export singleton
export const riskEngine = new RiskEngine();
