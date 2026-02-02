import dotenv from 'dotenv';
dotenv.config();

// ========================================
// SECURITY VALIDATION
// ========================================
// CRITICAL: Validate JWT_SECRET at startup
if (!process.env.JWT_SECRET) {
    throw new Error(
        'FATAL: JWT_SECRET environment variable is required. ' +
        'Generate one with: openssl rand -base64 64'
    );
}

if (process.env.JWT_SECRET.length < 32) {
    throw new Error(
        'FATAL: JWT_SECRET must be at least 32 characters. ' +
        'Current length: ' + process.env.JWT_SECRET.length
    );
}

// Warn about weak development secrets in production
if (process.env.NODE_ENV === 'production') {
    const weakSecrets = ['dev', 'test', 'demo', 'change', 'example', 'secret'];
    const secretLower = process.env.JWT_SECRET.toLowerCase();

    if (weakSecrets.some(weak => secretLower.includes(weak))) {
        throw new Error(
            'FATAL: JWT_SECRET appears to be a development/test secret. ' +
            'Use a strong, randomly generated secret in production.'
        );
    }
}

export const config = {
    port: parseInt(process.env.GATEWAY_PORT || '8000'),
    nodeEnv: process.env.NODE_ENV || 'development',

    jwt: {
        secret: process.env.JWT_SECRET, // NO FALLBACK - Validated above
        expiresIn: process.env.JWT_EXPIRES_IN || '2h' // Changed from 24h
    },

    // Bcrypt security settings
    bcrypt: {
        saltRounds: 12 // Increased from 10 to 12 for better security
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
        // SECURITY: Strict origin whitelist (no wildcard)
        // Set CORS_ORIGIN in .env as comma-separated list: http://localhost:3000,http://localhost:5173
        origin: process.env.CORS_ORIGIN?.split(',').map(o => o.trim()) || [
            'http://localhost:3000',
            'http://localhost:5173'
        ],
        credentials: true,
        maxAge: 600 // Cache preflight for 10 minutes
    }
};
