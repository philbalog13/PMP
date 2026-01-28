/**
 * Rule Parser
 * Handles parsing of rule conditions from JSON/DSL or functions
 */
import { AuthorizationContext } from '../models';
export type ConditionOperator = 'EQUALS' | 'NOT_EQUALS' | 'GREATER_THAN' | 'LESS_THAN' | 'CONTAINS' | 'IN' | 'NOT_IN' | 'AND' | 'OR';
export interface RuleConditionDSL {
    field?: string;
    operator: ConditionOperator;
    value?: any;
    conditions?: RuleConditionDSL[];
}
export type RuleCondition = ((ctx: AuthorizationContext) => boolean) | RuleConditionDSL;
export declare class RuleParser {
    /**
     * Parse and evaluate a condition against a context
     */
    static evaluate(condition: RuleCondition, context: AuthorizationContext): boolean;
    private static evaluateDSL;
    private static getValueFromContext;
}
//# sourceMappingURL=RuleParser.d.ts.map