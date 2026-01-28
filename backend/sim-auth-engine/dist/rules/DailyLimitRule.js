"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DailyLimitRule = void 0;
const AbstractRule_1 = require("./AbstractRule");
class DailyLimitRule extends AbstractRule_1.AbstractRule {
    id = 'RULE_DAILY_LIMIT';
    name = 'Daily Limit Check';
    description = 'Decline if daily spending limit exceeded';
    priority = 20;
    category = 'LIMITS';
    constructor() {
        super('61', 'Exceeds withdrawal limit', 'DENY');
    }
    condition = (ctx) => {
        const { account, transaction } = ctx;
        return (account.dailySpent + transaction.amount) > account.dailyLimit;
    };
}
exports.DailyLimitRule = DailyLimitRule;
//# sourceMappingURL=DailyLimitRule.js.map