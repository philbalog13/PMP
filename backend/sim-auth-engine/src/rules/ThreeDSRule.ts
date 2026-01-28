import { AuthorizationContext } from '../models';
import { AbstractRule } from './AbstractRule';

export class ThreeDSRule extends AbstractRule {
    id = 'RULE_3DS_REQUIRED';
    name = '3D Secure Required';
    description = 'Require 3DS for e-commerce transactions above threshold';
    priority = 25;
    category = 'SECURITY' as const;

    constructor() {
        super('65', '3D Secure authentication required', 'DENY');
    }

    condition = (ctx: AuthorizationContext) => {
        const { transaction, card } = ctx;
        const threshold = 500;
        return (
            transaction.isEcommerce &&
            transaction.amount > threshold &&
            !transaction.threeDsAuthenticated &&
            card.threeDsEnrolled
        );
    };
}
