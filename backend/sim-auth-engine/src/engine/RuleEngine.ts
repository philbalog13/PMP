/**
 * Rule Engine
 * Orchestrates rule execution and management
 */
import { AuthorizationRule, AuthorizationContext, MatchedRule, RuleAction, RuleDefinition } from '../models';
import { RuleExecutor } from './RuleExecutor';
import { v4 as uuidv4 } from 'uuid';
import { RuleParser } from './RuleParser';

export class RuleEngine {
    private rules: AuthorizationRule[] = [];

    constructor() {
        // Rules will be registered by the application
    }

    /**
     * Register a rule instance
     */
    registerRule(rule: AuthorizationRule): void {
        this.rules.push(rule);
    }

    /**
     * Evaluate all rules against a context
     */
    evaluate(context: AuthorizationContext): MatchedRule[] {
        const matchedRules: MatchedRule[] = [];
        const sortedRules = this.getSortedRules();

        for (const rule of sortedRules) {
            const result = RuleExecutor.execute(rule, context);
            if (result) {
                matchedRules.push(result);
                if (rule.action === 'DENY') {
                    result.wasDeciding = true;
                    break;
                }
            }
        }

        // Default approval if no deny
        if (matchedRules.length > 0 && matchedRules.every(r => r.action !== 'DENY')) {
            const approveRule = matchedRules.find(r => r.action === 'APPROVE');
            if (approveRule) {
                approveRule.wasDeciding = true;
            }
        }

        return matchedRules;
    }

    getDecision(matchedRules: MatchedRule[]): { action: RuleAction; responseCode: string; responseMessage: string } {
        const decidingRule = matchedRules.find(r => r.wasDeciding);
        if (!decidingRule) {
            return { action: 'DENY', responseCode: '96', responseMessage: 'System error - no rules matched' };
        }
        const fullRule = this.rules.find(r => r.id === decidingRule.ruleId);
        return {
            action: decidingRule.action,
            responseCode: decidingRule.responseCode,
            responseMessage: fullRule?.responseMessage || 'Unknown'
        };
    }

    getAllRules(): AuthorizationRule[] {
        return [...this.rules];
    }

    getRuleById(id: string): AuthorizationRule | undefined {
        return this.rules.find(r => r.id === id);
    }

    addCustomRule(def: RuleDefinition): AuthorizationRule {
        const { v4: uuidv4 } = require('uuid');
        const { RuleFactory } = require('./RuleFactory'); // Lazy load to avoid cycle if any (though here it's fine)

        const newRule: AuthorizationRule = {
            id: def.id || `CUSTOM_${uuidv4()}`,
            name: def.name,
            description: def.description,
            priority: def.priority,
            enabled: def.enabled,
            category: def.category,
            action: def.action,
            responseCode: def.responseCode,
            responseMessage: def.responseMessage,
            condition: RuleFactory.createConditionFromDefinition(def.ruleCode, def.parameters),
            createdAt: new Date(),
            updatedAt: new Date()
        };

        this.rules.push(newRule);
        return newRule;
    }

    deleteRule(id: string): boolean {
        const idx = this.rules.findIndex(r => r.id === id);
        if (idx === -1) return false;
        this.rules.splice(idx, 1);
        return true;
    }

    setRuleEnabled(id: string, enabled: boolean): boolean {
        const rule = this.rules.find(r => r.id === id);
        if (!rule) return false;
        rule.enabled = enabled;
        return true;
    }

    private getSortedRules(): AuthorizationRule[] {
        return [...this.rules]
            .filter(r => r.enabled)
            .sort((a, b) => a.priority - b.priority);
    }

    clearRules() {
        this.rules = [];
    }
}
