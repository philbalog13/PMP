import dotenv from 'dotenv';
dotenv.config();

export const config = {
    port: parseInt(process.env.KEY_MGMT_PORT || '8012'),
    nodeEnv: process.env.NODE_ENV || 'development',

    keyTypes: ['ZMK', 'TMK', 'ZPK', 'PVK', 'CVK', 'KEK', 'DEK', 'MAC']
};
