"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StolenCardRule = void 0;
const AbstractRule_1 = require("./AbstractRule");
class StolenCardRule extends AbstractRule_1.AbstractRule {
    id = 'RULE_STOLEN_CARD';
    name = 'Stolen Card Check';
    description = 'Decline stolen cards';
    priority = 1;
    category = 'CARD_STATUS';
    constructor() {
        super('43', 'Stolen card - pick up', 'DENY');
    }
    condition = (ctx) => {
        return ctx.card.status === 'STOLEN';
    };
}
exports.StolenCardRule = StolenCardRule;
//# sourceMappingURL=StolenCardRule.js.map