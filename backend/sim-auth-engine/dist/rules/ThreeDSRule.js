"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ThreeDSRule = void 0;
const AbstractRule_1 = require("./AbstractRule");
class ThreeDSRule extends AbstractRule_1.AbstractRule {
    id = 'RULE_3DS_REQUIRED';
    name = '3D Secure Required';
    description = 'Require 3DS for e-commerce transactions above threshold';
    priority = 25;
    category = 'SECURITY';
    constructor() {
        super('65', '3D Secure authentication required', 'DENY');
    }
    condition = (ctx) => {
        const { transaction, card } = ctx;
        const threshold = 500;
        return (transaction.isEcommerce &&
            transaction.amount > threshold &&
            !transaction.threeDsAuthenticated &&
            card.threeDsEnrolled);
    };
}
exports.ThreeDSRule = ThreeDSRule;
//# sourceMappingURL=ThreeDSRule.js.map