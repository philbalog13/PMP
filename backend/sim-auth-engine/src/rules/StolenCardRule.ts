import { AuthorizationContext } from '../models';
import { AbstractRule } from './AbstractRule';

export class StolenCardRule extends AbstractRule {
    id = 'RULE_STOLEN_CARD';
    name = 'Stolen Card Check';
    description = 'Decline stolen cards';
    priority = 1;
    category = 'CARD_STATUS' as const;

    constructor() {
        super('43', 'Stolen card - pick up', 'DENY');
    }

    condition = (ctx: AuthorizationContext) => {
        return ctx.card.status === 'STOLEN';
    };
}
