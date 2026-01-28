import dotenv from 'dotenv';
dotenv.config();

export const config = {
    port: parseInt(process.env.CARD_SERVICE_PORT || '8001'),
    nodeEnv: process.env.NODE_ENV || 'development',

    database: {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        database: process.env.DB_NAME || 'pmp_cards',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres'
    },

    cardDefaults: {
        expiryYears: 3,
        cvvLength: 3
    },

    bins: {
        'VISA': ['4539', '4556', '4916', '4532', '4929'],
        'MASTERCARD': ['5425', '5399', '5100', '5200', '5300'],
        'AMEX': ['3782', '3487', '3714', '3787', '3400'],
        'DISCOVER': ['6011', '6500', '6221']
    }
};
