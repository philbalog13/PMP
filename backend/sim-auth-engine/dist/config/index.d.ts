export declare const config: {
    env: string;
    isProduction: boolean;
    isDevelopment: boolean;
    isTest: boolean;
    server: {
        port: number;
        host: string;
    };
    logging: {
        level: string;
        format: string;
    };
    limits: {
        dailyLimit: number;
        singleTxnLimit: number;
        highRiskThreshold: number;
        require3dsAbove: number;
    };
    metrics: {
        enabled: boolean;
        prefix: string;
    };
    timeout: number;
};
export default config;
//# sourceMappingURL=index.d.ts.map