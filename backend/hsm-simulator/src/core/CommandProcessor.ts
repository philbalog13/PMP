import { HSMSimulator } from './HSMSimulator';
import { ICommand } from '../commands/ICommand';
import { EncryptPIN } from '../commands/pin/EncryptPIN';
import { DecryptPIN } from '../commands/pin/DecryptPIN';
import { GenerateMAC } from '../commands/mac/GenerateMAC';
import { VerifyMAC } from '../commands/mac/VerifyMAC';
import { TranslateKey } from '../commands/keymanagement/TranslateKey';
import { GenerateCVV } from '../commands/crypto/GenerateCVV';
import { EncryptData } from '../commands/crypto/EncryptData';
import { CalculateKCV } from '../commands/crypto/CalculateKCV';
import { ValidationError } from './errors';

export class CommandProcessor {
    private commands: Map<string, ICommand> = new Map();
    private readonly hsm: HSMSimulator;

    constructor(hsm: HSMSimulator) {
        this.hsm = hsm;
        this.registerCommands();
    }

    private registerCommands() {
        // Register supported commands
        this.commands.set('B4', new EncryptPIN(this.hsm));
        this.commands.set('B5', new DecryptPIN(this.hsm));
        this.commands.set('C0', new GenerateMAC(this.hsm));
        this.commands.set('C2', new VerifyMAC(this.hsm));
        this.commands.set('A6', new TranslateKey(this.hsm));
        this.commands.set('D4', new GenerateCVV(this.hsm));
        this.commands.set('E1', new EncryptData(this.hsm));
        this.commands.set('K1', new CalculateKCV(this.hsm));
    }

    public async process(code: string, payload: unknown): Promise<unknown> {
        const command = this.commands.get(code);
        if (!command) {
            throw new ValidationError(`Unknown command code '${code}'`);
        }
        return command.execute(payload);
    }
}
