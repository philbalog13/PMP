/**
 * PMP Monitoring Service
 * Backend avec WebSockets pour le dashboard temps réel
 */

import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer } from './websocket/server.js';
import { ElasticsearchService } from './services/elasticsearch.js';
import { MetricsService } from './services/metrics.js';
import transactionsRouter from './routes/transactions.js';
import analyticsRouter from './routes/analytics.js';
import debugRouter from './routes/debug.js';

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(express.json());

// Services
export const elasticsearchService = new ElasticsearchService();
export const metricsService = new MetricsService();

// Routes API REST
app.use('/api/transactions', transactionsRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/debug', debugRouter);

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        services: {
            elasticsearch: elasticsearchService.isConnected(),
            websocket: wsServer?.isRunning() ?? false
        }
    });
});

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        name: 'PMP Monitoring Service',
        version: '1.0.0',
        endpoints: {
            api: '/api',
            websocket: `ws://localhost:${PORT}/ws`,
            health: '/health'
        }
    });
});

// Créer le serveur HTTP
const server = createServer(app);

// Initialiser WebSocket
const wsServer = new WebSocketServer(server);

// Démarrer le serveur
server.listen(PORT, () => {
    console.log('═'.repeat(60));
    console.log('  📊 PMP MONITORING SERVICE');
    console.log('═'.repeat(60));
    console.log(`
  🌐 HTTP API:    http://localhost:${PORT}
  🔌 WebSocket:   ws://localhost:${PORT}/ws
  📋 Health:      http://localhost:${PORT}/health
  
  📡 Endpoints:
    - GET  /api/transactions
    - GET  /api/analytics
    - GET  /api/debug/trace/:id
    - POST /api/debug/decode
`);
    console.log('═'.repeat(60));
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('\n🛑 Arrêt gracieux...');
    wsServer.close();
    server.close(() => {
        console.log('✅ Serveur arrêté');
        process.exit(0);
    });
});

export { server, wsServer };
