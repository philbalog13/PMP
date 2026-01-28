import { AuthorizationContext } from '../models';
import { AbstractRule } from './AbstractRule';
export declare class SingleTxnLimitRule extends AbstractRule {
    id: string;
    name: string;
    description: string;
    priority: number;
    category: "LIMITS";
    constructor();
    condition: (ctx: AuthorizationContext) => boolean;
}
//# sourceMappingURL=SingleTxnLimitRule.d.ts.map