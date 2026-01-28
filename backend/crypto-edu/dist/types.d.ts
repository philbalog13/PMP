export interface TraceStep {
    name: string;
    description: string;
    input: string;
    output: string;
    metadata?: Record<string, any>;
}
export interface TraceResult<T> {
    result: T;
    steps: TraceStep[];
}
export type KeyType = 'DES' | 'TDES' | 'AES' | 'RSA';
export interface Key {
    value: Buffer;
    type: KeyType;
    checkValue?: string;
}
