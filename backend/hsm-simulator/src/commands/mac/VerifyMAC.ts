import { ICommand } from '../ICommand';
import { HSMSimulator } from '../../core/HSMSimulator';
import { GenerateMAC } from './GenerateMAC';
import { ensureHex, normalizeKeyLabel } from '../../utils/input';
import { ValidationError } from '../../core/errors';

export class VerifyMAC implements ICommand {
    private readonly hsm: HSMSimulator;
    private readonly macGenerator: GenerateMAC;

    constructor(hsm: HSMSimulator) {
        this.hsm = hsm;
        this.macGenerator = new GenerateMAC(hsm);
    }

    async execute(payload: unknown): Promise<unknown> {
        const body = (payload ?? {}) as Record<string, unknown>;
        const mac = ensureHex(body.mac, 'mac');
        const keyLabel = normalizeKeyLabel(body.keyLabel, 'ZAK_002');
        const method = typeof body.method === 'string' ? body.method.toUpperCase() : 'ALG3';

        const generated = await this.macGenerator.execute({
            data: body.data,
            keyLabel,
            method,
            inputEncoding: body.inputEncoding,
        }) as { mac?: string; trace?: string[] };

        if (!generated.mac) {
            throw new ValidationError('Unable to generate comparison MAC');
        }

        const computed = generated.mac.toUpperCase();
        const received = mac.toUpperCase();
        const verified = await this.timingVulnerableVerifyMac(received, computed);

        return {
            command_code: 'C2',
            verified,
            mac,
            calculated_mac: computed,
            keyLabel,
            method,
            trace: [
                ...(generated.trace ?? []),
                `Compare provided MAC (${received.length} hex chars)`,
                `Verification result: ${verified ? 'MATCH' : 'MISMATCH'}`,
            ],
        };
    }

    private async timingVulnerableVerifyMac(submitted: string, actual: string): Promise<boolean> {
        const normalizedSubmitted = submitted.padEnd(actual.length, '0').slice(0, actual.length);
        const submittedBytes = Buffer.from(normalizedSubmitted, 'hex');
        const actualBytes = Buffer.from(actual, 'hex');

        for (let i = 0; i < actualBytes.length; i += 1) {
            if (submittedBytes[i] !== actualBytes[i]) {
                return false;
            }
            await new Promise((resolve) => setTimeout(resolve, 5));
        }

        return true;
    }
}
