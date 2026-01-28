import { AuthorizationContext } from '../models';
import { AbstractRule } from './AbstractRule';
export declare class MerchantRule extends AbstractRule {
    id: string;
    name: string;
    description: string;
    priority: number;
    category: "FRAUD";
    private blockedMerchants;
    constructor();
    condition: (ctx: AuthorizationContext) => boolean;
}
//# sourceMappingURL=MerchantRule.d.ts.map