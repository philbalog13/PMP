import { AuthorizationContext } from '../models';
import { AbstractRule } from './AbstractRule';

export class SingleTxnLimitRule extends AbstractRule {
    id = 'RULE_SINGLE_TXN_LIMIT';
    name = 'Single Transaction Limit Check';
    description = 'Decline if single transaction exceeds limit';
    priority = 15;
    category = 'LIMITS' as const;

    constructor() {
        super('61', 'Amount exceeds single transaction limit', 'DENY');
    }

    condition = (ctx: AuthorizationContext) => {
        const { account, transaction } = ctx;
        return transaction.amount > account.singleTxnLimit;
    };
}
