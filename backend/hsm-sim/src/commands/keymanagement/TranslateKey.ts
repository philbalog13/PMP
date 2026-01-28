import { ICommand } from '../ICommand';
import { HSMSimulator } from '../../core/HSMSimulator';

export class TranslateKey implements ICommand {
    constructor(private hsm: HSMSimulator) { }

    async execute(payload: any): Promise<any> {
        // Translation logic stub
        return {
            command_code: 'A6',
            translated_key: 'MOCK_KEY',
            status: 'OK'
        };
    }
}
