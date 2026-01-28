import dotenv from 'dotenv';
dotenv.config();

export const config = {
    port: parseInt(process.env.FRAUD_SERVICE_PORT || '8007'),
    nodeEnv: process.env.NODE_ENV || 'development',

    rules: {
        velocityWindow: 3600, // 1 hour in seconds
        maxTransactionsPerHour: 5,
        highAmountThreshold: 1000,
        suspiciousMccs: ['7995', '7994', '6211'], // Gambling, Betting, Securities
        blockedCountries: ['KP', 'IR', 'SY']
    },

    riskThresholds: {
        low: 30,
        medium: 50,
        high: 70,
        critical: 90
    }
};
