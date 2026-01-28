/**
 * Abstract Rule Class
 * Base class for all authorization rules
 */
import { AuthorizationRule, RuleAction, RuleCategory } from '../models';
import { RuleCondition } from '../engine/RuleParser';
export declare abstract class AbstractRule implements AuthorizationRule {
    abstract id: string;
    abstract name: string;
    abstract description: string;
    abstract priority: number;
    abstract category: RuleCategory;
    enabled: boolean;
    action: RuleAction;
    responseCode: string;
    responseMessage: string;
    createdAt: Date;
    updatedAt: Date;
    constructor(responseCode: string, responseMessage: string, action?: RuleAction);
    abstract condition: RuleCondition;
}
//# sourceMappingURL=AbstractRule.d.ts.map