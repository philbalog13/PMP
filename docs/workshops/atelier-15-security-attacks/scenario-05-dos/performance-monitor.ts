/**
 * Scénario 5 : Performance Monitor
 * DÉTECTION : Surveillance des métriques de performance
 * 
 * Usage: npx ts-node performance-monitor.ts
 */

interface PerformanceMetrics {
    timestamp: Date;
    requestsPerSecond: number;
    avgLatency: number;
    p95Latency: number;
    p99Latency: number;
    errorRate: number;
    activeConnections: number;
    cpuUsage: number;
    memoryUsage: number;
    queueLength: number;
}

interface Alert {
    timestamp: Date;
    severity: 'INFO' | 'WARNING' | 'CRITICAL';
    type: string;
    message: string;
    metric: string;
    value: number;
    threshold: number;
}

interface MonitorConfig {
    thresholds: {
        maxLatencyP95: number;
        maxLatencyP99: number;
        maxErrorRate: number;
        maxQueueLength: number;
        maxCpuUsage: number;
        maxMemoryUsage: number;
        minRequestsPerSecond: number;
        maxRequestsPerSecond: number;
    };
    alertCooldown: number;
    sampleInterval: number;
}

const DEFAULT_CONFIG: MonitorConfig = {
    thresholds: {
        maxLatencyP95: 500,
        maxLatencyP99: 1000,
        maxErrorRate: 0.05,
        maxQueueLength: 100,
        maxCpuUsage: 0.8,
        maxMemoryUsage: 0.85,
        minRequestsPerSecond: 10,
        maxRequestsPerSecond: 5000
    },
    alertCooldown: 60000,
    sampleInterval: 1000
};

/**
 * Classe de monitoring de performance
 */
class PerformanceMonitor {
    private config: MonitorConfig;
    private metricsHistory: PerformanceMetrics[] = [];
    private alerts: Alert[] = [];
    private lastAlertTime: Map<string, number> = new Map();

    constructor(config: Partial<MonitorConfig> = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
    }

    /**
     * Enregistre de nouvelles métriques
     */
    recordMetrics(metrics: PerformanceMetrics): Alert[] {
        this.metricsHistory.push(metrics);

        // Limiter l'historique à 1 heure
        const oneHourAgo = Date.now() - 3600000;
        this.metricsHistory = this.metricsHistory.filter(
            m => m.timestamp.getTime() > oneHourAgo
        );

        // Analyser les métriques
        return this.analyzeMetrics(metrics);
    }

    /**
     * Analyse les métriques et génère des alertes
     */
    private analyzeMetrics(metrics: PerformanceMetrics): Alert[] {
        const newAlerts: Alert[] = [];
        const t = this.config.thresholds;

        // Vérifier la latence P95
        if (metrics.p95Latency > t.maxLatencyP95) {
            const alert = this.createAlert(
                metrics.p95Latency > t.maxLatencyP99 ? 'CRITICAL' : 'WARNING',
                'HIGH_LATENCY_P95',
                `Latence P95 élevée: ${metrics.p95Latency}ms`,
                'p95Latency',
                metrics.p95Latency,
                t.maxLatencyP95
            );
            if (alert) newAlerts.push(alert);
        }

        // Vérifier le taux d'erreur
        if (metrics.errorRate > t.maxErrorRate) {
            const alert = this.createAlert(
                metrics.errorRate > t.maxErrorRate * 2 ? 'CRITICAL' : 'WARNING',
                'HIGH_ERROR_RATE',
                `Taux d'erreur élevé: ${(metrics.errorRate * 100).toFixed(2)}%`,
                'errorRate',
                metrics.errorRate,
                t.maxErrorRate
            );
            if (alert) newAlerts.push(alert);
        }

        // Vérifier la queue
        if (metrics.queueLength > t.maxQueueLength) {
            const alert = this.createAlert(
                'WARNING',
                'QUEUE_BUILDUP',
                `File d'attente en croissance: ${metrics.queueLength}`,
                'queueLength',
                metrics.queueLength,
                t.maxQueueLength
            );
            if (alert) newAlerts.push(alert);
        }

        // Vérifier le CPU
        if (metrics.cpuUsage > t.maxCpuUsage) {
            const alert = this.createAlert(
                metrics.cpuUsage > 0.95 ? 'CRITICAL' : 'WARNING',
                'HIGH_CPU',
                `Utilisation CPU élevée: ${(metrics.cpuUsage * 100).toFixed(1)}%`,
                'cpuUsage',
                metrics.cpuUsage,
                t.maxCpuUsage
            );
            if (alert) newAlerts.push(alert);
        }

        // Détecter les patterns DoS
        const dosDetected = this.detectDoSPattern(metrics);
        if (dosDetected) {
            const alert = this.createAlert(
                'CRITICAL',
                'DOS_ATTACK_SUSPECTED',
                'Pattern d\'attaque DoS détecté!',
                'requestsPerSecond',
                metrics.requestsPerSecond,
                t.maxRequestsPerSecond
            );
            if (alert) newAlerts.push(alert);
        }

        this.alerts.push(...newAlerts);
        return newAlerts;
    }

    /**
     * Créé une alerte avec cooldown
     */
    private createAlert(
        severity: 'INFO' | 'WARNING' | 'CRITICAL',
        type: string,
        message: string,
        metric: string,
        value: number,
        threshold: number
    ): Alert | null {
        const lastAlert = this.lastAlertTime.get(type) || 0;

        if (Date.now() - lastAlert < this.config.alertCooldown) {
            return null;
        }

        this.lastAlertTime.set(type, Date.now());

        return {
            timestamp: new Date(),
            severity,
            type,
            message,
            metric,
            value,
            threshold
        };
    }

    /**
     * Détecte les patterns d'attaque DoS
     */
    private detectDoSPattern(current: PerformanceMetrics): boolean {
        if (this.metricsHistory.length < 5) return false;

        const recent = this.metricsHistory.slice(-5);

        // Pattern 1: Pic soudain de requêtes
        const avgRps = recent.reduce((s, m) => s + m.requestsPerSecond, 0) / recent.length;
        if (current.requestsPerSecond > avgRps * 5 &&
            current.requestsPerSecond > this.config.thresholds.maxRequestsPerSecond) {
            return true;
        }

        // Pattern 2: Dégradation progressive
        const latencyTrend = recent.map((m, i) => i > 0 ? m.p95Latency - recent[i - 1].p95Latency : 0);
        const consistentIncrease = latencyTrend.slice(1).every(d => d > 0);
        if (consistentIncrease && current.p95Latency > 2000) {
            return true;
        }

        // Pattern 3: Erreurs en cascade
        const errorTrend = recent.map(m => m.errorRate);
        if (errorTrend.every((e, i) => i === 0 || e > errorTrend[i - 1]) &&
            current.errorRate > 0.2) {
            return true;
        }

        return false;
    }

    /**
     * Obtient les statistiques agrégées
     */
    getStatistics(periodMs: number = 60000): object {
        const cutoff = Date.now() - periodMs;
        const recent = this.metricsHistory.filter(m => m.timestamp.getTime() > cutoff);

        if (recent.length === 0) {
            return { message: 'Pas de données disponibles' };
        }

        return {
            period: `${periodMs / 1000}s`,
            samples: recent.length,
            avgRequestsPerSecond: this.average(recent.map(m => m.requestsPerSecond)),
            avgLatency: this.average(recent.map(m => m.avgLatency)),
            avgP95Latency: this.average(recent.map(m => m.p95Latency)),
            avgErrorRate: this.average(recent.map(m => m.errorRate)),
            maxCpuUsage: Math.max(...recent.map(m => m.cpuUsage)),
            maxMemoryUsage: Math.max(...recent.map(m => m.memoryUsage)),
            alertsTriggered: this.alerts.filter(a => a.timestamp.getTime() > cutoff).length
        };
    }

    private average(arr: number[]): number {
        return arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
    }

    /**
     * Obtient toutes les alertes
     */
    getAlerts(): Alert[] {
        return this.alerts;
    }

    /**
     * Génère un rapport de santé
     */
    getHealthReport(): object {
        const stats = this.getStatistics(60000) as any;
        const recentAlerts = this.alerts.filter(
            a => a.timestamp.getTime() > Date.now() - 300000
        );

        const criticalCount = recentAlerts.filter(a => a.severity === 'CRITICAL').length;
        const warningCount = recentAlerts.filter(a => a.severity === 'WARNING').length;

        let status = 'HEALTHY';
        if (criticalCount > 0) status = 'CRITICAL';
        else if (warningCount > 2) status = 'DEGRADED';
        else if (warningCount > 0) status = 'WARNING';

        return {
            status,
            timestamp: new Date().toISOString(),
            statistics: stats,
            recentAlerts: recentAlerts.slice(-5),
            recommendations: this.getRecommendations(status, recentAlerts)
        };
    }

    private getRecommendations(status: string, alerts: Alert[]): string[] {
        const recs: string[] = [];

        if (alerts.some(a => a.type === 'DOS_ATTACK_SUSPECTED')) {
            recs.push('Activer le mode défensif (rate limiting strict)');
            recs.push('Identifier et bloquer les IPs sources');
        }

        if (alerts.some(a => a.type === 'HIGH_LATENCY_P95')) {
            recs.push('Augmenter les ressources du serveur');
            recs.push('Activer le circuit breaker');
        }

        if (alerts.some(a => a.type === 'HIGH_ERROR_RATE')) {
            recs.push('Vérifier les logs d\'erreur');
            recs.push('Redémarrer les services défaillants');
        }

        if (status === 'HEALTHY') {
            recs.push('Système nominal, continuer la surveillance');
        }

        return recs;
    }
}

/**
 * Démonstration du monitoring
 */
function demonstrateMonitoring(): void {
    console.log('═'.repeat(60));
    console.log('  📈 PERFORMANCE MONITOR - Scénario 5');
    console.log('═'.repeat(60));

    const monitor = new PerformanceMonitor();

    // Simuler des métriques normales
    console.log('\n📋 Phase 1: Trafic normal\n');
    for (let i = 0; i < 5; i++) {
        const metrics: PerformanceMetrics = {
            timestamp: new Date(),
            requestsPerSecond: 100 + Math.random() * 50,
            avgLatency: 50 + Math.random() * 30,
            p95Latency: 150 + Math.random() * 100,
            p99Latency: 300 + Math.random() * 150,
            errorRate: 0.001 + Math.random() * 0.005,
            activeConnections: 50 + Math.floor(Math.random() * 20),
            cpuUsage: 0.3 + Math.random() * 0.2,
            memoryUsage: 0.4 + Math.random() * 0.1,
            queueLength: Math.floor(Math.random() * 10)
        };

        const alerts = monitor.recordMetrics(metrics);
        console.log(`   Sample ${i + 1}: RPS=${metrics.requestsPerSecond.toFixed(0)}, P95=${metrics.p95Latency.toFixed(0)}ms, Errors=${(metrics.errorRate * 100).toFixed(2)}%`);
    }

    // Simuler une attaque DoS
    console.log('\n📋 Phase 2: Simulation d\'attaque DoS\n');
    for (let i = 0; i < 5; i++) {
        const loadFactor = 1 + i * 0.5;
        const metrics: PerformanceMetrics = {
            timestamp: new Date(),
            requestsPerSecond: 1000 * loadFactor,
            avgLatency: 100 * loadFactor,
            p95Latency: 500 * loadFactor,
            p99Latency: 1000 * loadFactor,
            errorRate: 0.01 + (i * 0.05),
            activeConnections: 200 + (i * 100),
            cpuUsage: 0.5 + (i * 0.1),
            memoryUsage: 0.6 + (i * 0.05),
            queueLength: 50 + (i * 50)
        };

        const alerts = monitor.recordMetrics(metrics);
        console.log(`   Sample ${i + 1}: RPS=${metrics.requestsPerSecond.toFixed(0)}, P95=${metrics.p95Latency.toFixed(0)}ms, Errors=${(metrics.errorRate * 100).toFixed(1)}%`);

        if (alerts.length > 0) {
            alerts.forEach(alert => {
                const icon = alert.severity === 'CRITICAL' ? '🔴' : '🟠';
                console.log(`     ${icon} [${alert.severity}] ${alert.type}: ${alert.message}`);
            });
        }
    }

    // Rapport de santé
    console.log('\n' + '═'.repeat(60));
    console.log('  📊 RAPPORT DE SANTÉ');
    console.log('═'.repeat(60));

    const report = monitor.getHealthReport() as any;
    console.log(`
   Status: ${report.status === 'CRITICAL' ? '🔴' : report.status === 'DEGRADED' ? '🟠' : '🟢'} ${report.status}
   
   Statistiques (dernière minute):
     Avg RPS: ${report.statistics.avgRequestsPerSecond?.toFixed(0) || 'N/A'}
     Avg Latence: ${report.statistics.avgLatency?.toFixed(0) || 'N/A'}ms
     Avg P95: ${report.statistics.avgP95Latency?.toFixed(0) || 'N/A'}ms
     Max CPU: ${((report.statistics.maxCpuUsage || 0) * 100).toFixed(1)}%
`);

    if (report.recommendations.length > 0) {
        console.log('   Recommandations:');
        report.recommendations.forEach((rec: string, i: number) => {
            console.log(`     ${i + 1}. ${rec}`);
        });
    }

    console.log('\n' + '═'.repeat(60) + '\n');
}

// Exécution
demonstrateMonitoring();

export { PerformanceMonitor, PerformanceMetrics, Alert, MonitorConfig };
