"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hsmRoutes = void 0;
const express_1 = require("express");
const hsm_controller_1 = require("../controllers/hsm.controller");
const router = (0, express_1.Router)();
const controller = new hsm_controller_1.HSMController();
// PIN Operations
router.post('/encrypt-pin', controller.encryptPin);
// router.post('/translate-pin', controller.translatePin);
// MAC Operations
router.post('/generate-mac', controller.generateMac);
router.post('/verify-mac', controller.verifyMac);
// Key Management
router.post('/translate-key', controller.translateKey);
// CVV Operations
router.post('/generate-cvv', controller.generateCvv);
// Admin Routes
router.get('/keys', controller.listKeys);
router.get('/config', controller.getConfig);
router.post('/config', controller.setConfig);
exports.hsmRoutes = router;
