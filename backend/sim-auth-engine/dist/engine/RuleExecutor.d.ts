/**
 * Rule Executor
 * Handles the execution of a single rule
 */
import { AuthorizationRule, AuthorizationContext, MatchedRule } from '../models';
export declare class RuleExecutor {
    /**
     * Execute a single rule against a context
     */
    static execute(rule: AuthorizationRule, context: AuthorizationContext): MatchedRule | null;
}
//# sourceMappingURL=RuleExecutor.d.ts.map