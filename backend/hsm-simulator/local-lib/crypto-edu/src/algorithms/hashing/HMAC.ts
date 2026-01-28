import { TraceResult, TraceStep } from '../../types';
import crypto from 'node:crypto';

export class HMAC {
    generate(data: Buffer, key: Buffer, algorithm: 'sha256' | 'sha1' = 'sha256'): TraceResult<Buffer> {
        const steps: TraceStep[] = [];

        const hmac = crypto.createHmac(algorithm, key);
        hmac.update(data);
        const result = hmac.digest();

        steps.push({
            name: `HMAC-${algorithm.toUpperCase()}`,
            description: `Generate HMAC using ${algorithm}`,
            input: `Key: ${key.toString('hex')}, Data: ${data.toString('hex')}`,
            output: result.toString('hex')
        });

        return { result, steps };
    }
}
