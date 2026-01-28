import dotenv from 'dotenv';
dotenv.config();

export const config = {
    port: parseInt(process.env.GATEWAY_PORT || '8000'),
    nodeEnv: process.env.NODE_ENV || 'development',

    jwt: {
        secret: process.env.JWT_SECRET || 'pmp-dev-secret-change-in-production',
        expiresIn: process.env.JWT_EXPIRES_IN || '24h'
    },

    rateLimit: {
        windowMs: 60 * 1000, // 1 minute
        max: parseInt(process.env.RATE_LIMIT_MAX || '100') // 100 requests per minute
    },

    services: {
        simCardService: process.env.SIM_CARD_SERVICE_URL || 'http://localhost:8001',
        simPosService: process.env.SIM_POS_SERVICE_URL || 'http://localhost:8002',
        simAcquirerService: process.env.SIM_ACQUIRER_SERVICE_URL || 'http://localhost:8003',
        simNetworkSwitch: process.env.SIM_NETWORK_SWITCH_URL || 'http://localhost:8004',
        simIssuerService: process.env.SIM_ISSUER_SERVICE_URL || 'http://localhost:8005',
        simAuthEngine: process.env.SIM_AUTH_ENGINE_URL || 'http://localhost:8006',
        simFraudDetection: process.env.SIM_FRAUD_DETECTION_URL || 'http://localhost:8007',
        cryptoService: process.env.CRYPTO_SERVICE_URL || 'http://localhost:8010',
        hsmSimulator: process.env.HSM_SIMULATOR_URL || 'http://localhost:8011',
        keyManagement: process.env.KEY_MANAGEMENT_URL || 'http://localhost:8012'
    },

    circuitBreaker: {
        timeout: 5000,
        errorThresholdPercentage: 50,
        resetTimeout: 30000
    },

    cors: {
        origin: process.env.CORS_ORIGIN || '*',
        credentials: true
    }
};
