"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MonthlyLimitRule = void 0;
const AbstractRule_1 = require("./AbstractRule");
class MonthlyLimitRule extends AbstractRule_1.AbstractRule {
    id = 'RULE_MONTHLY_LIMIT';
    name = 'Monthly Limit Check';
    description = 'Decline if monthly spending limit exceeded';
    priority = 21;
    category = 'LIMITS';
    constructor() {
        super('61', 'Monthly limit exceeded', 'DENY');
    }
    condition = (ctx) => {
        const { account, transaction } = ctx;
        return (account.monthlySpent + transaction.amount) > account.monthlyLimit;
    };
}
exports.MonthlyLimitRule = MonthlyLimitRule;
//# sourceMappingURL=MonthlyLimitRule.js.map