import { AuthorizationContext } from '../models';
import { AbstractRule } from './AbstractRule';
export declare class InactiveCardRule extends AbstractRule {
    id: string;
    name: string;
    description: string;
    priority: number;
    category: "CARD_STATUS";
    constructor();
    condition: (ctx: AuthorizationContext) => boolean;
}
//# sourceMappingURL=InactiveCardRule.d.ts.map