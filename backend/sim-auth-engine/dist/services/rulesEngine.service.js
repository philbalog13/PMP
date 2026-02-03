"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.rulesEngine = void 0;
/**
 * Rules Engine Service Bootstrap
 * Initializes the rule engine with all rules
 */
const RuleEngine_1 = require("../engine/RuleEngine");
const DataStore_1 = require("../data/DataStore");
const Rules = __importStar(require("../rules"));
// Create singleton instance
exports.rulesEngine = new RuleEngine_1.RuleEngine();
// Initialize rules
const initializeRules = async () => {
    // Register all built-in rules
    Object.values(Rules).forEach((RuleClass) => {
        if (typeof RuleClass !== 'function')
            return;
        try {
            // @ts-ignore - Dynamic instantiation
            const ruleInstance = new RuleClass();
            // Accept both prototype methods and instance property functions.
            if (ruleInstance && typeof ruleInstance.condition === 'function' && ruleInstance.id) {
                exports.rulesEngine.registerRule(ruleInstance);
            }
        }
        catch (e) {
            // Ignore abstract base classes or helper exports.
        }
    });
    // Load persisted state (enabled/priority)
    const storedState = await DataStore_1.DataStore.loadRules();
    storedState.forEach(state => {
        if (state.id) {
            const rule = exports.rulesEngine.getRuleById(state.id);
            if (rule) {
                if (state.enabled !== undefined)
                    rule.enabled = state.enabled;
                if (state.priority !== undefined)
                    rule.priority = state.priority;
            }
        }
    });
    console.log(`Rules Engine initialized with ${exports.rulesEngine.getAllRules().length} rules`);
};
// Start initialization
initializeRules().catch(console.error);
exports.default = exports.rulesEngine;
//# sourceMappingURL=rulesEngine.service.js.map