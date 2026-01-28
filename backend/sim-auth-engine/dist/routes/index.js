"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Routes Index
 */
const express_1 = require("express");
const authorization_routes_1 = __importDefault(require("./authorization.routes"));
const health_routes_1 = __importDefault(require("./health.routes"));
const rules_routes_1 = __importDefault(require("./rules.routes"));
const router = (0, express_1.Router)();
router.use('/', authorization_routes_1.default);
router.use('/health', health_routes_1.default);
router.use('/rules', rules_routes_1.default);
exports.default = router;
//# sourceMappingURL=index.js.map