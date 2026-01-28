import dotenv from 'dotenv';
dotenv.config();

export const config = {
    port: parseInt(process.env.CRYPTO_SERVICE_PORT || '8010'),
    nodeEnv: process.env.NODE_ENV || 'development',

    defaultAlgorithm: 'aes-256-cbc',

    testKeys: {
        aes: '0123456789ABCDEF0123456789ABCDEF',
        des: '0123456789ABCDEF',
        tdes: '0123456789ABCDEF0123456789ABCDEF01234567'
    }
};
