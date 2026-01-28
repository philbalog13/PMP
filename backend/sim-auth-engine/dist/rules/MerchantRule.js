"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MerchantRule = void 0;
const AbstractRule_1 = require("./AbstractRule");
class MerchantRule extends AbstractRule_1.AbstractRule {
    id = 'RULE_MERCHANT_BLOCKED';
    name = 'Blocked Merchant Check';
    description = 'Decline transactions from specific blocked merchants';
    priority = 42;
    category = 'FRAUD';
    // Configurable blocked merchants
    blockedMerchants = ['BAD_MERCHANT_1', 'GAMBLING_SITE'];
    constructor() {
        super('59', 'Suspected fraud', 'DENY');
    }
    condition = (ctx) => {
        return this.blockedMerchants.includes(ctx.transaction.merchantId);
    };
}
exports.MerchantRule = MerchantRule;
//# sourceMappingURL=MerchantRule.js.map