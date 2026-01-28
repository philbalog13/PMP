import { AuthorizationContext } from '../models';
import { AbstractRule } from './AbstractRule';

export class MonthlyLimitRule extends AbstractRule {
    id = 'RULE_MONTHLY_LIMIT';
    name = 'Monthly Limit Check';
    description = 'Decline if monthly spending limit exceeded';
    priority = 21;
    category = 'LIMITS' as const;

    constructor() {
        super('61', 'Monthly limit exceeded', 'DENY');
    }

    condition = (ctx: AuthorizationContext) => {
        const { account, transaction } = ctx;
        return (account.monthlySpent + transaction.amount) > account.monthlyLimit;
    };
}
