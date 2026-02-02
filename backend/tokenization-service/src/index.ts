/**
 * Tokenization Service Main Entry Point
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { TokenVault } from './services/tokenVault';
import { TokenController } from './controllers/token.controller';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8014;
const REDIS_URL = process.env.REDIS_URL || 'redis://redis:6379';

// Middleware
app.use(cors());
app.use(express.json());

// Initialize services
const vault = new TokenVault(REDIS_URL);
const controller = new TokenController(vault);

// Routes
app.post('/tokenize', controller.tokenize);
app.post('/detokenize', controller.detokenize);
app.post('/token/refresh', controller.refreshToken);
app.get('/token/:token/info', controller.getTokenInfo);

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'tokenization' });
});

// Start server
async function start() {
    try {
        await vault.connect();

        app.listen(PORT, () => {
            console.log(`🔐 Tokenization Service running on port ${PORT}`);
        });

        // Graceful shutdown
        process.on('SIGTERM', async () => {
            console.log('SIGTERM received, shutting down');
            await vault.disconnect();
            process.exit(0);
        });
    } catch (error) {
        console.error('Failed to start service:', error);
        process.exit(1);
    }
}

start();
