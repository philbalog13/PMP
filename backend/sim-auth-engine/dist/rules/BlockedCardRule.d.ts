import { AuthorizationContext } from '../models';
import { AbstractRule } from './AbstractRule';
export declare class BlockedCardRule extends AbstractRule {
    id: string;
    name: string;
    description: string;
    priority: number;
    category: "CARD_STATUS";
    constructor();
    condition: (ctx: AuthorizationContext) => boolean;
}
//# sourceMappingURL=BlockedCardRule.d.ts.map