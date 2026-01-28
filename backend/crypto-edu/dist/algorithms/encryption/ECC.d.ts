import { TraceResult } from '../../types';
export declare class ECCManager {
    generateKeyPair(): TraceResult<{
        publicKey: string;
        privateKey: string;
    }>;
}
