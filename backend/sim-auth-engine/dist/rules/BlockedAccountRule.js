"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BlockedAccountRule = void 0;
const AbstractRule_1 = require("./AbstractRule");
class BlockedAccountRule extends AbstractRule_1.AbstractRule {
    id = 'RULE_BLOCKED_ACCOUNT';
    name = 'Blocked Account Check';
    description = 'Decline if account is blocked';
    priority = 7;
    category = 'CARD_STATUS';
    constructor() {
        super('62', 'Account restricted', 'DENY');
    }
    condition = (ctx) => {
        return ctx.account.status === 'BLOCKED' || ctx.account.status === 'CLOSED';
    };
}
exports.BlockedAccountRule = BlockedAccountRule;
//# sourceMappingURL=BlockedAccountRule.js.map