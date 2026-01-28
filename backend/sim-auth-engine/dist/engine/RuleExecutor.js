"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RuleExecutor = void 0;
const RuleParser_1 = require("./RuleParser");
class RuleExecutor {
    /**
     * Execute a single rule against a context
     */
    static execute(rule, context) {
        try {
            if (!rule.enabled)
                return null;
            const isMatch = RuleParser_1.RuleParser.evaluate(rule.condition, context);
            if (isMatch) {
                return {
                    ruleId: rule.id,
                    ruleName: rule.name,
                    action: rule.action,
                    responseCode: rule.responseCode,
                    wasDeciding: false
                };
            }
        }
        catch (error) {
            console.error(`Error executing rule ${rule.id}:`, error);
        }
        return null;
    }
}
exports.RuleExecutor = RuleExecutor;
//# sourceMappingURL=RuleExecutor.js.map