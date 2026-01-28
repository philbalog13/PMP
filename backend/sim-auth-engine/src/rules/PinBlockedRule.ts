import { AuthorizationContext } from '../models';
import { AbstractRule } from './AbstractRule';

export class PinBlockedRule extends AbstractRule {
    id = 'RULE_PIN_BLOCKED';
    name = 'PIN Blocked Check';
    description = 'Decline if PIN is blocked';
    priority = 6;
    category = 'SECURITY' as const;

    constructor() {
        super('75', 'PIN tries exceeded', 'DENY');
    }

    condition = (ctx: AuthorizationContext) => {
        return ctx.card.pinBlocked && ctx.transaction.pinEntered;
    };
}
