import { AuthorizationContext } from '../models';
import { AbstractRule } from './AbstractRule';

export class BlockedAccountRule extends AbstractRule {
    id = 'RULE_BLOCKED_ACCOUNT';
    name = 'Blocked Account Check';
    description = 'Decline if account is blocked';
    priority = 7;
    category = 'CARD_STATUS' as const;

    constructor() {
        super('62', 'Account restricted', 'DENY');
    }

    condition = (ctx: AuthorizationContext) => {
        return ctx.account.status === 'BLOCKED' || ctx.account.status === 'CLOSED';
    };
}
