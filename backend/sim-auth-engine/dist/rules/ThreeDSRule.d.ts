import { AuthorizationContext } from '../models';
import { AbstractRule } from './AbstractRule';
export declare class ThreeDSRule extends AbstractRule {
    id: string;
    name: string;
    description: string;
    priority: number;
    category: "SECURITY";
    constructor();
    condition: (ctx: AuthorizationContext) => boolean;
}
//# sourceMappingURL=ThreeDSRule.d.ts.map