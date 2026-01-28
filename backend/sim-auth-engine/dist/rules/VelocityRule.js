"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VelocityRule = void 0;
const AbstractRule_1 = require("./AbstractRule");
class VelocityRule extends AbstractRule_1.AbstractRule {
    id = 'RULE_VELOCITY';
    name = 'Transaction Velocity Check';
    description = 'Decline if too many transactions in short period';
    priority = 35;
    category = 'VELOCITY';
    constructor() {
        super('65', 'Transaction velocity exceeded', 'DENY');
    }
    condition = (ctx) => {
        const { account } = ctx;
        const maxDailyTxn = 50;
        return account.dailyTxnCount >= maxDailyTxn;
    };
}
exports.VelocityRule = VelocityRule;
//# sourceMappingURL=VelocityRule.js.map