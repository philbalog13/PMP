import { HSMSimulator } from '../core/HSMSimulator';
import { ValidationError } from '../core/errors';

export class JSONRPCProtocol {
    private hsm: HSMSimulator;

    constructor(hsm: HSMSimulator) {
        this.hsm = hsm;
    }

    // Adapt API Request to Firmware Command
    async handleRequest(method: string, params: unknown): Promise<unknown> {
        // Map high-level method to Command Code
        let commandCode = '';
        switch (method) {
            case 'encrypt-pin': commandCode = 'B4'; break;
            case 'decrypt-pin': commandCode = 'B5'; break;
            case 'generate-mac': commandCode = 'C0'; break;
            case 'verify-mac': commandCode = 'C2'; break; // C2 Verification
            case 'translate-key': commandCode = 'A6'; break;
            case 'generate-cvv': commandCode = 'D4'; break;
            case 'encrypt-data': commandCode = 'E1'; break;
            case 'calculate-kcv': commandCode = 'K1'; break;
            default: throw new ValidationError(`Method '${method}' not mapped to a firmware command`);
        }

        return await this.hsm.executeCommand(commandCode, params);
    }
}
