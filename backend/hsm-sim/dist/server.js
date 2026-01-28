"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = __importDefault(require("./app"));
const dotenv_1 = __importDefault(require("dotenv"));
const KeyStore_1 = require("./services/KeyStore");
dotenv_1.default.config();
const PORT = process.env.HSM_PORT || 3004;
// Initialize KeyStore
KeyStore_1.KeyStore.initialize();
app_1.default.listen(PORT, () => {
    console.log(`🔒 HSM Simulator running on port ${PORT}`);
    console.log(`🔑 Master Keys Loaded`);
});
