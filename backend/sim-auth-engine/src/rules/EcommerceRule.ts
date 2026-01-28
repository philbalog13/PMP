import { AuthorizationContext } from '../models';
import { AbstractRule } from './AbstractRule';

export class EcommerceRule extends AbstractRule {
    id = 'RULE_ECOMMERCE_BLOCKED';
    name = 'E-commerce Transaction Check';
    description = 'Decline e-commerce transactions if not enabled';
    priority = 31;
    category = 'SECURITY' as const;

    constructor() {
        super('57', 'E-commerce transactions not permitted', 'DENY');
    }

    condition = (ctx: AuthorizationContext) => {
        const { card, transaction } = ctx;
        return transaction.isEcommerce && !card.ecommerceEnabled;
    };
}
