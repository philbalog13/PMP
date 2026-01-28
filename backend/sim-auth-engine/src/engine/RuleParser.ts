/**
 * Rule Parser
 * Handles parsing of rule conditions from JSON/DSL or functions
 */
import { AuthorizationContext } from '../models';
import dayjs from 'dayjs';

export type ConditionOperator =
    | 'EQUALS' | 'NOT_EQUALS' | 'GREATER_THAN' | 'LESS_THAN'
    | 'CONTAINS' | 'IN' | 'NOT_IN' | 'AND' | 'OR';

export interface RuleConditionDSL {
    field?: string;
    operator: ConditionOperator;
    value?: any;
    conditions?: RuleConditionDSL[]; // For AND/OR
}

export type RuleCondition = ((ctx: AuthorizationContext) => boolean) | RuleConditionDSL;

export class RuleParser {
    /**
     * Parse and evaluate a condition against a context
     */
    static evaluate(condition: RuleCondition, context: AuthorizationContext): boolean {
        if (typeof condition === 'function') {
            return condition(context);
        }
        return this.evaluateDSL(condition, context);
    }

    private static evaluateDSL(dsl: RuleConditionDSL, context: AuthorizationContext): boolean {
        if (dsl.operator === 'AND') {
            return (dsl.conditions || []).every(c => this.evaluateDSL(c, context));
        }
        if (dsl.operator === 'OR') {
            return (dsl.conditions || []).some(c => this.evaluateDSL(c, context));
        }

        const actualValue = this.getValueFromContext(context, dsl.field || '');

        switch (dsl.operator) {
            case 'EQUALS': return actualValue == dsl.value;
            case 'NOT_EQUALS': return actualValue != dsl.value;
            case 'GREATER_THAN': return actualValue > dsl.value;
            case 'LESS_THAN': return actualValue < dsl.value;
            case 'IN': return Array.isArray(dsl.value) && dsl.value.includes(actualValue);
            case 'NOT_IN': return Array.isArray(dsl.value) && !dsl.value.includes(actualValue);
            case 'CONTAINS': return Array.isArray(actualValue) && actualValue.includes(dsl.value);
            default: return false;
        }
    }

    private static getValueFromContext(context: any, path: string): any {
        return path.split('.').reduce((obj, key) => obj && obj[key], context);
    }
}
