import { AuthorizationContext } from '../models';
import { AbstractRule } from './AbstractRule';
export declare class LocationRule extends AbstractRule {
    id: string;
    name: string;
    description: string;
    priority: number;
    category: "FRAUD";
    private highRiskCountries;
    constructor();
    condition: (ctx: AuthorizationContext) => boolean;
}
//# sourceMappingURL=LocationRule.d.ts.map