"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const hsm_routes_1 = require("./routes/hsm.routes");
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Logging Middleware
app.use((req, res, next) => {
    console.log(`[HSM] ${req.method} ${req.path}`);
    next();
});
// Vulnerability Middleware
const VulnEngine_1 = require("./services/VulnEngine");
app.use(VulnEngine_1.VulnEngine.middleware);
// Routes
app.use('/hsm', hsm_routes_1.hsmRoutes);
// Health Check
app.get('/health', (req, res) => {
    res.json({ status: 'OK', service: 'HSM Simulator', version: '1.0.0' });
});
exports.default = app;
