"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Health Routes
 */
const express_1 = require("express");
const health_controller_1 = require("../controllers/health.controller");
const router = (0, express_1.Router)();
router.get('/', health_controller_1.health);
router.get('/live', health_controller_1.liveness);
router.get('/ready', health_controller_1.readiness);
exports.default = router;
//# sourceMappingURL=health.routes.js.map