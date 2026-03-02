import dotenv from 'dotenv';
dotenv.config();

export const config = {
    port: parseInt(process.env.ACQUIRER_SERVICE_PORT || '8003'),
    nodeEnv: process.env.NODE_ENV || 'development',

    networkSwitch: {
        url: process.env.NETWORK_SWITCH_URL || 'http://localhost:8004',
        timeout: 10000
    },

    clearingEngine: {
        url: process.env.SIM_CLEARING_ENGINE_URL || 'http://localhost:8016'
    },

    keyManagementUrl: process.env.KEY_MANAGEMENT_URL || 'http://localhost:8012',
    mtlsEnabled: process.env.MTLS_ENABLED === 'true',

    acquirerId: process.env.ACQUIRER_ID || 'ACQ001'
};
