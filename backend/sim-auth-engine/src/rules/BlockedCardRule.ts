import { AuthorizationContext } from '../models';
import { AbstractRule } from './AbstractRule';

export class BlockedCardRule extends AbstractRule {
    id = 'RULE_BLOCKED_CARD';
    name = 'Blocked Card Check';
    description = 'Decline blocked cards';
    priority = 3;
    category = 'CARD_STATUS' as const;

    constructor() {
        super('62', 'Restricted card', 'DENY');
    }

    condition = (ctx: AuthorizationContext) => {
        return ctx.card.status === 'BLOCKED';
    };
}
