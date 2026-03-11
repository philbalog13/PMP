import dotenv from 'dotenv';
dotenv.config();

export const config = {
    port: parseInt(process.env.POS_SERVICE_PORT || '8002'),
    nodeEnv: process.env.NODE_ENV || 'development',

    acquirerService: {
        url: process.env.ACQUIRER_SERVICE_URL || 'http://localhost:8003',
        timeout: 10000
    },

    simClearingEngine: {
        url: process.env.SIM_CLEARING_ENGINE_URL || 'http://sim-clearing-engine:8016',
        timeout: 15000
    },

    tokenizationService: {
        url: process.env.TOKENIZATION_SERVICE_URL || 'http://localhost:8014',
        timeout: 2000
    },

    keyManagementUrl: process.env.KEY_MANAGEMENT_URL || 'http://localhost:8012',
    mtlsEnabled: process.env.MTLS_ENABLED === 'true',

    merchantId: process.env.DEFAULT_MERCHANT_ID || 'MERCHANT001'
};
