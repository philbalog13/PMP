"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Rules Routes
 * Endpoints for managing authorization rules
 */
const express_1 = require("express");
const rules_controller_1 = require("../controllers/rules.controller");
const router = (0, express_1.Router)();
// Rule Metrics
router.get('/metrics', rules_controller_1.getMetrics);
// Rules management
router.get('/', rules_controller_1.getRules);
router.post('/', rules_controller_1.createRule);
router.post('/import', rules_controller_1.importRules);
router.get('/:id', rules_controller_1.getRuleById);
router.put('/:id', rules_controller_1.updateRule); // Supports full update or partial (enabled/priority)
router.delete('/:id', rules_controller_1.deleteRule);
exports.default = router;
//# sourceMappingURL=rules.routes.js.map