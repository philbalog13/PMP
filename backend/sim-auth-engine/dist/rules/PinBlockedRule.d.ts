import { AuthorizationContext } from '../models';
import { AbstractRule } from './AbstractRule';
export declare class PinBlockedRule extends AbstractRule {
    id: string;
    name: string;
    description: string;
    priority: number;
    category: "SECURITY";
    constructor();
    condition: (ctx: AuthorizationContext) => boolean;
}
//# sourceMappingURL=PinBlockedRule.d.ts.map