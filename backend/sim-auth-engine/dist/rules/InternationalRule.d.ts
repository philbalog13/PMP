import { AuthorizationContext } from '../models';
import { AbstractRule } from './AbstractRule';
export declare class InternationalRule extends AbstractRule {
    id: string;
    name: string;
    description: string;
    priority: number;
    category: "SECURITY";
    constructor();
    condition: (ctx: AuthorizationContext) => boolean;
}
//# sourceMappingURL=InternationalRule.d.ts.map