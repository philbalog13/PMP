/**
 * Rule Executor
 * Handles the execution of a single rule
 */
import { AuthorizationRule, AuthorizationContext, MatchedRule } from '../models';
import { RuleParser } from './RuleParser';

export class RuleExecutor {
    /**
     * Execute a single rule against a context
     */
    static execute(rule: AuthorizationRule, context: AuthorizationContext): MatchedRule | null {
        try {
            if (!rule.enabled) return null;

            const isMatch = RuleParser.evaluate(rule.condition, context);

            if (isMatch) {
                return {
                    ruleId: rule.id,
                    ruleName: rule.name,
                    action: rule.action,
                    responseCode: rule.responseCode,
                    wasDeciding: false
                };
            }
        } catch (error) {
            console.error(`Error executing rule ${rule.id}:`, error);
        }
        return null;
    }
}
