import { RuleEngine } from '../../src/engine/RuleEngine';
import { AuthorizationRule, AuthorizationContext, RuleAction } from '../../src/models';

// Mock Rule implementation for testing
class MockRule implements AuthorizationRule {
    id = 'MOCK_RULE';
    name = 'Mock Rule';
    description = 'Mock';
    priority = 100;
    enabled = true;
    category = 'CUSTOM' as const;
    action: RuleAction = 'DENY';
    responseCode = '99';
    responseMessage = 'Mock Deny';
    createdAt = new Date();
    updatedAt = new Date();

    condition = (ctx: AuthorizationContext) => {
        return ctx.transaction.amount > 1000;
    };

    constructor(action: RuleAction = 'DENY') {
        this.action = action;
    }
}

describe('Rule Engine', () => {
    let engine: RuleEngine;

    beforeEach(() => {
        engine = new RuleEngine();
    });

    it('should match rule when condition is met', () => {
        engine.registerRule(new MockRule('DENY'));

        const context: any = {
            transaction: { amount: 1500 }, // > 1000
            timestamp: new Date()
        };

        const results = engine.evaluate(context);
        expect(results.length).toBeGreaterThan(0);
        expect(results[0].ruleId).toBe('MOCK_RULE');

        const decision = engine.getDecision(results);
        expect(decision.action).toBe('DENY');
    });

    it('should not match rule when condition is not met', () => {
        engine.registerRule(new MockRule('DENY'));

        const context: any = {
            transaction: { amount: 500 }, // < 1000
            timestamp: new Date()
        };

        const results = engine.evaluate(context);
        // Should be empty or undefined depending on engine logic for no match
        // Engine returns matched rules.
        expect(results).toHaveLength(0);

        const decision = engine.getDecision(results);
        // Default system error if no rules match (unless we add default approve)
        expect(decision.responseCode).toBe('96');
    });
});
