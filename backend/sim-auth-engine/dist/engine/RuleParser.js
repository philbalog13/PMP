"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RuleParser = void 0;
class RuleParser {
    /**
     * Parse and evaluate a condition against a context
     */
    static evaluate(condition, context) {
        if (typeof condition === 'function') {
            return condition(context);
        }
        return this.evaluateDSL(condition, context);
    }
    static evaluateDSL(dsl, context) {
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
    static getValueFromContext(context, path) {
        return path.split('.').reduce((obj, key) => obj && obj[key], context);
    }
}
exports.RuleParser = RuleParser;
//# sourceMappingURL=RuleParser.js.map