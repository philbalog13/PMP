import { AuthorizationContext } from '../models';
import { AbstractRule } from './AbstractRule';
export declare class TimeRule extends AbstractRule {
    id: string;
    name: string;
    description: string;
    priority: number;
    category: "FRAUD";
    constructor();
    condition: (ctx: AuthorizationContext) => boolean;
}
//# sourceMappingURL=TimeRule.d.ts.map