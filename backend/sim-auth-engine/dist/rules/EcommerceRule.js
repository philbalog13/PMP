"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EcommerceRule = void 0;
const AbstractRule_1 = require("./AbstractRule");
class EcommerceRule extends AbstractRule_1.AbstractRule {
    id = 'RULE_ECOMMERCE_BLOCKED';
    name = 'E-commerce Transaction Check';
    description = 'Decline e-commerce transactions if not enabled';
    priority = 31;
    category = 'SECURITY';
    constructor() {
        super('57', 'E-commerce transactions not permitted', 'DENY');
    }
    condition = (ctx) => {
        const { card, transaction } = ctx;
        return transaction.isEcommerce && !card.ecommerceEnabled;
    };
}
exports.EcommerceRule = EcommerceRule;
//# sourceMappingURL=EcommerceRule.js.map