"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BlockedCardRule = void 0;
const AbstractRule_1 = require("./AbstractRule");
class BlockedCardRule extends AbstractRule_1.AbstractRule {
    id = 'RULE_BLOCKED_CARD';
    name = 'Blocked Card Check';
    description = 'Decline blocked cards';
    priority = 3;
    category = 'CARD_STATUS';
    constructor() {
        super('62', 'Restricted card', 'DENY');
    }
    condition = (ctx) => {
        return ctx.card.status === 'BLOCKED';
    };
}
exports.BlockedCardRule = BlockedCardRule;
//# sourceMappingURL=BlockedCardRule.js.map