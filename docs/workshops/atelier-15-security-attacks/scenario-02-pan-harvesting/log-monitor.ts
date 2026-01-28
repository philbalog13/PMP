/**
 * Scénario 2 : Log Monitor
 * DÉTECTION : Surveillance en temps réel des logs pour PAN en clair
 * 
 * Usage: npx ts-node log-monitor.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

interface Alert {
    timestamp: Date;
    severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    type: string;
    file: string;
    line: number;
    content: string;
    pan?: string;
}

interface MonitorConfig {
    watchPaths: string[];
    alertThreshold: number;
    enableRealtime: boolean;
    maskOnDetection: boolean;
}

/**
 * Patterns de détection PCI-DSS
 */
const PAN_PATTERNS = [
    { name: 'Visa', pattern: /\b4[0-9]{12}(?:[0-9]{3})?\b/g },
    { name: 'Mastercard', pattern: /\b5[1-5][0-9]{14}\b/g },
    { name: 'Amex', pattern: /\b3[47][0-9]{13}\b/g },
    { name: 'Discover', pattern: /\b6(?:011|5[0-9]{2})[0-9]{12}\b/g }
];

const SENSITIVE_PATTERNS = [
    { name: 'CVV', pattern: /\b(cvv|cvc|csc)[:\s]*[0-9]{3,4}\b/gi },
    { name: 'PIN', pattern: /\b(pin)[:\s]*[0-9]{4,6}\b/gi },
    { name: 'Expiry', pattern: /\b(exp|expiry|expiration)[:\s]*(0[1-9]|1[0-2])[\/-]([0-9]{2}|[0-9]{4})\b/gi },
    { name: 'Track2', pattern: /;[0-9]{16}=[0-9]{4}[0-9]+\?/g }
];

/**
 * Classe de monitoring des logs
 */
class LogMonitor {
    private alerts: Alert[] = [];
    private config: MonitorConfig;
    private watchers: fs.FSWatcher[] = [];

    constructor(config: Partial<MonitorConfig> = {}) {
        this.config = {
            watchPaths: config.watchPaths || ['/var/log', './logs'],
            alertThreshold: config.alertThreshold || 1,
            enableRealtime: config.enableRealtime ?? true,
            maskOnDetection: config.maskOnDetection ?? true
        };
    }

    /**
     * Vérifie l'algorithme de Luhn
     */
    private luhnCheck(number: string): boolean {
        const digits = number.split('').reverse().map(Number);
        let sum = 0;

        for (let i = 0; i < digits.length; i++) {
            let digit = digits[i];
            if (i % 2 === 1) {
                digit *= 2;
                if (digit > 9) digit -= 9;
            }
            sum += digit;
        }

        return sum % 10 === 0;
    }

    /**
     * Masque un PAN
     */
    private maskPAN(pan: string): string {
        return pan.substring(0, 6) + '****' + pan.substring(pan.length - 4);
    }

    /**
     * Scanne une ligne pour les données sensibles
     */
    scanLine(line: string, file: string, lineNumber: number): Alert[] {
        const alerts: Alert[] = [];

        // Chercher les PAN
        for (const { name, pattern } of PAN_PATTERNS) {
            const matches = line.match(pattern);
            if (matches) {
                for (const match of matches) {
                    if (this.luhnCheck(match)) {
                        alerts.push({
                            timestamp: new Date(),
                            severity: 'CRITICAL',
                            type: `PAN_EXPOSED_${name.toUpperCase()}`,
                            file,
                            line: lineNumber,
                            content: this.config.maskOnDetection
                                ? line.replace(match, this.maskPAN(match))
                                : line.substring(0, 100),
                            pan: this.maskPAN(match)
                        });
                    }
                }
            }
        }

        // Chercher les autres données sensibles
        for (const { name, pattern } of SENSITIVE_PATTERNS) {
            if (pattern.test(line)) {
                alerts.push({
                    timestamp: new Date(),
                    severity: 'HIGH',
                    type: `SENSITIVE_DATA_${name.toUpperCase()}`,
                    file,
                    line: lineNumber,
                    content: line.substring(0, 100) + '...'
                });
            }
        }

        this.alerts.push(...alerts);
        return alerts;
    }

    /**
     * Scanne un fichier complet
     */
    async scanFile(filePath: string): Promise<Alert[]> {
        const fileAlerts: Alert[] = [];

        try {
            const content = fs.readFileSync(filePath, 'utf-8');
            const lines = content.split('\n');

            lines.forEach((line, index) => {
                const lineAlerts = this.scanLine(line, filePath, index + 1);
                fileAlerts.push(...lineAlerts);
            });
        } catch (error) {
            console.error(`Erreur lecture ${filePath}: ${error}`);
        }

        return fileAlerts;
    }

    /**
     * Active le monitoring temps réel
     */
    startRealtime(): void {
        if (!this.config.enableRealtime) return;

        console.log('[LogMonitor] Démarrage du monitoring temps réel...');

        for (const watchPath of this.config.watchPaths) {
            try {
                if (fs.existsSync(watchPath)) {
                    const watcher = fs.watch(watchPath, { recursive: true },
                        (eventType, filename) => {
                            if (filename && eventType === 'change') {
                                const fullPath = path.join(watchPath, filename);
                                this.scanFile(fullPath);
                            }
                        }
                    );
                    this.watchers.push(watcher);
                    console.log(`   Surveillance: ${watchPath}`);
                }
            } catch (error) {
                console.log(`   ⚠️ Impossible de surveiller: ${watchPath}`);
            }
        }
    }

    /**
     * Arrête le monitoring
     */
    stop(): void {
        this.watchers.forEach(w => w.close());
        this.watchers = [];
    }

    /**
     * Retourne les alertes
     */
    getAlerts(): Alert[] {
        return this.alerts;
    }

    /**
     * Génère un rapport
     */
    generateReport(): object {
        const critical = this.alerts.filter(a => a.severity === 'CRITICAL').length;
        const high = this.alerts.filter(a => a.severity === 'HIGH').length;

        return {
            timestamp: new Date().toISOString(),
            totalAlerts: this.alerts.length,
            bySeverity: {
                critical,
                high,
                medium: this.alerts.filter(a => a.severity === 'MEDIUM').length,
                low: this.alerts.filter(a => a.severity === 'LOW').length
            },
            byType: this.groupBy(this.alerts, 'type'),
            pciCompliant: critical === 0 && high === 0,
            recentAlerts: this.alerts.slice(-10)
        };
    }

    private groupBy(array: Alert[], key: keyof Alert): Record<string, number> {
        return array.reduce((acc, item) => {
            const value = String(item[key]);
            acc[value] = (acc[value] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
    }
}

/**
 * Démonstration du monitoring
 */
function demonstrateMonitoring(): void {
    console.log('═'.repeat(60));
    console.log('  📊 LOG MONITOR - Scénario 2');
    console.log('  Surveillance PCI-DSS des logs');
    console.log('═'.repeat(60));

    const monitor = new LogMonitor({
        enableRealtime: false,
        maskOnDetection: true
    });

    // Simuler des logs vulnérables
    const testLogs = [
        '2026-01-28 10:30:22 INFO Payment processed for PAN: 4111111111111111',
        '2026-01-28 10:30:22 DEBUG Card data: {"pan": "5500000000000004", "cvv": "123"}',
        '2026-01-28 10:30:23 INFO Transaction completed successfully',
        '2026-01-28 10:30:24 ERROR Failed auth for card 340000000000009',
        '2026-01-28 10:30:25 DEBUG PIN: 1234 entered',
        '2026-01-28 10:30:26 INFO Session started for customer',
        '2026-01-28 10:30:27 WARN Card expiry: 12/28 is approaching',
    ];

    console.log('\n📋 Scan des logs de test:\n');

    testLogs.forEach((log, index) => {
        const alerts = monitor.scanLine(log, 'test.log', index + 1);

        if (alerts.length > 0) {
            console.log(`  Ligne ${index + 1}: ⚠️ ${alerts.length} alerte(s)`);
            alerts.forEach(alert => {
                console.log(`    [${alert.severity}] ${alert.type}`);
                if (alert.pan) {
                    console.log(`    PAN détecté: ${alert.pan}`);
                }
            });
        } else {
            console.log(`  Ligne ${index + 1}: ✅ OK`);
        }
    });

    // Rapport
    console.log('\n' + '═'.repeat(60));
    console.log('  📊 RAPPORT');
    console.log('═'.repeat(60));

    const report = monitor.generateReport() as any;
    console.log(`
   Total alertes: ${report.totalAlerts}
   
   Par sévérité:
     🔴 Critical: ${report.bySeverity.critical}
     🟠 High:     ${report.bySeverity.high}
     🟡 Medium:   ${report.bySeverity.medium}
     🟢 Low:      ${report.bySeverity.low}
   
   Conformité PCI-DSS: ${report.pciCompliant ? '✅ OUI' : '❌ NON'}
`);

    console.log('─'.repeat(60));
    console.log('  💡 ACTIONS REQUISES:');
    console.log('─'.repeat(60));
    console.log(`
  1. Identifier et corriger les sources de logs vulnérables
  2. Implémenter le masking automatique avant logging
  3. Chiffrer les fichiers de logs sensibles
  4. Configurer des alertes temps réel
`);
    console.log('═'.repeat(60) + '\n');
}

// Exécution
demonstrateMonitoring();

export { LogMonitor, Alert, MonitorConfig };
