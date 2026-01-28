"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InternationalRule = void 0;
const AbstractRule_1 = require("./AbstractRule");
class InternationalRule extends AbstractRule_1.AbstractRule {
    id = 'RULE_INTERNATIONAL_BLOCKED';
    name = 'International Transaction Check';
    description = 'Decline international transactions if not enabled';
    priority = 30;
    category = 'SECURITY';
    constructor() {
        super('57', 'International transactions not permitted', 'DENY');
    }
    condition = (ctx) => {
        const { card, transaction } = ctx;
        const isInternational = transaction.location?.country !== 'FR';
        return isInternational && !card.internationalEnabled;
    };
}
exports.InternationalRule = InternationalRule;
//# sourceMappingURL=InternationalRule.js.map