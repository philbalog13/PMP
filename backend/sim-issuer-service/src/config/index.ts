import dotenv from 'dotenv';
dotenv.config();

export const config = {
    port: parseInt(process.env.ISSUER_SERVICE_PORT || '8005'),
    nodeEnv: process.env.NODE_ENV || 'development',

    authEngine: {
        url: process.env.AUTH_ENGINE_URL || 'http://localhost:8006',
        timeout: 5000
    },

    fraudDetection: {
        url: process.env.FRAUD_DETECTION_URL || 'http://localhost:8007',
        timeout: 3000
    },

    // HSM Simulator for cryptographic operations (PIN Block decryption, response signing)
    hsmSimulator: {
        url: process.env.HSM_SIMULATOR_URL || 'http://localhost:8009',
        timeout: 2000
    },

    issuerId: process.env.ISSUER_ID || 'ISS001'
};
