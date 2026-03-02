/**
 * PMP Monitoring Service
 * Backend avec WebSockets, Prometheus et API REST
 */

import express from 'express';
import cors from 'cors';
import { createServer as createHttpServer } from 'http';
import https from 'https';
import { WebSocketServer } from './websocket/server.js';
import { ElasticsearchService } from './services/elasticsearch.js';
import { MetricsService } from './services/metrics.js';
import { ServiceCollector } from './services/serviceCollector.js';
import { register } from './services/prometheus.js';
import transactionsRouter from './routes/transactions.js';
import analyticsRouter from './routes/analytics.js';
import debugRouter from './routes/debug.js';
import logsRouter from './routes/logs.js';
import { bootstrapMTLS, createMTLSServer } from './utils/mtls.helper.js';

const app = express();
const PORT = process.env.PORT || 4000;
const KEY_MANAGEMENT_URL = process.env.KEY_MANAGEMENT_URL || 'http://localhost:8012';
const MTLS_ENABLED = process.env.MTLS_ENABLED === 'true';
const SERVICE_NAME = 'monitoring-service';

// Middleware
app.use(cors());
app.use(express.json());

// Services
export const elasticsearchService = new ElasticsearchService();
export const metricsService = new MetricsService();
export const serviceCollector = new ServiceCollector(elasticsearchService);

// Routes API REST
app.use('/api/transactions', transactionsRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/debug', debugRouter);
app.use('/api/logs', logsRouter);

// Endpoint Prometheus Metrics
app.get('/metrics', async (req, res) => {
    try {
        res.set('Content-Type', register.contentType);
        res.end(await register.metrics());
    } catch (ex) {
        res.status(500).end(ex);
    }
});

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        services: {
            elasticsearch: elasticsearchService.isConnected(),
            websocket: wsServer?.isRunning() ?? false,
            collector: serviceCollector.isRunning()
        }
    });
});

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        name: 'PMP Monitoring Service',
        version: '1.1.0',
        endpoints: {
            api: '/api',
            metrics: '/metrics',
            websocket: `ws://localhost:${PORT}/ws`,
            health: '/health'
        }
    });
});

let server: https.Server | ReturnType<typeof createHttpServer>;
let wsServer: InstanceType<typeof WebSocketServer>;

async function start() {
    if (MTLS_ENABLED) {
        try {
            const ctx = await bootstrapMTLS(SERVICE_NAME, KEY_MANAGEMENT_URL);
            server = createMTLSServer(app, Number(PORT), ctx);
            wsServer = new WebSocketServer(server);
            serviceCollector.start();
            console.log(`📊 PMP Monitoring Service (🔒 mTLS) on port ${PORT}`);
            return;
        } catch (err: any) {
            console.error(`[mTLS] ${err.message} — falling back to HTTP`);
        }
    }

    // HTTP fallback
    server = createHttpServer(app);
    wsServer = new WebSocketServer(server);
    server.listen(PORT, () => {
        serviceCollector.start();
        console.log('═'.repeat(60));
        console.log('  📊 PMP MONITORING SERVICE v1.1');
        console.log('═'.repeat(60));
        console.log(`
  🌐 HTTP API:    http://localhost:${PORT}
  📈 Prometheus:  http://localhost:${PORT}/metrics
  🔌 WebSocket:   ws://localhost:${PORT}/ws

  📡 Endpoints:
    - GET  /api/transactions
    - GET  /api/analytics
    - GET  /api/debug/trace/:id
`);
        console.log('═'.repeat(60));
    });
}

start().catch(console.error);

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('\n🛑 Arrêt gracieux...');
    serviceCollector.stop();
    wsServer?.close();
    server.close(() => {
        console.log('✅ Serveur arrêté');
        process.exit(0);
    });
});

export { server, wsServer };
