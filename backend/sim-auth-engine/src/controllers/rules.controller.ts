/**
 * Rules Controller
 * Handles rule management
 */
import { Request, Response, NextFunction } from 'express';
import { rulesEngine } from '../services/rulesEngine.service';
import { DataStore } from '../data/DataStore';
import { RuleDefinition } from '../models';

export const getRules = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { category, enabled } = req.query;
        let rules = rulesEngine.getAllRules();

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
    } catch (err) { next(err); }
};

export const getRuleById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const rule = rulesEngine.getRuleById(req.params.id);
        if (!rule) {
            res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Rule not found' } });
            return;
        }
        res.status(200).json({ success: true, data: rule, meta: { requestId: req.requestId } });
    } catch (err) { next(err); }
};

export const updateRule = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { id } = req.params;
        const { enabled, priority } = req.body;

        const rule = rulesEngine.getRuleById(id);
        if (!rule) {
            res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Rule not found' } });
            return;
        }

        if (enabled !== undefined) rule.enabled = enabled;
        if (priority !== undefined) rule.priority = priority;

        // Persist changes
        await DataStore.saveRules(rulesEngine.getAllRules());

        res.status(200).json({ success: true, data: rule, meta: { requestId: req.requestId } });
    } catch (err) { next(err); }
};

export const createRule = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const rule = rulesEngine.addCustomRule(req.body as RuleDefinition);
        await DataStore.saveRules(rulesEngine.getAllRules());
        res.status(201).json({ success: true, data: rule, meta: { requestId: req.requestId } });
    } catch (err) { next(err); }
};

export const deleteRule = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const success = rulesEngine.deleteRule(req.params.id);
        if (!success) {
            res.status(400).json({ success: false, error: { code: 'DELETE_FAILED', message: 'Rule not found or built-in' } });
            return;
        }
        await DataStore.saveRules(rulesEngine.getAllRules());
        res.status(204).send();
    } catch (err) { next(err); }
};

export const importRules = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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
                if (def.id && rulesEngine.getRuleById(def.id)) {
                    rulesEngine.deleteRule(def.id);
                }
                const rule = rulesEngine.addCustomRule(def);
                imported.push(rule);
            } catch (e) {
                console.error('Failed to import rule', e);
            }
        }

        await DataStore.saveRules(rulesEngine.getAllRules());

        res.status(200).json({
            success: true,
            data: { importedCount: imported.length },
            meta: { requestId: req.requestId }
        });
    } catch (err) { next(err); }
};

export const getMetrics = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        // Return engine stats
        const rules = rulesEngine.getAllRules();
        const metrics = {
            totalRules: rules.length,
            enabledRules: rules.filter(r => r.enabled).length,
            byCategory: rules.reduce((acc, r) => {
                acc[r.category] = (acc[r.category] || 0) + 1;
                return acc;
            }, {} as Record<string, number>)
        };
        res.status(200).json({ success: true, data: metrics, meta: { requestId: req.requestId } });
    } catch (err) { next(err); }
};
