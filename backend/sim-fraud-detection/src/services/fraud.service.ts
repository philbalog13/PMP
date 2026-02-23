import { config } from '../config';

export interface FraudCheckRequest {
    pan: string;
    amount: number;
    merchantId: string;
    mcc: string;
    country?: string;
    ip?: string;
}

export interface FraudCheckResult {
    riskScore: number;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    flagged: boolean;
    reasons: string[];
    recommendation: 'APPROVE' | 'REVIEW' | 'DECLINE';
}

export interface FraudAlert {
    id: string;
    pan: string;
    reason: string;
    riskScore: number;
    timestamp: Date;
    resolved: boolean;
}

export interface RuntimeFraudConfig {
    failMode: 'open' | 'closed';
    fallbackDecision: 'APPROVE' | 'REVIEW' | 'DECLINE';
    simulateFailure: boolean;
}

// In-memory transaction history for velocity checks
const transactionHistory: Map<string, Date[]> = new Map();
const fraudAlerts: FraudAlert[] = [];
const runtimeConfig: RuntimeFraudConfig = {
    failMode: 'open',
    fallbackDecision: 'APPROVE',
    simulateFailure: false
};

/**
 * Check transaction for fraud indicators
 */
export const checkFraud = (request: FraudCheckRequest): FraudCheckResult => {
    if (runtimeConfig.simulateFailure) {
        const failOpenRecommendation = runtimeConfig.failMode === 'open'
            ? runtimeConfig.fallbackDecision
            : 'DECLINE';

        return {
            riskScore: runtimeConfig.failMode === 'open' ? 0 : 100,
            riskLevel: runtimeConfig.failMode === 'open' ? 'LOW' : 'CRITICAL',
            flagged: runtimeConfig.failMode !== 'open',
            reasons: [
                'Fraud engine degraded',
                `Fail mode: ${runtimeConfig.failMode}`,
                `Fallback decision: ${failOpenRecommendation}`
            ],
            recommendation: failOpenRecommendation
        };
    }

    const reasons: string[] = [];
    let score = 0;

    const maskedPan = request.pan.substring(0, 4) + '****';
    console.log(`[FRAUD] Checking transaction for ${maskedPan}, amount: ${request.amount}`);

    // Rule 1: Velocity check - too many transactions in short time
    const history = transactionHistory.get(request.pan) || [];
    const recentTxns = history.filter(d => Date.now() - d.getTime() < config.rules.velocityWindow * 1000);

    if (recentTxns.length >= config.rules.maxTransactionsPerHour) {
        score += 35;
        reasons.push(`Velocity: ${recentTxns.length + 1} transactions in last hour (max: ${config.rules.maxTransactionsPerHour})`);
    } else if (recentTxns.length >= config.rules.maxTransactionsPerHour - 2) {
        score += 15;
        reasons.push(`Near velocity limit: ${recentTxns.length + 1} transactions`);
    }

    // Rule 2: High amount
    if (request.amount >= config.rules.highAmountThreshold) {
        score += 25;
        reasons.push(`High amount: €${request.amount} (threshold: €${config.rules.highAmountThreshold})`);
    } else if (request.amount >= config.rules.highAmountThreshold * 0.7) {
        score += 10;
        reasons.push(`Elevated amount: €${request.amount}`);
    }

    // Rule 3: Suspicious MCC (gambling, betting, etc.)
    if (config.rules.suspiciousMccs.includes(request.mcc)) {
        score += 30;
        reasons.push(`Suspicious merchant category: ${request.mcc}`);
    }

    // Rule 4: Blocked country
    if (request.country && config.rules.blockedCountries.includes(request.country)) {
        score += 50;
        reasons.push(`Blocked country: ${request.country}`);
    }

    // Rule 5: First transaction (new card behavior)
    if (history.length === 0 && request.amount > 200) {
        score += 15;
        reasons.push('First transaction with high amount');
    }

    // Update transaction history
    history.push(new Date());
    transactionHistory.set(request.pan, history.slice(-20)); // Keep last 20 only

    // Determine risk level
    const riskLevel = score >= config.riskThresholds.critical ? 'CRITICAL' :
        score >= config.riskThresholds.high ? 'HIGH' :
            score >= config.riskThresholds.medium ? 'MEDIUM' : 'LOW';

    const flagged = score >= config.riskThresholds.high;

    const recommendation = score >= config.riskThresholds.high ? 'DECLINE' :
        score >= config.riskThresholds.medium ? 'REVIEW' : 'APPROVE';

    // Create alert if flagged
    if (flagged) {
        const alert: FraudAlert = {
            id: `ALERT-${Date.now()}`,
            pan: maskedPan,
            reason: reasons.join('; '),
            riskScore: score,
            timestamp: new Date(),
            resolved: false
        };
        fraudAlerts.push(alert);
        console.log(`[FRAUD] Alert created: ${alert.id}`);
    }

    console.log(`[FRAUD] Result: score=${score}, level=${riskLevel}, recommendation=${recommendation}`);

    return {
        riskScore: Math.min(score, 100),
        riskLevel,
        flagged,
        reasons,
        recommendation
    };
};

/**
 * Get all fraud alerts
 */
export const getAlerts = (unresolvedOnly: boolean = false): FraudAlert[] => {
    if (unresolvedOnly) {
        return fraudAlerts.filter(a => !a.resolved);
    }
    return [...fraudAlerts].reverse().slice(0, 50);
};

/**
 * Resolve an alert
 */
export const resolveAlert = (alertId: string): boolean => {
    const alert = fraudAlerts.find(a => a.id === alertId);
    if (alert) {
        alert.resolved = true;
        return true;
    }
    return false;
};

/**
 * Get statistics
 */
export const getStats = (): { totalChecks: number; totalAlerts: number; unresolvedAlerts: number } => {
    const totalChecks = Array.from(transactionHistory.values()).reduce((sum, h) => sum + h.length, 0);
    return {
        totalChecks,
        totalAlerts: fraudAlerts.length,
        unresolvedAlerts: fraudAlerts.filter(a => !a.resolved).length
    };
};

export const getRuntimeConfig = (): RuntimeFraudConfig => ({ ...runtimeConfig });

export const updateRuntimeConfig = (updates: Partial<RuntimeFraudConfig>): RuntimeFraudConfig => {
    if (updates.failMode) {
        runtimeConfig.failMode = updates.failMode;
    }
    if (updates.fallbackDecision) {
        runtimeConfig.fallbackDecision = updates.fallbackDecision;
    }
    if (typeof updates.simulateFailure === 'boolean') {
        runtimeConfig.simulateFailure = updates.simulateFailure;
    }

    return { ...runtimeConfig };
};

export const resetRuntimeState = (): void => {
    transactionHistory.clear();
    fraudAlerts.length = 0;
    runtimeConfig.simulateFailure = false;
};
