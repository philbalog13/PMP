"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SingleTxnLimitRule = void 0;
const AbstractRule_1 = require("./AbstractRule");
class SingleTxnLimitRule extends AbstractRule_1.AbstractRule {
    id = 'RULE_SINGLE_TXN_LIMIT';
    name = 'Single Transaction Limit Check';
    description = 'Decline if single transaction exceeds limit';
    priority = 15;
    category = 'LIMITS';
    constructor() {
        super('61', 'Amount exceeds single transaction limit', 'DENY');
    }
    condition = (ctx) => {
        const { account, transaction } = ctx;
        return transaction.amount > account.singleTxnLimit;
    };
}
exports.SingleTxnLimitRule = SingleTxnLimitRule;
//# sourceMappingURL=SingleTxnLimitRule.js.map