"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
/**
 * Sim-Auth-Engine - Main Entry Point
 */
const express_1 = __importDefault(require("express"));
const helmet_1 = __importDefault(require("helmet"));
const cors_1 = __importDefault(require("cors"));
const compression_1 = __importDefault(require("compression"));
const uuid_1 = require("uuid");
const config_1 = require("./config");
const routes_1 = __importDefault(require("./routes"));
// ===========================================
// Application Setup
// ===========================================
const app = (0, express_1.default)();
exports.app = app;
// Security
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)());
app.use((0, compression_1.default)());
// Body parsing
app.use(express_1.default.json({ limit: '1mb' }));
app.use(express_1.default.urlencoded({ extended: true }));
// Request ID middleware
app.use((req, res, next) => {
    req.requestId = req.headers['x-request-id'] || (0, uuid_1.v4)();
    res.setHeader('X-Request-ID', req.requestId);
    next();
});
// Request logging
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        console.log(`${req.method} ${req.path} ${res.statusCode} ${Date.now() - start}ms`);
    });
    next();
});
// Routes
app.use('/', routes_1.default);
// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: `Route ${req.method} ${req.path} not found` },
    });
});
// Error handler
app.use((err, req, res, next) => {
    console.error('Error:', err.message);
    res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: err.message },
    });
});
// ===========================================
// Server Lifecycle
// ===========================================
let server;
let isShuttingDown = false;
const startServer = async () => {
    server = app.listen(config_1.config.server.port, config_1.config.server.host, () => {
        console.log(`🚀 Sim-Auth-Engine started on port ${config_1.config.server.port}`);
        console.log('Endpoints:');
        console.log(`  POST /authorize - Process authorization`);
        console.log(`  GET  /transactions/:pan - Transaction history`);
        console.log(`  POST /simulate/:scenario - Run simulation`);
        console.log(`  GET  /rules - List rules`);
        console.log(`  POST /rules - Create rule`);
        console.log(`  GET  /health - Health check`);
    });
};
const gracefulShutdown = async (signal) => {
    if (isShuttingDown)
        return;
    isShuttingDown = true;
    console.log(`${signal} received, shutting down...`);
    if (server) {
        await new Promise((resolve) => server.close(() => resolve()));
    }
    console.log('✅ Shutdown complete');
    process.exit(0);
};
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    gracefulShutdown('uncaughtException');
});
startServer();
//# sourceMappingURL=index.js.map