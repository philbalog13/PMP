"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RuleEngine = void 0;
const RuleExecutor_1 = require("./RuleExecutor");
class RuleEngine {
    rules = [];
    constructor() {
        // Rules will be registered by the application
    }
    /**
     * Register a rule instance
     */
    registerRule(rule) {
        this.rules.push(rule);
    }
    /**
     * Evaluate all rules against a context
     */
    evaluate(context) {
        const matchedRules = [];
        const sortedRules = this.getSortedRules();
        for (const rule of sortedRules) {
            const result = RuleExecutor_1.RuleExecutor.execute(rule, context);
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
    getDecision(matchedRules) {
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
    getAllRules() {
        return [...this.rules];
    }
    getRuleById(id) {
        return this.rules.find(r => r.id === id);
    }
    addCustomRule(def) {
        const { v4: uuidv4 } = require('uuid');
        const { RuleFactory } = require('./RuleFactory'); // Lazy load to avoid cycle if any (though here it's fine)
        const newRule = {
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
    deleteRule(id) {
        const idx = this.rules.findIndex(r => r.id === id);
        if (idx === -1)
            return false;
        this.rules.splice(idx, 1);
        return true;
    }
    setRuleEnabled(id, enabled) {
        const rule = this.rules.find(r => r.id === id);
        if (!rule)
            return false;
        rule.enabled = enabled;
        return true;
    }
    getSortedRules() {
        return [...this.rules]
            .filter(r => r.enabled)
            .sort((a, b) => a.priority - b.priority);
    }
    clearRules() {
        this.rules = [];
    }
}
exports.RuleEngine = RuleEngine;
//# sourceMappingURL=RuleEngine.js.map