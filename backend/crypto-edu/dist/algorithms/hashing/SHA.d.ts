import { TraceResult } from '../../types';
export declare class SHA {
    hash(data: Buffer, algorithm?: 'sha1' | 'sha256'): TraceResult<Buffer>;
}
