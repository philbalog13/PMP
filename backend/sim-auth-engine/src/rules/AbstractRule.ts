/**
 * Abstract Rule Class
 * Base class for all authorization rules
 */
import { AuthorizationRule, RuleAction, RuleCategory } from '../models';
import { RuleCondition } from '../engine/RuleParser';

export abstract class AbstractRule implements AuthorizationRule {
    abstract id: string;
    abstract name: string;
    abstract description: string;
    abstract priority: number;
    abstract category: RuleCategory;

    enabled: boolean = true;
    action: RuleAction = 'DENY';
    responseCode: string;
    responseMessage: string;

    createdAt: Date = new Date();
    updatedAt: Date = new Date();

    constructor(responseCode: string, responseMessage: string, action: RuleAction = 'DENY') {
        this.responseCode = responseCode;
        this.responseMessage = responseMessage;
        this.action = action;
    }

    abstract condition: RuleCondition;
}
