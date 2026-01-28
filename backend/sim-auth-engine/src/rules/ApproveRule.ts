import { AuthorizationContext } from '../models';
import { AbstractRule } from './AbstractRule';

export class ApproveRule extends AbstractRule {
    id = 'RULE_APPROVE_DEFAULT';
    name = 'Default Approval';
    description = 'Approve transaction if no other rules matched';
    priority = 999;
    category = 'CUSTOM' as const;

    constructor() {
        super('00', 'Approved', 'APPROVE');
    }

    condition = () => true;
}
