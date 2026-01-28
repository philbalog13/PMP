import { AuthorizationContext } from '../models';
import { AbstractRule } from './AbstractRule';

export class LostCardRule extends AbstractRule {
    id = 'RULE_LOST_CARD';
    name = 'Lost Card Check';
    description = 'Decline lost cards';
    priority = 2;
    category = 'CARD_STATUS' as const;

    constructor() {
        super('41', 'Lost card - pick up', 'DENY');
    }

    condition = (ctx: AuthorizationContext) => {
        return ctx.card.status === 'LOST';
    };
}
