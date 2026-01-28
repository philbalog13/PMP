"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InactiveCardRule = void 0;
const AbstractRule_1 = require("./AbstractRule");
class InactiveCardRule extends AbstractRule_1.AbstractRule {
    id = 'RULE_INACTIVE_CARD';
    name = 'Inactive Card Check';
    description = 'Decline inactive cards';
    priority = 4;
    category = 'CARD_STATUS';
    constructor() {
        super('57', 'Transaction not permitted', 'DENY');
    }
    condition = (ctx) => {
        return ctx.card.status === 'INACTIVE' || ctx.card.status === 'PENDING_ACTIVATION';
    };
}
exports.InactiveCardRule = InactiveCardRule;
//# sourceMappingURL=InactiveCardRule.js.map