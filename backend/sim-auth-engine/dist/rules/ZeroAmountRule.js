"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ZeroAmountRule = void 0;
const AbstractRule_1 = require("./AbstractRule");
class ZeroAmountRule extends AbstractRule_1.AbstractRule {
    id = 'RULE_ZERO_AMOUNT';
    name = 'Zero Amount Check';
    description = 'Decline zero amount transactions';
    priority = 0;
    category = 'BALANCE';
    constructor() {
        super('13', 'Invalid amount', 'DENY');
    }
    condition = (ctx) => {
        return ctx.transaction.amount <= 0;
    };
}
exports.ZeroAmountRule = ZeroAmountRule;
//# sourceMappingURL=ZeroAmountRule.js.map