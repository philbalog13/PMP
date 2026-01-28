"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BalanceRule = void 0;
const AbstractRule_1 = require("./AbstractRule");
class BalanceRule extends AbstractRule_1.AbstractRule {
    id = 'RULE_INSUFFICIENT_FUNDS';
    name = 'Insufficient Funds Check';
    description = 'Decline if transaction amount exceeds available balance';
    priority = 10;
    category = 'BALANCE';
    constructor() {
        super('51', 'Insufficient funds', 'DENY');
    }
    condition = (ctx) => {
        const { account, transaction } = ctx;
        return transaction.amount > account.availableBalance;
    };
}
exports.BalanceRule = BalanceRule;
//# sourceMappingURL=BalanceRule.js.map