import { AuthorizationContext } from '../models';
import { AbstractRule } from './AbstractRule';
export declare class BlockedAccountRule extends AbstractRule {
    id: string;
    name: string;
    description: string;
    priority: number;
    category: "CARD_STATUS";
    constructor();
    condition: (ctx: AuthorizationContext) => boolean;
}
//# sourceMappingURL=BlockedAccountRule.d.ts.map