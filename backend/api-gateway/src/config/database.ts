import { Pool } from 'pg';
import dotenv from 'dotenv';
import { logger } from '../utils/logger';

dotenv.config();

// Use DATABASE_URL from environment or fallback to default
const connectionString = process.env.DATABASE_URL || 'postgresql://pmp_user:pmp_secure_pass_2024@localhost:5435/pmp_db';

const pool = new Pool({
    connectionString,
});

pool.on('error', (err) => {
    logger.error('Unexpected error on idle client', err);
    process.exit(-1);
});

export const query = async (text: string, params?: any[]) => {
    const start = Date.now();
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    logger.debug('executed query', { text, duration, rows: res.rowCount });
    return res;
};
