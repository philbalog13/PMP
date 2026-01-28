"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LostCardRule = void 0;
const AbstractRule_1 = require("./AbstractRule");
class LostCardRule extends AbstractRule_1.AbstractRule {
    id = 'RULE_LOST_CARD';
    name = 'Lost Card Check';
    description = 'Decline lost cards';
    priority = 2;
    category = 'CARD_STATUS';
    constructor() {
        super('41', 'Lost card - pick up', 'DENY');
    }
    condition = (ctx) => {
        return ctx.card.status === 'LOST';
    };
}
exports.LostCardRule = LostCardRule;
//# sourceMappingURL=LostCardRule.js.map