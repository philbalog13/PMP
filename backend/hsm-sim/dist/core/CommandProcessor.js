"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommandProcessor = void 0;
const EncryptPIN_1 = require("../commands/pin/EncryptPIN");
const GenerateMAC_1 = require("../commands/mac/GenerateMAC");
const TranslateKey_1 = require("../commands/keymanagement/TranslateKey");
const GenerateCVV_1 = require("../commands/crypto/GenerateCVV");
class CommandProcessor {
    constructor(hsm) {
        this.commands = new Map();
        this.hsm = hsm;
        this.registerCommands();
    }
    registerCommands() {
        // Register supported commands
        this.commands.set('B4', new EncryptPIN_1.EncryptPIN(this.hsm));
        this.commands.set('C0', new GenerateMAC_1.GenerateMAC(this.hsm));
        this.commands.set('A6', new TranslateKey_1.TranslateKey(this.hsm));
        this.commands.set('D4', new GenerateCVV_1.GenerateCVV(this.hsm));
    }
    async process(code, payload) {
        const command = this.commands.get(code);
        if (!command) {
            throw new Error(`Unknown Command Code: ${code}`);
        }
        return await command.execute(payload);
    }
}
exports.CommandProcessor = CommandProcessor;
