/**
 * Rule Engine
 * Orchestrates rule execution and management
 */
import { AuthorizationRule, AuthorizationContext, MatchedRule, RuleAction, RuleDefinition } from '../models';
export declare class RuleEngine {
    private rules;
    constructor();
    /**
     * Register a rule instance
     */
    registerRule(rule: AuthorizationRule): void;
    /**
     * Evaluate all rules against a context
     */
    evaluate(context: AuthorizationContext): MatchedRule[];
    getDecision(matchedRules: MatchedRule[]): {
        action: RuleAction;
        responseCode: string;
        responseMessage: string;
    };
    getAllRules(): AuthorizationRule[];
    getRuleById(id: string): AuthorizationRule | undefined;
    addCustomRule(def: RuleDefinition): AuthorizationRule;
    deleteRule(id: string): boolean;
    setRuleEnabled(id: string, enabled: boolean): boolean;
    private getSortedRules;
    clearRules(): void;
}
//# sourceMappingURL=RuleEngine.d.ts.map