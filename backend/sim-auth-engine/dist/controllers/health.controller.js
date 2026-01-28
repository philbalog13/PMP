"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.readiness = exports.liveness = exports.health = void 0;
const database_1 = require("../database");
const health = async (req, res, next) => {
    try {
        const uptime = process.uptime();
        const accounts = database_1.database.accounts.getAll();
        const cards = database_1.database.cards.getAll();
        res.status(200).json({
            success: true,
            data: {
                status: 'healthy',
                version: process.env.npm_package_version || '1.0.0',
                uptime: Math.floor(uptime),
                timestamp: new Date().toISOString(),
                database: {
                    accounts: accounts.length,
                    cards: cards.length,
                    status: 'connected',
                },
                checks: [
                    { name: 'database', status: 'pass', message: 'In-memory DB operational' },
                    { name: 'rules-engine', status: 'pass', message: 'Rules engine ready' },
                ],
            },
            meta: { requestId: req.requestId },
        });
    }
    catch (err) {
        next(err);
    }
};
exports.health = health;
const liveness = async (req, res) => {
    res.status(200).json({ status: 'ok' });
};
exports.liveness = liveness;
const readiness = async (req, res) => {
    res.status(200).json({ status: 'ok' });
};
exports.readiness = readiness;
exports.default = { health: exports.health, liveness: exports.liveness, readiness: exports.readiness };
//# sourceMappingURL=health.controller.js.map