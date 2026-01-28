import { TraceResult } from '../../types';
export interface TransactionData {
    amount: string;
    otherAmount: string;
    countryCode: string;
    currencyCode: string;
    date: string;
    type: string;
    unpredictableNumber: string;
    aic: string;
    atc: string;
}
export declare class EMVFormatter {
    private macManager;
    /**
     * Generates ARQC (Application Request Cryptogram)
     * Uses ISO 9797-1 MAC Algorithm 3 (Retail MAC) with Session Key
     * Data is concatenated from Transaction Data elements.
     */
    generateARQC(data: TransactionData, sessionKey: Buffer): TraceResult<Buffer>;
    generateARPC(arqc: Buffer, responseCode: string, key: Buffer): TraceResult<Buffer>;
}
