import { AuthorizationContext } from '../models';
import { AbstractRule } from './AbstractRule';

export class DailyLimitRule extends AbstractRule {
    id = 'RULE_DAILY_LIMIT';
    name = 'Daily Limit Check';
    description = 'Decline if daily spending limit exceeded';
    priority = 20;
    category = 'LIMITS' as const;

    constructor() {
        super('61', 'Exceeds withdrawal limit', 'DENY');
    }

    condition = (ctx: AuthorizationContext) => {
        const { account, transaction } = ctx;
        return (account.dailySpent + transaction.amount) > account.dailyLimit;
    };
}
