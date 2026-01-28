import { TraceResult, TraceStep } from '../../types';
import crypto from 'node:crypto';

export class SHA {
    hash(data: Buffer, algorithm: 'sha1' | 'sha256' = 'sha256'): TraceResult<Buffer> {
        const steps: TraceStep[] = [];

        const hash = crypto.createHash(algorithm);
        hash.update(data);
        const result = hash.digest();

        steps.push({
            name: `${algorithm.toUpperCase()} Hash`,
            description: `Calculate ${algorithm} hash`,
            input: data.toString('hex'),
            output: result.toString('hex')
        });

        return { result, steps };
    }
}
