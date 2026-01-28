/**
 * Scénario 4 : Fuzzer Attack
 * EXPLOIT : Fuzzing des endpoints d'autorisation
 * 
 * ⚠️ USAGE PÉDAGOGIQUE UNIQUEMENT
 */

const crypto = require('crypto');

// Configuration du fuzzing
const FUZZ_CONFIG = {
    maxIterations: 100,
    delayMs: 50,
    targetEndpoint: '/api/authorize',
    verboseLogging: true
};

// Générateurs de données de fuzz
const FUZZ_GENERATORS = {
    // Valeurs limites
    boundary: [
        '', ' ', '\t', '\n', '\r\n',
        '0', '-1', '999999999999999',
        '0.0', '-0.0', 'NaN', 'Infinity',
        'null', 'undefined', 'true', 'false',
        '[]', '{}', '[null]', '{"a":1}'
    ],

    // Injections
    injection: [
        "'; DROP TABLE transactions; --",
        '<script>alert(1)</script>',
        '{{7*7}}', '${7*7}',
        '../../../etc/passwd',
        '|ls -la',
        '; cat /etc/passwd',
        '%00', '%0d%0a'
    ],

    // Format strings
    formatStrings: [
        '%s%s%s%s%s',
        '%x%x%x%x',
        '%n%n%n%n',
        'AAAA%08x.%08x.%08x'
    ],

    // Unicode et encodages
    unicode: [
        '\u0000', '\uFFFF', '\uD800\uDC00',
        '日本語', '中文', 'العربية',
        '🔥💳💰', '\u202E' // RTL override
    ],

    // Longueurs extrêmes
    lengths: [
        'A'.repeat(1000),
        'A'.repeat(10000),
        '1'.repeat(100),
        crypto.randomBytes(500).toString('hex')
    ]
};

/**
 * Classe de Fuzzer pour les APIs de paiement
 */
class AuthorizationFuzzer {
    constructor(config = FUZZ_CONFIG) {
        this.config = config;
        this.results = [];
        this.anomalies = [];
    }

    /**
     * Génère un cas de fuzz
     */
    generateFuzzCase(baseRequest, field, value) {
        const fuzzed = JSON.parse(JSON.stringify(baseRequest));

        // Naviguer vers le champ imbriqué si nécessaire
        const parts = field.split('.');
        let target = fuzzed;

        for (let i = 0; i < parts.length - 1; i++) {
            if (target[parts[i]] === undefined) {
                target[parts[i]] = {};
            }
            target = target[parts[i]];
        }

        target[parts[parts.length - 1]] = value;
        return fuzzed;
    }

    /**
     * Simule l'envoi d'une requête fuzzée
     */
    async sendFuzzRequest(request) {
        const startTime = Date.now();

        try {
            // Simulation de traitement (en prod: vraie requête HTTP)
            const response = this.simulateEndpoint(request);

            const result = {
                request,
                response,
                duration: Date.now() - startTime,
                error: null
            };

            // Détecter les anomalies
            this.detectAnomalies(result);

            return result;
        } catch (error) {
            return {
                request,
                response: null,
                duration: Date.now() - startTime,
                error: error.message
            };
        }
    }

    /**
     * Simule le comportement de l'endpoint
     */
    simulateEndpoint(request) {
        // Simuler différents comportements selon l'input

        // Crash sur injection SQL
        if (JSON.stringify(request).includes('DROP TABLE')) {
            throw new Error('Database error: syntax error near "DROP"');
        }

        // Erreur sur très longue chaîne
        if (JSON.stringify(request).length > 5000) {
            return { status: 413, error: 'Payload too large' };
        }

        // Erreur sur null bytes
        if (JSON.stringify(request).includes('%00') ||
            JSON.stringify(request).includes('\u0000')) {
            return { status: 400, error: 'Invalid character in request' };
        }

        // Réponse normale simulée
        return {
            status: 200,
            body: { approved: false, reason: 'INVALID_DATA' }
        };
    }

    /**
     * Détecte les anomalies dans les réponses
     */
    detectAnomalies(result) {
        const anomaly = {
            detected: false,
            types: []
        };

        // Crash ou exception
        if (result.error) {
            anomaly.detected = true;
            anomaly.types.push({
                type: 'CRASH',
                severity: 'CRITICAL',
                details: result.error
            });
        }

        // Réponse inattendue
        if (result.response?.status >= 500) {
            anomaly.detected = true;
            anomaly.types.push({
                type: 'SERVER_ERROR',
                severity: 'HIGH',
                details: `Status ${result.response.status}`
            });
        }

        // Temps de réponse anormal
        if (result.duration > 5000) {
            anomaly.detected = true;
            anomaly.types.push({
                type: 'SLOW_RESPONSE',
                severity: 'MEDIUM',
                details: `${result.duration}ms`
            });
        }

        // Fuite d'information dans l'erreur
        if (result.response?.error?.includes('Database') ||
            result.response?.error?.includes('SQL')) {
            anomaly.detected = true;
            anomaly.types.push({
                type: 'INFO_LEAK',
                severity: 'HIGH',
                details: 'Database error exposed'
            });
        }

        if (anomaly.detected) {
            this.anomalies.push({
                ...anomaly,
                request: result.request,
                response: result.response
            });
        }
    }

    /**
     * Exécute une campagne de fuzzing
     */
    async runFuzzCampaign(baseRequest, targetFields) {
        console.log('\n🎯 Démarrage du fuzzing...\n');

        let iteration = 0;

        for (const field of targetFields) {
            console.log(`\n  📍 Fuzzing du champ: ${field}`);

            for (const category of Object.keys(FUZZ_GENERATORS)) {
                for (const value of FUZZ_GENERATORS[category]) {
                    if (iteration >= this.config.maxIterations) {
                        console.log('\n  ⏹ Limite d\'itérations atteinte');
                        return;
                    }

                    const fuzzCase = this.generateFuzzCase(baseRequest, field, value);
                    const result = await this.sendFuzzRequest(fuzzCase);

                    this.results.push({
                        iteration,
                        field,
                        category,
                        value: typeof value === 'string' ? value.substring(0, 30) : value,
                        result
                    });

                    if (result.error || (result.response?.status >= 500)) {
                        console.log(`     ⚠️ [${category}] Anomalie détectée!`);
                    }

                    iteration++;

                    // Délai entre requêtes
                    await new Promise(r => setTimeout(r, this.config.delayMs));
                }
            }
        }
    }

    /**
     * Génère le rapport de fuzzing
     */
    generateReport() {
        const criticalAnomalies = this.anomalies.filter(a =>
            a.types.some(t => t.severity === 'CRITICAL')
        );

        return {
            totalRequests: this.results.length,
            totalAnomalies: this.anomalies.length,
            criticalAnomalies: criticalAnomalies.length,
            byCategory: this.groupByCategory(),
            vulnerabilities: this.identifyVulnerabilities(),
            recommendations: this.getRecommendations()
        };
    }

    groupByCategory() {
        const grouped = {};
        for (const result of this.results) {
            if (!grouped[result.category]) {
                grouped[result.category] = { total: 0, anomalies: 0 };
            }
            grouped[result.category].total++;
            if (result.result.error || result.result.response?.status >= 500) {
                grouped[result.category].anomalies++;
            }
        }
        return grouped;
    }

    identifyVulnerabilities() {
        const vulns = [];

        if (this.anomalies.some(a => a.types.some(t => t.type === 'CRASH'))) {
            vulns.push({
                name: 'Crash Vulnerability',
                severity: 'CRITICAL',
                cwe: 'CWE-248: Uncaught Exception'
            });
        }

        if (this.anomalies.some(a => a.types.some(t => t.type === 'INFO_LEAK'))) {
            vulns.push({
                name: 'Information Disclosure',
                severity: 'HIGH',
                cwe: 'CWE-209: Error Message Information Leak'
            });
        }

        return vulns;
    }

    getRecommendations() {
        return [
            'Implémenter une validation stricte de tous les inputs',
            'Utiliser des messages d\'erreur génériques',
            'Ajouter des rate limiters sur tous les endpoints',
            'Mettre en place un WAF (Web Application Firewall)'
        ];
    }
}

/**
 * Démonstration
 */
async function demonstrateFuzzing() {
    console.log('═'.repeat(60));
    console.log('  🎲 FUZZER ATTACK - Scénario 4');
    console.log('  ⚠️  USAGE STRICTEMENT PÉDAGOGIQUE');
    console.log('═'.repeat(60));

    const fuzzer = new AuthorizationFuzzer({
        maxIterations: 50,
        delayMs: 10
    });

    // Requête de base
    const baseRequest = {
        pan: '4111111111111111',
        amount: 10000,
        currency: 'EUR',
        terminalId: 'TERM001'
    };

    // Champs à fuzzer
    const targetFields = ['pan', 'amount', 'currency'];

    await fuzzer.runFuzzCampaign(baseRequest, targetFields);

    // Rapport
    console.log('\n' + '═'.repeat(60));
    console.log('  📊 RAPPORT DE FUZZING');
    console.log('═'.repeat(60));

    const report = fuzzer.generateReport();
    console.log(`
   Requêtes envoyées:      ${report.totalRequests}
   Anomalies détectées:    ${report.totalAnomalies}
   Anomalies critiques:    ${report.criticalAnomalies}
`);

    if (report.vulnerabilities.length > 0) {
        console.log('   Vulnérabilités identifiées:');
        report.vulnerabilities.forEach(v => {
            console.log(`     🔴 [${v.severity}] ${v.name} (${v.cwe})`);
        });
    }

    console.log('\n─'.repeat(60));
    console.log('  💡 RECOMMANDATIONS:');
    console.log('─'.repeat(60));
    report.recommendations.forEach((rec, i) => {
        console.log(`   ${i + 1}. ${rec}`);
    });

    console.log('\n' + '═'.repeat(60) + '\n');
}

// Exécution
demonstrateFuzzing();

module.exports = { AuthorizationFuzzer, FUZZ_GENERATORS };
