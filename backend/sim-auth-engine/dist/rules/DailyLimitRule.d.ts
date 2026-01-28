import { AuthorizationContext } from '../models';
import { AbstractRule } from './AbstractRule';
export declare class DailyLimitRule extends AbstractRule {
    id: string;
    name: string;
    description: string;
    priority: number;
    category: "LIMITS";
    constructor();
    condition: (ctx: AuthorizationContext) => boolean;
}
//# sourceMappingURL=DailyLimitRule.d.ts.map