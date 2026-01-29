/**
 * Authorization Engine Unit Tests
 * Tests rule engine logic, priority, and combinations
 */

import { describe, it, expect, beforeEach } from '@jest/globals';

// Types and Mocks
interface TransactionContext {
    amount: number;
    currency: string;
    pan: string;
    expiryDate: string;
    isStolen: boolean;
    country: string;
}

interface Rule {
    name: string;
    priority: number;
    evaluate: (ctx: TransactionContext) => { pass: boolean; code?: string };
}

class RuleEngine {
    private rules: Rule[] = [];

    addRule(rule: Rule) {
        this.rules.push(rule);
        this.rules.sort((a, b) => a.priority - b.priority); // Low priority first
    }

    execute(ctx: TransactionContext): { approved: boolean; responseCode: string } {
        for (const rule of this.rules) {
            const result = rule.evaluate(ctx);
            if (!result.pass) {
                return { approved: false, responseCode: result.code || '96' };
            }
        }
        return { approved: true, responseCode: '00' };
    }
}

// Standard Rules
const InsufficientFundsRule: Rule = {
    name: 'Insufficient Funds',
    priority: 10,
    evaluate: (ctx) => ({
        pass: ctx.amount <= 1000, // Hardcoded limit for test
        code: '51'
    })
};

const ExpiredCardRule: Rule = {
    name: 'Expired Card',
    priority: 5, // Checked before funds
    evaluate: (ctx) => {
        const now = new Date();
        const [month, year] = [parseInt(ctx.expiryDate.slice(0, 2)), parseInt(ctx.expiryDate.slice(2))];
        const expiry = new Date(2000 + year, month, 1); // 1st of next month roughly
        return {
            pass: expiry > now,
            code: '54'
        };
    }
};

const StolenCardRule: Rule = {
    name: 'Stolen Card',
    priority: 1, // Highest priority
    evaluate: (ctx) => ({
        pass: !ctx.isStolen,
        code: '43'
    })
};

const GeoSuspicionRule: Rule = {
    name: 'Geo Suspicion',
    priority: 20,
    evaluate: (ctx) => ({
        pass: ctx.country === 'FR', // Only FR allowed for test
        code: '62'
    })
};

describe('RuleEngine', () => {
    let engine: RuleEngine;

    beforeEach(() => {
        engine = new RuleEngine();
        engine.addRule(InsufficientFundsRule);
        engine.addRule(ExpiredCardRule);
        engine.addRule(StolenCardRule);
        engine.addRule(GeoSuspicionRule);
    });

    describe('Rule Priorities', () => {
        it('should fail immediately on Stolen Card (Priority 1)', () => {
            const ctx: TransactionContext = {
                amount: 5000, // Would fail funds
                currency: 'EUR',
                pan: '1111',
                expiryDate: '1220', // Would fail expiry
                isStolen: true, // Should trigger first
                country: 'FR'
            };
            const result = engine.execute(ctx);
            expect(result.approved).toBe(false);
            expect(result.responseCode).toBe('43');
        });

        it('should fail on Expired Card (Priority 5) before Insufficient Funds (Priority 10)', () => {
            const ctx: TransactionContext = {
                amount: 5000, // Fail funds
                currency: 'EUR',
                pan: '1111',
                expiryDate: '0120', // Fail expiry
                isStolen: false,
                country: 'FR'
            };
            const result = engine.execute(ctx);
            expect(result.approved).toBe(false);
            expect(result.responseCode).toBe('54');
        });
    });

    describe('Individual Rules', () => {
        it('should return 51 for Insufficient Funds', () => {
            const ctx: TransactionContext = {
                amount: 2000,
                currency: 'EUR',
                pan: '1111',
                expiryDate: '1299',
                isStolen: false,
                country: 'FR'
            };
            expect(engine.execute(ctx).responseCode).toBe('51');
        });

        it('should return 62 for Suspicious Location', () => {
            const ctx: TransactionContext = {
                amount: 50,
                currency: 'EUR',
                pan: '1111',
                expiryDate: '1299',
                isStolen: false,
                country: 'XX'
            };
            expect(engine.execute(ctx).responseCode).toBe('62');
        });
    });

    describe('Performance', () => {
        it('should evaluate rules in under 1ms', () => {
            const start = performance.now();
            const ctx: TransactionContext = {
                amount: 50,
                currency: 'EUR',
                pan: '1111',
                expiryDate: '1299',
                isStolen: false,
                country: 'FR'
            };
            engine.execute(ctx);
            const end = performance.now();
            expect(end - start).toBeLessThan(1);
        });
    });
});
