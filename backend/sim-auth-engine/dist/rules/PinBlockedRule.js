"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PinBlockedRule = void 0;
const AbstractRule_1 = require("./AbstractRule");
class PinBlockedRule extends AbstractRule_1.AbstractRule {
    id = 'RULE_PIN_BLOCKED';
    name = 'PIN Blocked Check';
    description = 'Decline if PIN is blocked';
    priority = 6;
    category = 'SECURITY';
    constructor() {
        super('75', 'PIN tries exceeded', 'DENY');
    }
    condition = (ctx) => {
        return ctx.card.pinBlocked && ctx.transaction.pinEntered;
    };
}
exports.PinBlockedRule = PinBlockedRule;
//# sourceMappingURL=PinBlockedRule.js.map