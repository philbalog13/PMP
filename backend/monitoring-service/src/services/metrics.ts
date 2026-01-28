/**
 * Service de métriques pour le monitoring
 */

interface MetricPoint {
    timestamp: Date;
    value: number;
    labels?: Record<string, string>;
}

interface ServiceStatus {
    name: string;
    status: 'up' | 'down' | 'degraded';
    latency: number;
    lastCheck: Date;
}

interface FraudMetrics {
    type: string;
    count: number;
    severity: 'low' | 'medium' | 'high' | 'critical';
}

export class MetricsService {
    private transactionMetrics: MetricPoint[] = [];
    private latencyMetrics: MetricPoint[] = [];
    private serviceStatuses: Map<string, ServiceStatus> = new Map();
    private fraudMetrics: FraudMetrics[] = [];
    private maxDataPoints = 1000;

    constructor() {
        this.initializeServices();
        this.startMetricsCollection();
    }

    private initializeServices(): void {
        const services = ['auth-engine', 'hsm-simulator', 'switch', 'gateway', 'database'];

        for (const name of services) {
            this.serviceStatuses.set(name, {
                name,
                status: 'up',
                latency: Math.floor(Math.random() * 50) + 20,
                lastCheck: new Date()
            });
        }
    }

    private startMetricsCollection(): void {
        // Collecter des métriques toutes les secondes
        setInterval(() => {
            this.collectTransactionMetrics();
            this.collectLatencyMetrics();
            this.updateServiceStatuses();
        }, 1000);

        // Collecter des métriques de fraude toutes les 10 secondes
        setInterval(() => {
            this.collectFraudMetrics();
        }, 10000);
    }

    private collectTransactionMetrics(): void {
        const point: MetricPoint = {
            timestamp: new Date(),
            value: Math.floor(Math.random() * 100) + 50
        };

        this.transactionMetrics.push(point);
        this.pruneMetrics(this.transactionMetrics);
    }

    private collectLatencyMetrics(): void {
        const services = ['auth-engine', 'hsm-simulator', 'switch'];

        for (const service of services) {
            const point: MetricPoint = {
                timestamp: new Date(),
                value: Math.floor(Math.random() * 100) + 30,
                labels: { service }
            };
            this.latencyMetrics.push(point);
        }

        this.pruneMetrics(this.latencyMetrics);
    }

    private updateServiceStatuses(): void {
        for (const [name, status] of this.serviceStatuses.entries()) {
            // Simuler des changements d'état occasionnels
            if (Math.random() < 0.01) {
                status.status = Math.random() < 0.5 ? 'degraded' : 'up';
            }

            status.latency = Math.floor(Math.random() * 50) + 20;
            status.lastCheck = new Date();
        }
    }

    private collectFraudMetrics(): void {
        const fraudTypes = [
            { type: 'mitm', severity: 'critical' as const },
            { type: 'replay', severity: 'high' as const },
            { type: 'pan_harvest', severity: 'critical' as const },
            { type: 'brute_force', severity: 'medium' as const },
            { type: 'dos', severity: 'high' as const },
            { type: 'injection', severity: 'medium' as const },
            { type: 'auth_bypass', severity: 'high' as const }
        ];

        this.fraudMetrics = fraudTypes.map(ft => ({
            ...ft,
            count: Math.floor(Math.random() * 50)
        }));
    }

    private pruneMetrics(metrics: MetricPoint[]): void {
        if (metrics.length > this.maxDataPoints) {
            metrics.splice(0, metrics.length - this.maxDataPoints);
        }
    }

    // API publique

    getTransactionStats(periodMinutes: number = 60): object {
        const cutoff = new Date(Date.now() - periodMinutes * 60000);
        const recent = this.transactionMetrics.filter(m => m.timestamp > cutoff);

        if (recent.length === 0) {
            return { total: 0, avg: 0, min: 0, max: 0 };
        }

        const values = recent.map(m => m.value);
        return {
            total: values.reduce((a, b) => a + b, 0),
            avg: values.reduce((a, b) => a + b, 0) / values.length,
            min: Math.min(...values),
            max: Math.max(...values),
            dataPoints: values.length
        };
    }

    getLatencyStats(service?: string): object {
        let metrics = this.latencyMetrics;

        if (service) {
            metrics = metrics.filter(m => m.labels?.service === service);
        }

        if (metrics.length === 0) {
            return { avg: 0, p50: 0, p95: 0, p99: 0 };
        }

        const values = metrics.map(m => m.value).sort((a, b) => a - b);
        const avg = values.reduce((a, b) => a + b, 0) / values.length;

        return {
            avg,
            p50: values[Math.floor(values.length * 0.5)],
            p95: values[Math.floor(values.length * 0.95)],
            p99: values[Math.floor(values.length * 0.99)]
        };
    }

    getServiceStatuses(): ServiceStatus[] {
        return Array.from(this.serviceStatuses.values());
    }

    getFraudMetrics(): FraudMetrics[] {
        return this.fraudMetrics;
    }

    getResponseCodeDistribution(): object {
        // Distribution simulée des codes réponse
        return {
            '00': { count: 850, label: 'Approved', color: '#22c55e' },
            '05': { count: 75, label: 'Do Not Honor', color: '#ef4444' },
            '51': { count: 50, label: 'Insufficient Funds', color: '#f59e0b' },
            '14': { count: 15, label: 'Invalid Card', color: '#ef4444' },
            '54': { count: 10, label: 'Expired Card', color: '#f59e0b' },
            '41': { count: 8, label: 'Lost Card', color: '#dc2626' },
            '43': { count: 5, label: 'Stolen Card', color: '#dc2626' },
            '12': { count: 3, label: 'Invalid Transaction', color: '#6b7280' }
        };
    }

    getSuccessRate(): object {
        const distribution = this.getResponseCodeDistribution() as Record<string, { count: number }>;
        const total = Object.values(distribution).reduce((sum, d) => sum + d.count, 0);
        const success = distribution['00']?.count || 0;

        return {
            successRate: total > 0 ? (success / total) * 100 : 0,
            failureRate: total > 0 ? ((total - success) / total) * 100 : 0,
            total,
            success,
            failure: total - success
        };
    }

    getDashboardData(): object {
        return {
            timestamp: new Date().toISOString(),
            transactions: this.getTransactionStats(5),
            latency: {
                overall: this.getLatencyStats(),
                byService: {
                    'auth-engine': this.getLatencyStats('auth-engine'),
                    'hsm-simulator': this.getLatencyStats('hsm-simulator'),
                    'switch': this.getLatencyStats('switch')
                }
            },
            services: this.getServiceStatuses(),
            responseCodes: this.getResponseCodeDistribution(),
            successRate: this.getSuccessRate(),
            fraud: this.getFraudMetrics()
        };
    }
}
