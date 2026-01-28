import { TraceResult } from '../../types';
export declare class ISO8583Formatter {
    parse(message: Buffer): TraceResult<Record<string, string>>;
}
