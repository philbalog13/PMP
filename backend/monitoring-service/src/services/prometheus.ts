/**
 * Service de métriques Prometheus
 */

import client from 'prom-client';

// Créer un registre par défaut
const register = new client.Registry();

// Ajouter les métriques par défaut (CPU, mémoire, etc.)
client.collectDefaultMetrics({ register, prefix: 'pmp_' });

// Métriques personnalisées
export const metrics = {
    // Transactions
    transactionTotal: new client.Counter({
        name: 'pmp_transaction_total',
        help: 'Total number of transactions processed',
        labelNames: ['status', 'type', 'currency'],
        registers: [register]
    }),

    transactionDuration: new client.Histogram({
        name: 'pmp_transaction_duration_seconds',
        help: 'Transaction processing duration in seconds',
        labelNames: ['service'],
        buckets: [0.1, 0.5, 1, 2, 5],
        registers: [register]
    }),

    // Pédagogique
    studentProgression: new client.Gauge({
        name: 'pmp_student_progression_percentage',
        help: 'Current progression percentage per student',
        labelNames: ['student_id', 'workshop'],
        registers: [register]
    }),

    cryptoOperations: new client.Counter({
        name: 'pmp_crypto_operations_total',
        help: 'Total cryptographic operations performed',
        labelNames: ['operation', 'status'],
        registers: [register]
    }),

    // Sécurité
    attacksDetected: new client.Counter({
        name: 'pmp_security_attacks_detected_total',
        help: 'Total number of security attacks detected',
        labelNames: ['attack_type', 'severity'],
        registers: [register]
    }),

    defenseEffectiveness: new client.Gauge({
        name: 'pmp_defense_effectiveness_ratio',
        help: 'Ratio of blocked attacks vs total attacks',
        labelNames: ['defense_mechanism'],
        registers: [register]
    }),

    serviceUp: new client.Gauge({
        name: 'pmp_service_up',
        help: 'Service health status (1=up, 0=down/degraded)',
        labelNames: ['service'],
        registers: [register]
    }),

    serviceLatencyMs: new client.Gauge({
        name: 'pmp_service_latency_ms',
        help: 'Last measured health endpoint latency in milliseconds',
        labelNames: ['service'],
        registers: [register]
    })
};

export { register };
