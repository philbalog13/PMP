import dotenv from 'dotenv';
dotenv.config();

// Service URLs
export const config = {
    services: {
        gateway: process.env.GATEWAY_URL || 'http://localhost:8000',
        cards: process.env.CARD_SERVICE_URL || 'http://localhost:8001',
        pos: process.env.POS_SERVICE_URL || 'http://localhost:8002',
        acquirer: process.env.ACQUIRER_SERVICE_URL || 'http://localhost:8003',
        network: process.env.NETWORK_SWITCH_URL || 'http://localhost:8004',
        issuer: process.env.ISSUER_SERVICE_URL || 'http://localhost:8005',
        authEngine: process.env.AUTH_ENGINE_URL || 'http://localhost:8006',
        fraud: process.env.FRAUD_SERVICE_URL || 'http://localhost:8007',
        hsm: process.env.HSM_URL || 'http://localhost:8008',
        cryptoEdu: process.env.CRYPTO_EDU_URL || 'http://localhost:8009',
        crypto: process.env.CRYPTO_SERVICE_URL || 'http://localhost:8010',
        keyMgmt: process.env.KEY_MGMT_URL || 'http://localhost:8012'
    },
    timeout: 10000
};

// Test data - synchronized across all services
export const testData = {
    cards: {
        valid: {
            pan: '4111111111111111',
            cvv: '123',
            expiryMonth: 12,
            expiryYear: 2028,
            cardholderName: 'TEST VISA USER'
        },
        validMastercard: {
            pan: '5500000000000004',
            cvv: '456',
            expiryMonth: 6,
            expiryYear: 2027,
            cardholderName: 'TEST MASTERCARD USER'
        },
        blocked: {
            pan: '4000000000000002',
            cvv: '789',
            expiryMonth: 3,
            expiryYear: 2025
        },
        insufficientFunds: {
            pan: '4000000000000051',
            cvv: '321',
            expiryMonth: 12,
            expiryYear: 2028
        }
    },
    merchants: {
        valid: {
            id: 'MERCHANT001',
            name: 'Boutique Test Paris',
            mcc: '5411'
        }
    },
    accounts: {
        valid: {
            pan: '4111111111111111',
            balance: 5000,
            currency: 'EUR'
        }
    },
    transactions: {
        smallAmount: 25.00,
        mediumAmount: 150.00,
        largeAmount: 1500.00,
        currency: 'EUR'
    }
};

// Expected response codes
export const responseCodes = {
    approved: '00',
    insufficientFunds: '51',
    expiredCard: '54',
    blockedCard: '62',
    invalidCard: '14',
    systemError: '96',
    issuerUnavailable: '91',
    suspectedFraud: '59'
};
