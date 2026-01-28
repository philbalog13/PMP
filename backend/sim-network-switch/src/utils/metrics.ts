/**
 * Prometheus Metrics
 * Application monitoring and observability
 */
import client, { Registry, Counter, Histogram, Gauge } from 'prom-client';
import { config } from '../config';

// Create a custom registry
export const metricsRegistry = new Registry();

// Set default labels
metricsRegistry.setDefaultLabels({
    service: 'sim-network-switch',
    env: config.env,
});

// Collect default metrics
if (config.metrics.enabled) {
    client.collectDefaultMetrics({ register: metricsRegistry });
}

// ==========================================
// Custom Metrics
// ==========================================

// HTTP Request Counter
export const httpRequestsTotal = new Counter({
    name: `${config.metrics.prefix}_http_requests_total`,
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'path', 'status_code'],
    registers: [metricsRegistry],
});

// HTTP Request Duration Histogram
export const httpRequestDuration = new Histogram({
    name: `${config.metrics.prefix}_http_request_duration_seconds`,
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'path', 'status_code'],
    buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
    registers: [metricsRegistry],
});

// Transaction Counter
export const transactionsTotal = new Counter({
    name: `${config.metrics.prefix}_transactions_total`,
    help: 'Total number of transactions processed',
    labelNames: ['network', 'status', 'response_code'],
    registers: [metricsRegistry],
});

// Transaction Duration Histogram
export const transactionDuration = new Histogram({
    name: `${config.metrics.prefix}_transaction_duration_seconds`,
    help: 'Duration of transaction processing in seconds',
    labelNames: ['network', 'status'],
    buckets: [0.05, 0.1, 0.25, 0.5, 1, 2, 5],
    registers: [metricsRegistry],
});

// Routing Decisions Counter
export const routingDecisions = new Counter({
    name: `${config.metrics.prefix}_routing_decisions_total`,
    help: 'Total number of routing decisions made',
    labelNames: ['network', 'issuer', 'success'],
    registers: [metricsRegistry],
});

// Circuit Breaker State Gauge
export const circuitBreakerState = new Gauge({
    name: `${config.metrics.prefix}_circuit_breaker_state`,
    help: 'Circuit breaker state (0=closed, 1=open, 2=half-open)',
    labelNames: ['service'],
    registers: [metricsRegistry],
});

// Active Connections Gauge
export const activeConnections = new Gauge({
    name: `${config.metrics.prefix}_active_connections`,
    help: 'Number of active connections',
    registers: [metricsRegistry],
});

// Retry Counter
export const retryAttempts = new Counter({
    name: `${config.metrics.prefix}_retry_attempts_total`,
    help: 'Total number of retry attempts',
    labelNames: ['service', 'success'],
    registers: [metricsRegistry],
});

// Error Counter
export const errorsTotal = new Counter({
    name: `${config.metrics.prefix}_errors_total`,
    help: 'Total number of errors',
    labelNames: ['type', 'code'],
    registers: [metricsRegistry],
});

// ==========================================
// Metrics Helper Functions
// ==========================================

export const recordHttpRequest = (
    method: string,
    path: string,
    statusCode: number,
    durationMs: number
) => {
    httpRequestsTotal.inc({ method, path, status_code: statusCode.toString() });
    httpRequestDuration.observe(
        { method, path, status_code: statusCode.toString() },
        durationMs / 1000
    );
};

export const recordTransaction = (
    network: string,
    status: string,
    responseCode: string,
    durationMs: number
) => {
    transactionsTotal.inc({ network, status, response_code: responseCode });
    transactionDuration.observe({ network, status }, durationMs / 1000);
};

export const recordRoutingDecision = (
    network: string,
    issuer: string,
    success: boolean
) => {
    routingDecisions.inc({ network, issuer, success: success.toString() });
};

export const updateCircuitBreakerState = (
    service: string,
    state: 'closed' | 'open' | 'half-open'
) => {
    const stateValue = { closed: 0, open: 1, 'half-open': 2 }[state];
    circuitBreakerState.set({ service }, stateValue);
};

export const recordError = (type: string, code: string) => {
    errorsTotal.inc({ type, code });
};

// Get metrics as string (for /metrics endpoint)
export const getMetrics = async (): Promise<string> => {
    return metricsRegistry.metrics();
};

export default metricsRegistry;
