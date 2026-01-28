import { AuthorizationContext } from '../models';
import { AbstractRule } from './AbstractRule';

export class MerchantRule extends AbstractRule {
    id = 'RULE_MERCHANT_BLOCKED';
    name = 'Blocked Merchant Check';
    description = 'Decline transactions from specific blocked merchants';
    priority = 42;
    category = 'FRAUD' as const;

    // Configurable blocked merchants
    private blockedMerchants = ['BAD_MERCHANT_1', 'GAMBLING_SITE'];

    constructor() {
        super('59', 'Suspected fraud', 'DENY');
    }

    condition = (ctx: AuthorizationContext) => {
        return this.blockedMerchants.includes(ctx.transaction.merchantId);
    };
}
