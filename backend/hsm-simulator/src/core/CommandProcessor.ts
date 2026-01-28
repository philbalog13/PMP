import { HSMSimulator } from './HSMSimulator';
import { ICommand } from '../commands/ICommand';
import { EncryptPIN } from '../commands/pin/EncryptPIN';
import { GenerateMAC } from '../commands/mac/GenerateMAC';
import { TranslateKey } from '../commands/keymanagement/TranslateKey';
import { GenerateCVV } from '../commands/crypto/GenerateCVV';

export class CommandProcessor {
    private commands: Map<string, ICommand> = new Map();
    private hsm: HSMSimulator;

    constructor(hsm: HSMSimulator) {
        this.hsm = hsm;
        this.registerCommands();
    }

    private registerCommands() {
        // Register supported commands
        this.commands.set('B4', new EncryptPIN(this.hsm));
        this.commands.set('C0', new GenerateMAC(this.hsm));
        this.commands.set('A6', new TranslateKey(this.hsm));
        this.commands.set('D4', new GenerateCVV(this.hsm));
    }

    public async process(code: string, payload: any): Promise<any> {
        const command = this.commands.get(code);
        if (!command) {
            throw new Error(`Unknown Command Code: ${code}`);
        }
        return await command.execute(payload);
    }
}
