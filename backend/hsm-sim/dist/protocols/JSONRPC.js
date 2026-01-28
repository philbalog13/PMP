"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JSONRPCProtocol = void 0;
class JSONRPCProtocol {
    constructor(hsm) {
        this.hsm = hsm;
    }
    // Adapt API Request to Firmware Command
    async handleRequest(method, params) {
        // Map high-level method to Command Code
        let commandCode = '';
        switch (method) {
            case 'encrypt-pin':
                commandCode = 'B4';
                break;
            case 'generate-mac':
                commandCode = 'C0';
                break;
            case 'verify-mac':
                commandCode = 'C2';
                break; // C2 Verification
            case 'translate-key':
                commandCode = 'A6';
                break;
            case 'generate-cvv':
                commandCode = 'D4';
                break;
            default: throw new Error(`Method ${method} not mapped to Firmware Command`);
        }
        return await this.hsm.executeCommand(commandCode, params);
    }
}
exports.JSONRPCProtocol = JSONRPCProtocol;
