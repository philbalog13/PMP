/**
 * Rules Engine Service Bootstrap
 * Initializes the rule engine with all rules
 */
import { RuleEngine } from '../engine/RuleEngine';
import { DataStore } from '../data/DataStore';
import * as Rules from '../rules';

// Create singleton instance
export const rulesEngine = new RuleEngine();

// Initialize rules
const initializeRules = async () => {
    // Register all built-in rules
    Object.values(Rules).forEach((RuleClass) => {
        if (typeof RuleClass !== 'function') return;

        try {
            // @ts-ignore - Dynamic instantiation
            const ruleInstance = new RuleClass();

            // Accept both prototype methods and instance property functions.
            if (ruleInstance && typeof ruleInstance.condition === 'function' && ruleInstance.id) {
                rulesEngine.registerRule(ruleInstance);
            }
        } catch (e) {
            // Ignore abstract base classes or helper exports.
        }
    });

    // Load persisted state (enabled/priority)
    const storedState = await DataStore.loadRules();

    storedState.forEach(state => {
        if (state.id) {
            const rule = rulesEngine.getRuleById(state.id);
            if (rule) {
                if (state.enabled !== undefined) rule.enabled = state.enabled;
                if (state.priority !== undefined) rule.priority = state.priority;
            }
        }
    });

    console.log(`Rules Engine initialized with ${rulesEngine.getAllRules().length} rules`);
};

// Start initialization
initializeRules().catch(console.error);

export default rulesEngine;
