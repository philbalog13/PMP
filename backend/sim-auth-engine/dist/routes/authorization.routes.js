"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Authorization Routes
 */
const express_1 = require("express");
const authorization_controller_1 = require("../controllers/authorization.controller");
const router = (0, express_1.Router)();
// Authorization
router.post('/authorize', authorization_controller_1.authorize);
// Transactions
router.get('/transactions/:pan', authorization_controller_1.getTransactions);
// Simulation
router.post('/simulate/:scenario', authorization_controller_1.simulate);
router.post('/auth/generate-code', authorization_controller_1.generateCode);
// Rules management handled in rules.routes.ts
exports.default = router;
//# sourceMappingURL=authorization.routes.js.map