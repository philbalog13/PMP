import { AuthorizationContext } from '../models';
import { AbstractRule } from './AbstractRule';

export class VelocityRule extends AbstractRule {
    id = 'RULE_VELOCITY';
    name = 'Transaction Velocity Check';
    description = 'Decline if too many transactions in short period';
    priority = 35;
    category = 'VELOCITY' as const;

    constructor() {
        super('65', 'Transaction velocity exceeded', 'DENY');
    }

    condition = (ctx: AuthorizationContext) => {
        const { account } = ctx;
        const maxDailyTxn = 50;
        return account.dailyTxnCount >= maxDailyTxn;
    };
}
