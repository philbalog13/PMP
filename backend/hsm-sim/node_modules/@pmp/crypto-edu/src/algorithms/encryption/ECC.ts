import { TraceResult, TraceStep } from '../../types';
import crypto from 'node:crypto';

export class ECCManager {
    generateKeyPair(): TraceResult<{ publicKey: string, privateKey: string }> {
        const steps: TraceStep[] = [];

        const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', {
            namedCurve: 'secp256k1',
            publicKeyEncoding: { type: 'spki', format: 'pem' },
            privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
        });

        steps.push({
            name: 'ECC KeyPair',
            description: 'Generate SECP256K1 Key Pair',
            input: 'Curve: secp256k1',
            output: 'Keys Generated'
        });

        return { result: { publicKey, privateKey }, steps };
    }
}
