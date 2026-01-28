import { TraceResult } from '../../types';
export declare class HMAC {
    generate(data: Buffer, key: Buffer, algorithm?: 'sha256' | 'sha1'): TraceResult<Buffer>;
}
