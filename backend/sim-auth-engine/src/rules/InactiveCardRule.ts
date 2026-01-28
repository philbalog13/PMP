import { AuthorizationContext } from '../models';
import { AbstractRule } from './AbstractRule';

export class InactiveCardRule extends AbstractRule {
    id = 'RULE_INACTIVE_CARD';
    name = 'Inactive Card Check';
    description = 'Decline inactive cards';
    priority = 4;
    category = 'CARD_STATUS' as const;

    constructor() {
        super('57', 'Transaction not permitted', 'DENY');
    }

    condition = (ctx: AuthorizationContext) => {
        return ctx.card.status === 'INACTIVE' || ctx.card.status === 'PENDING_ACTIVATION';
    };
}
