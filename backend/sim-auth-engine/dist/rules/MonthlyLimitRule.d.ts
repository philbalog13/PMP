import { AuthorizationContext } from '../models';
import { AbstractRule } from './AbstractRule';
export declare class MonthlyLimitRule extends AbstractRule {
    id: string;
    name: string;
    description: string;
    priority: number;
    category: "LIMITS";
    constructor();
    condition: (ctx: AuthorizationContext) => boolean;
}
//# sourceMappingURL=MonthlyLimitRule.d.ts.map