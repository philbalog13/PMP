import { AuthorizationContext } from '../models';
import { AbstractRule } from './AbstractRule';
import { database } from '../database';

export class ExpiryRule extends AbstractRule {
    id = 'RULE_EXPIRED_CARD';
    name = 'Expired Card Check';
    description = 'Decline if card has expired';
    priority = 5;
    category = 'CARD_STATUS' as const;

    constructor() {
        super('54', 'Expired card', 'DENY');
    }

    condition = (ctx: AuthorizationContext) => {
        const { card } = ctx;
        return database.cards.isExpired(card) || card.status === 'EXPIRED';
    };
}
