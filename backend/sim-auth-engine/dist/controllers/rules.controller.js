"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMetrics = exports.importRules = exports.deleteRule = exports.createRule = exports.updateRule = exports.getRuleById = exports.getRules = void 0;
const rulesEngine_service_1 = require("../services/rulesEngine.service");
const DataStore_1 = require("../data/DataStore");
const getRules = async (req, res, next) => {
    try {
        const { category, enabled } = req.query;
        let rules = rulesEngine_service_1.rulesEngine.getAllRules();
        if (category) {
            rules = rules.filter(r => r.category === category);
        }
        if (enabled !== undefined) {
            rules = rules.filter(r => r.enabled === (enabled === 'true'));
        }
        res.status(200).json({
            success: true,
            data: { rules, count: rules.length },
            meta: { requestId: req.requestId }
        });
    }
    catch (err) {
        next(err);
    }
};
exports.getRules = getRules;
const getRuleById = async (req, res, next) => {
    try {
        const rule = rulesEngine_service_1.rulesEngine.getRuleById(req.params.id);
        if (!rule) {
            res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Rule not found' } });
            return;
        }
        res.status(200).json({ success: true, data: rule, meta: { requestId: req.requestId } });
    }
    catch (err) {
        next(err);
    }
};
exports.getRuleById = getRuleById;
const updateRule = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { enabled, priority } = req.body;
        const rule = rulesEngine_service_1.rulesEngine.getRuleById(id);
        if (!rule) {
            res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Rule not found' } });
            return;
        }
        if (enabled !== undefined)
            rule.enabled = enabled;
        if (priority !== undefined)
            rule.priority = priority;
        // Persist changes
        await DataStore_1.DataStore.saveRules(rulesEngine_service_1.rulesEngine.getAllRules());
        res.status(200).json({ success: true, data: rule, meta: { requestId: req.requestId } });
    }
    catch (err) {
        next(err);
    }
};
exports.updateRule = updateRule;
const createRule = async (req, res, next) => {
    try {
        const rule = rulesEngine_service_1.rulesEngine.addCustomRule(req.body);
        await DataStore_1.DataStore.saveRules(rulesEngine_service_1.rulesEngine.getAllRules());
        res.status(201).json({ success: true, data: rule, meta: { requestId: req.requestId } });
    }
    catch (err) {
        next(err);
    }
};
exports.createRule = createRule;
const deleteRule = async (req, res, next) => {
    try {
        const success = rulesEngine_service_1.rulesEngine.deleteRule(req.params.id);
        if (!success) {
            res.status(400).json({ success: false, error: { code: 'DELETE_FAILED', message: 'Rule not found or built-in' } });
            return;
        }
        await DataStore_1.DataStore.saveRules(rulesEngine_service_1.rulesEngine.getAllRules());
        res.status(204).send();
    }
    catch (err) {
        next(err);
    }
};
exports.deleteRule = deleteRule;
const importRules = async (req, res, next) => {
    try {
        const rules = req.body.rules; // Expecting array of rule definitions
        if (!Array.isArray(rules)) {
            res.status(400).json({ success: false, error: { code: 'INVALID_FORMAT', message: 'Expected array of rules' } });
            return;
        }
        const imported = [];
        for (const def of rules) {
            try {
                // If ID exists and is custom, update/overwrite? Or just add new?
                // For simplicity, we add/replace custom rules
                if (def.id && rulesEngine_service_1.rulesEngine.getRuleById(def.id)) {
                    rulesEngine_service_1.rulesEngine.deleteRule(def.id);
                }
                const rule = rulesEngine_service_1.rulesEngine.addCustomRule(def);
                imported.push(rule);
            }
            catch (e) {
                console.error('Failed to import rule', e);
            }
        }
        await DataStore_1.DataStore.saveRules(rulesEngine_service_1.rulesEngine.getAllRules());
        res.status(200).json({
            success: true,
            data: { importedCount: imported.length },
            meta: { requestId: req.requestId }
        });
    }
    catch (err) {
        next(err);
    }
};
exports.importRules = importRules;
const getMetrics = async (req, res, next) => {
    try {
        // Return engine stats
        const rules = rulesEngine_service_1.rulesEngine.getAllRules();
        const metrics = {
            totalRules: rules.length,
            enabledRules: rules.filter(r => r.enabled).length,
            byCategory: rules.reduce((acc, r) => {
                acc[r.category] = (acc[r.category] || 0) + 1;
                return acc;
            }, {})
        };
        res.status(200).json({ success: true, data: metrics, meta: { requestId: req.requestId } });
    }
    catch (err) {
        next(err);
    }
};
exports.getMetrics = getMetrics;
//# sourceMappingURL=rules.controller.js.map