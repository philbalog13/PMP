import dotenv from 'dotenv';
dotenv.config();

export const config = {
    port: parseInt(process.env.PORT || '8016'),
    nodeEnv: process.env.NODE_ENV || 'development',
    databaseUrl: process.env.DATABASE_URL || '',
    keyManagementUrl: process.env.KEY_MANAGEMENT_URL || 'http://localhost:8012',
    mtlsEnabled: process.env.MTLS_ENABLED === 'true',
};
