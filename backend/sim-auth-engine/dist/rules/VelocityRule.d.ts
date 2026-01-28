import { AuthorizationContext } from '../models';
import { AbstractRule } from './AbstractRule';
export declare class VelocityRule extends AbstractRule {
    id: string;
    name: string;
    description: string;
    priority: number;
    category: "VELOCITY";
    constructor();
    condition: (ctx: AuthorizationContext) => boolean;
}
//# sourceMappingURL=VelocityRule.d.ts.map