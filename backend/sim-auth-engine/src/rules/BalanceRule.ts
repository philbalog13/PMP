import { AuthorizationContext } from '../models';
import { AbstractRule } from './AbstractRule';

export class BalanceRule extends AbstractRule {
    id = 'RULE_INSUFFICIENT_FUNDS';
    name = 'Insufficient Funds Check';
    description = 'Decline if transaction amount exceeds available balance';
    priority = 10;
    category = 'BALANCE' as const;

    constructor() {
        super('51', 'Insufficient funds', 'DENY');
    }

    condition = (ctx: AuthorizationContext) => {
        const { account, transaction } = ctx;
        return transaction.amount > account.availableBalance;
    };
}
