import { AuthorizationContext } from '../models';
import { AbstractRule } from './AbstractRule';
export declare class BalanceRule extends AbstractRule {
    id: string;
    name: string;
    description: string;
    priority: number;
    category: "BALANCE";
    constructor();
    condition: (ctx: AuthorizationContext) => boolean;
}
//# sourceMappingURL=BalanceRule.d.ts.map