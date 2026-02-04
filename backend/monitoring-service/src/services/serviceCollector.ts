/**
 * Service health/log collector.
 * Polls service health endpoints, updates Prometheus gauges,
 * and persists snapshots in Elasticsearch.
 */

import { ElasticsearchService } from './elasticsearch.js';
import { metrics } from './prometheus.js';

interface ServiceTarget {
    name: string;
    url: string;
}

export interface ServiceSnapshot {
    service: string;
    status: 'up' | 'degraded' | 'down';
    endpoint: string;
    httpStatus: number | null;
    latencyMs: number;
    checkedAt: string;
    error?: string;
}

const DEFAULT_TARGETS: ServiceTarget[] = [
    { name: 'api-gateway', url: 'http://api-gateway:8000/health' },
    { name: 'sim-card-service', url: 'http://sim-card-service:8001/health' },
    { name: 'sim-pos-service', url: 'http://sim-pos-service:8002/health' },
    { name: 'sim-acquirer-service', url: 'http://sim-acquirer-service:8003/health' },
    { name: 'sim-network-switch', url: 'http://sim-network-switch:8004/health/live' },
    { name: 'sim-issuer-service', url: 'http://sim-issuer-service:8005/health' },
    { name: 'sim-auth-engine', url: 'http://sim-auth-engine:8006/health/live' },
    { name: 'sim-fraud-detection', url: 'http://sim-fraud-detection:8007/health' },
    { name: 'crypto-service', url: 'http://crypto-service:8010/health' },
    { name: 'hsm-simulator', url: 'http://hsm-simulator:8011/health' },
    { name: 'key-management', url: 'http://key-management:8012/health' },
    { name: 'acs-simulator', url: 'http://acs-simulator:8013/health' },
    { name: 'tokenization-service', url: 'http://tokenization-service:8014/health' },
    { name: 'directory-server', url: 'http://directory-server:8015/health' },
    { name: 'sim-monitoring-service', url: 'http://localhost:3005/health' },
    { name: 'monitoring-dashboard', url: 'http://monitoring-dashboard:3000' },
    { name: 'elasticsearch', url: 'http://elasticsearch:9200/_cluster/health' },
    { name: 'kibana', url: 'http://kibana:5601/api/status' },
    { name: 'prometheus', url: 'http://prometheus:9090/-/healthy' },
    { name: 'grafana', url: 'http://grafana:3000/api/health' }
];

function parseTargetsFromEnv(raw: string | undefined): ServiceTarget[] {
    if (!raw || !raw.trim()) {
        return DEFAULT_TARGETS;
    }

    const parsed = raw
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
        .map((entry) => {
            const [name, url] = entry.split('=');
            return {
                name: (name || '').trim(),
                url: (url || '').trim()
            };
        })
        .filter((x) => x.name && x.url);

    return parsed.length > 0 ? parsed : DEFAULT_TARGETS;
}

export class ServiceCollector {
    private timer?: NodeJS.Timeout;
    private readonly snapshots = new Map<string, ServiceSnapshot>();
    private readonly targets: ServiceTarget[];
    private readonly pollIntervalMs: number;
    private running = false;

    constructor(private readonly elasticsearchService: ElasticsearchService) {
        this.targets = parseTargetsFromEnv(process.env.SERVICE_HEALTH_TARGETS);
        this.pollIntervalMs = parseInt(process.env.SERVICE_HEALTH_POLL_MS || '15000', 10);
    }

    start(): void {
        if (this.running) return;

        this.running = true;
        this.pollAll();
        this.timer = setInterval(() => {
            this.pollAll();
        }, this.pollIntervalMs);
    }

    stop(): void {
        this.running = false;
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = undefined;
        }
    }

    isRunning(): boolean {
        return this.running;
    }

    getLatestSnapshots(): ServiceSnapshot[] {
        return Array.from(this.snapshots.values()).sort((a, b) =>
            a.service.localeCompare(b.service)
        );
    }

    private async pollAll(): Promise<void> {
        await Promise.all(
            this.targets.map(async (target) => {
                await this.pollOne(target);
            })
        );
    }

    private async pollOne(target: ServiceTarget): Promise<void> {
        const started = Date.now();
        let httpStatus: number | null = null;
        let status: ServiceSnapshot['status'] = 'down';
        let error: string | undefined;

        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 5000);
            const response = await fetch(target.url, { signal: controller.signal });
            clearTimeout(timeout);

            httpStatus = response.status;
            status = response.ok ? 'up' : 'degraded';
        } catch (err: any) {
            error = err?.message || 'request failed';
            status = 'down';
        }

        const latencyMs = Date.now() - started;
        const snapshot: ServiceSnapshot = {
            service: target.name,
            status,
            endpoint: target.url,
            httpStatus,
            latencyMs,
            checkedAt: new Date().toISOString(),
            error
        };

        this.snapshots.set(target.name, snapshot);

        metrics.serviceUp.labels(target.name).set(status === 'up' ? 1 : 0);
        metrics.serviceLatencyMs.labels(target.name).set(latencyMs);

        // Persist as time-series service log snapshot
        await this.elasticsearchService.index({
            id: `${target.name}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            index: 'pmp-service-logs',
            body: {
                '@timestamp': snapshot.checkedAt,
                service: snapshot.service,
                status: snapshot.status,
                endpoint: snapshot.endpoint,
                httpStatus: snapshot.httpStatus,
                latencyMs: snapshot.latencyMs,
                error: snapshot.error || null
            }
        });
    }
}

