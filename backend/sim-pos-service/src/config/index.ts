import dotenv from 'dotenv';
dotenv.config();

export const config = {
    port: parseInt(process.env.POS_SERVICE_PORT || '8002'),
    nodeEnv: process.env.NODE_ENV || 'development',

    acquirerService: {
        url: process.env.ACQUIRER_SERVICE_URL || 'http://localhost:8003',
        timeout: 10000
    },

    merchantId: process.env.DEFAULT_MERCHANT_ID || 'MERCHANT001'
};
