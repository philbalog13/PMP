/**
 * Fraud Detection Service Unit Tests
 * Tests for velocity rules, amount limits, country checks, and scoring engine
 */

import { describe, it, expect, beforeEach } from '@jest/globals';

// Types
interface Transaction {
    id: string;
    pan: string;
    amount: number;
    currency: string;
    merchantId: string;
    countryCode: string;
    timestamp: Date;
    mcc: string; // Merchant Category Code
}

interface FraudScore {
    score: number; // 0-100, higher = more fraudulent
    reasons: string[];
    action: 'APPROVE' | 'REVIEW' | 'DECLINE';
}

// Mock Fraud Detection Service
class FraudDetectionService {
    private transactionHistory: Map<string, Transaction[]> = new Map();
    private blockedCountries: Set<string> = new Set(['XX', 'YY']);
    private highRiskMCCs: Set<string> = new Set(['7995', '5816', '5967']); // Gambling, games, direct marketing

    // Velocity Check: Max transactions per time window
    checkVelocity(pan: string, windowMinutes: number, maxCount: number): { passed: boolean; count: number } {
        const history = this.transactionHistory.get(pan) || [];
        const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000);
        const recentTxns = history.filter(t => t.timestamp >= windowStart);
        return {
            passed: recentTxns.length < maxCount,
            count: recentTxns.length
        };
    }

    // Amount Limit Check
    checkAmountLimit(amount: number, currency: string): { passed: boolean; limit: number } {
        const limits: Record<string, number> = {
            'EUR': 5000,
            'USD': 5500,
            'GBP': 4500
        };
        const limit = limits[currency] || 3000;
        return {
            passed: amount <= limit,
            limit
        };
    }

    // Country Check
    checkCountry(countryCode: string): { passed: boolean; isBlocked: boolean } {
        const isBlocked = this.blockedCountries.has(countryCode);
        return {
            passed: !isBlocked,
            isBlocked
        };
    }

    // MCC Risk Check
    checkMCC(mcc: string): { isHighRisk: boolean; riskScore: number } {
        const isHighRisk = this.highRiskMCCs.has(mcc);
        return {
            isHighRisk,
            riskScore: isHighRisk ? 30 : 0
        };
    }

    // Unusual Hours Check (midnight to 5am)
    checkUnusualHours(timestamp: Date): { isUnusual: boolean; riskScore: number } {
        const hour = timestamp.getHours();
        const isUnusual = hour >= 0 && hour < 5;
        return {
            isUnusual,
            riskScore: isUnusual ? 15 : 0
        };
    }

    // Round Amount Detection (exact amounts like $100, $500)
    checkRoundAmount(amount: number): { isRound: boolean; riskScore: number } {
        const isRound = amount % 100 === 0 && amount >= 100;
        return {
            isRound,
            riskScore: isRound ? 10 : 0
        };
    }

    // Add transaction to history
    recordTransaction(txn: Transaction): void {
        const history = this.transactionHistory.get(txn.pan) || [];
        history.push(txn);
        this.transactionHistory.set(txn.pan, history);
    }

    // Main Scoring Engine
    calculateFraudScore(txn: Transaction): FraudScore {
        const reasons: string[] = [];
        let score = 0;

        // Velocity check (max 5 txns in 10 mins)
        const velocity = this.checkVelocity(txn.pan, 10, 5);
        if (!velocity.passed) {
            score += 40;
            reasons.push(`Velocity exceeded: ${velocity.count} transactions in 10 minutes`);
        }

        // Amount check
        const amountCheck = this.checkAmountLimit(txn.amount, txn.currency);
        if (!amountCheck.passed) {
            score += 25;
            reasons.push(`Amount ${txn.amount} exceeds limit ${amountCheck.limit} ${txn.currency}`);
        }

        // Country check
        const countryCheck = this.checkCountry(txn.countryCode);
        if (!countryCheck.passed) {
            score += 50;
            reasons.push(`Blocked country: ${txn.countryCode}`);
        }

        // MCC check
        const mccCheck = this.checkMCC(txn.mcc);
        if (mccCheck.isHighRisk) {
            score += mccCheck.riskScore;
            reasons.push(`High-risk MCC: ${txn.mcc}`);
        }

        // Unusual hours
        const hoursCheck = this.checkUnusualHours(txn.timestamp);
        if (hoursCheck.isUnusual) {
            score += hoursCheck.riskScore;
            reasons.push('Transaction during unusual hours (00:00-05:00)');
        }

        // Round amount
        const roundCheck = this.checkRoundAmount(txn.amount);
        if (roundCheck.isRound) {
            score += roundCheck.riskScore;
            reasons.push(`Suspiciously round amount: ${txn.amount}`);
        }

        // Record transaction
        this.recordTransaction(txn);

        // Determine action
        let action: 'APPROVE' | 'REVIEW' | 'DECLINE';
        if (score >= 50) {
            action = 'DECLINE';
        } else if (score >= 25) {
            action = 'REVIEW';
        } else {
            action = 'APPROVE';
        }

        return { score: Math.min(score, 100), reasons, action };
    }

    // Clear history (for testing)
    clearHistory(): void {
        this.transactionHistory.clear();
    }
}

// Test Suites
describe('FraudDetectionService', () => {
    let fraudService: FraudDetectionService;

    beforeEach(() => {
        fraudService = new FraudDetectionService();
    });

    describe('Velocity Rules', () => {
        it('should pass when under velocity limit', () => {
            const result = fraudService.checkVelocity('4111111111111111', 10, 5);
            expect(result.passed).toBe(true);
            expect(result.count).toBe(0);
        });

        it('should fail when velocity exceeded', () => {
            const pan = '4111111111111111';
            // Add 5 transactions
            for (let i = 0; i < 5; i++) {
                fraudService.recordTransaction({
                    id: `txn-${i}`,
                    pan,
                    amount: 100,
                    currency: 'EUR',
                    merchantId: 'MERCHANT001',
                    countryCode: 'FR',
                    timestamp: new Date(),
                    mcc: '5411'
                });
            }
            const result = fraudService.checkVelocity(pan, 10, 5);
            expect(result.passed).toBe(false);
            expect(result.count).toBe(5);
        });

        it('should not count old transactions', () => {
            const pan = '4111111111111111';
            // Add old transaction (20 minutes ago)
            fraudService.recordTransaction({
                id: 'old-txn',
                pan,
                amount: 100,
                currency: 'EUR',
                merchantId: 'MERCHANT001',
                countryCode: 'FR',
                timestamp: new Date(Date.now() - 20 * 60 * 1000),
                mcc: '5411'
            });
            const result = fraudService.checkVelocity(pan, 10, 5);
            expect(result.passed).toBe(true);
            expect(result.count).toBe(0);
        });
    });

    describe('Amount Limits', () => {
        it('should pass for amounts under limit', () => {
            const result = fraudService.checkAmountLimit(1000, 'EUR');
            expect(result.passed).toBe(true);
        });

        it('should fail for amounts over limit', () => {
            const result = fraudService.checkAmountLimit(6000, 'EUR');
            expect(result.passed).toBe(false);
            expect(result.limit).toBe(5000);
        });

        it('should apply different limits per currency', () => {
            const eurResult = fraudService.checkAmountLimit(5000, 'EUR');
            const usdResult = fraudService.checkAmountLimit(5000, 'USD');
            expect(eurResult.passed).toBe(true);
            expect(usdResult.passed).toBe(true);

            const gbpResult = fraudService.checkAmountLimit(5000, 'GBP');
            expect(gbpResult.passed).toBe(false);
        });

        it('should apply default limit for unknown currency', () => {
            const result = fraudService.checkAmountLimit(4000, 'XYZ');
            expect(result.passed).toBe(false);
            expect(result.limit).toBe(3000);
        });
    });

    describe('Country Checks', () => {
        it('should pass for allowed countries', () => {
            expect(fraudService.checkCountry('FR').passed).toBe(true);
            expect(fraudService.checkCountry('US').passed).toBe(true);
            expect(fraudService.checkCountry('DE').passed).toBe(true);
        });

        it('should block restricted countries', () => {
            expect(fraudService.checkCountry('XX').passed).toBe(false);
            expect(fraudService.checkCountry('YY').passed).toBe(false);
        });
    });

    describe('MCC Risk Assessment', () => {
        it('should flag high-risk MCCs', () => {
            expect(fraudService.checkMCC('7995').isHighRisk).toBe(true); // Gambling
            expect(fraudService.checkMCC('5816').isHighRisk).toBe(true); // Games
        });

        it('should not flag normal MCCs', () => {
            expect(fraudService.checkMCC('5411').isHighRisk).toBe(false); // Grocery
            expect(fraudService.checkMCC('5812').isHighRisk).toBe(false); // Restaurants
        });

        it('should assign risk score to high-risk MCCs', () => {
            expect(fraudService.checkMCC('7995').riskScore).toBe(30);
            expect(fraudService.checkMCC('5411').riskScore).toBe(0);
        });
    });

    describe('Unusual Hours Detection', () => {
        it('should flag transactions between 00:00-05:00', () => {
            const midnight = new Date();
            midnight.setHours(2, 0, 0, 0);
            expect(fraudService.checkUnusualHours(midnight).isUnusual).toBe(true);
        });

        it('should not flag daytime transactions', () => {
            const afternoon = new Date();
            afternoon.setHours(14, 0, 0, 0);
            expect(fraudService.checkUnusualHours(afternoon).isUnusual).toBe(false);
        });
    });

    describe('Round Amount Detection', () => {
        it('should flag round amounts >= 100', () => {
            expect(fraudService.checkRoundAmount(100).isRound).toBe(true);
            expect(fraudService.checkRoundAmount(500).isRound).toBe(true);
            expect(fraudService.checkRoundAmount(1000).isRound).toBe(true);
        });

        it('should not flag non-round amounts', () => {
            expect(fraudService.checkRoundAmount(99.99).isRound).toBe(false);
            expect(fraudService.checkRoundAmount(123.45).isRound).toBe(false);
        });

        it('should not flag small round amounts', () => {
            expect(fraudService.checkRoundAmount(50).isRound).toBe(false);
        });
    });

    describe('Scoring Engine', () => {
        it('should APPROVE low-risk transactions', () => {
            const result = fraudService.calculateFraudScore({
                id: 'txn-1',
                pan: '4111111111111111',
                amount: 50.00,
                currency: 'EUR',
                merchantId: 'GROCERY001',
                countryCode: 'FR',
                timestamp: new Date(new Date().setHours(14)),
                mcc: '5411'
            });
            expect(result.action).toBe('APPROVE');
            expect(result.score).toBeLessThan(25);
        });

        it('should DECLINE high-risk transactions', () => {
            const result = fraudService.calculateFraudScore({
                id: 'txn-2',
                pan: '4111111111111111',
                amount: 6000,
                currency: 'EUR',
                merchantId: 'GAMBLING001',
                countryCode: 'XX', // Blocked country
                timestamp: new Date(new Date().setHours(2)),
                mcc: '7995'
            });
            expect(result.action).toBe('DECLINE');
            expect(result.score).toBeGreaterThanOrEqual(50);
            expect(result.reasons.length).toBeGreaterThan(0);
        });

        it('should REVIEW medium-risk transactions', () => {
            const result = fraudService.calculateFraudScore({
                id: 'txn-3',
                pan: '4111111111111111',
                amount: 500, // Round amount
                currency: 'EUR',
                merchantId: 'GAMING001',
                countryCode: 'FR',
                timestamp: new Date(new Date().setHours(2)), // Unusual hours
                mcc: '5411'
            });
            expect(result.action).toBe('REVIEW');
            expect(result.score).toBeGreaterThanOrEqual(25);
            expect(result.score).toBeLessThan(50);
        });

        it('should accumulate reasons for multiple risk factors', () => {
            const result = fraudService.calculateFraudScore({
                id: 'txn-4',
                pan: '4111111111111111',
                amount: 1000,
                currency: 'EUR',
                merchantId: 'CASINO001',
                countryCode: 'FR',
                timestamp: new Date(new Date().setHours(3)),
                mcc: '7995'
            });
            expect(result.reasons).toContain('High-risk MCC: 7995');
            expect(result.reasons).toContain('Transaction during unusual hours (00:00-05:00)');
            expect(result.reasons).toContain('Suspiciously round amount: 1000');
        });
    });
});
