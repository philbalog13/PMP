import { AuthorizationContext } from '../models';
import { AbstractRule } from './AbstractRule';
import dayjs from 'dayjs';

export class TimeRule extends AbstractRule {
    id = 'RULE_UNUSUAL_TIME';
    name = 'Unusual Time Check';
    description = 'Flag transactions during unusual hours (e.g., 3AM - 5AM)';
    priority = 45;
    category = 'FRAUD' as const;

    constructor() {
        super('63', 'Security violation', 'DENY');
    }

    condition = (ctx: AuthorizationContext) => {
        const hour = dayjs(ctx.timestamp).hour();
        // Block between 3 AM and 5 AM
        return hour >= 3 && hour < 5;
    };
}
