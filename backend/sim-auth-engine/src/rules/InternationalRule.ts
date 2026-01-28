import { AuthorizationContext } from '../models';
import { AbstractRule } from './AbstractRule';

export class InternationalRule extends AbstractRule {
    id = 'RULE_INTERNATIONAL_BLOCKED';
    name = 'International Transaction Check';
    description = 'Decline international transactions if not enabled';
    priority = 30;
    category = 'SECURITY' as const;

    constructor() {
        super('57', 'International transactions not permitted', 'DENY');
    }

    condition = (ctx: AuthorizationContext) => {
        const { card, transaction } = ctx;
        const isInternational = transaction.location?.country !== 'FR';
        return isInternational && !card.internationalEnabled;
    };
}
