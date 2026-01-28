import { AuthorizationContext } from '../models';
import { AbstractRule } from './AbstractRule';

export class ZeroAmountRule extends AbstractRule {
    id = 'RULE_ZERO_AMOUNT';
    name = 'Zero Amount Check';
    description = 'Decline zero amount transactions';
    priority = 0;
    category = 'BALANCE' as const;

    constructor() {
        super('13', 'Invalid amount', 'DENY');
    }

    condition = (ctx: AuthorizationContext) => {
        return ctx.transaction.amount <= 0;
    };
}
