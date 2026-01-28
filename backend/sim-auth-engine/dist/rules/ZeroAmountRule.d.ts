import { AuthorizationContext } from '../models';
import { AbstractRule } from './AbstractRule';
export declare class ZeroAmountRule extends AbstractRule {
    id: string;
    name: string;
    description: string;
    priority: number;
    category: "BALANCE";
    constructor();
    condition: (ctx: AuthorizationContext) => boolean;
}
//# sourceMappingURL=ZeroAmountRule.d.ts.map