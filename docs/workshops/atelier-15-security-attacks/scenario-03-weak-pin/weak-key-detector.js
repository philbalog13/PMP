/**
 * Scénario 3 : Weak Key Detector
 * DÉTECTION : Identifie les clés cryptographiques faibles
 * 
 * Usage: node weak-key-detector.js
 */

const crypto = require('crypto');

// Seuils de sécurité
const SECURITY_THRESHOLDS = {
    minKeyLength: {
        DES: 0,      // Obsolète - toujours faible
        '3DES': 168, // Minimum acceptable
        AES: 256,    // Recommandé
        RSA: 2048    // Minimum
    },
    minEntropy: 7.5,  // bits par byte (max = 8)
    bannedPatterns: [
        /^[0]{16,}$/,           // Tous zéros
        /^[F]{16,}$/i,          // Tous F
        /^(01234567|89ABCDEF)+$/i,  // Séquence
        /^(.)\1{15,}$/,         // Répétition
    ]
};

// Liste des clés faibles connues
const KNOWN_WEAK_KEYS = [
    '0000000000000000',
    'FFFFFFFFFFFFFFFF',
    '0123456789ABCDEF',
    'FEDCBA9876543210',
    '1111111111111111',
    'AAAAAAAAAAAAAAAA',
];

/**
 * Classe de détection de clés faibles
 */
class WeakKeyDetector {
    constructor() {
        this.findings = [];
    }

    /**
     * Calcule l'entropie de Shannon d'une clé
     */
    calculateEntropy(keyHex) {
        const bytes = Buffer.from(keyHex, 'hex');
        const frequency = new Map();

        // Compter les fréquences
        for (const byte of bytes) {
            frequency.set(byte, (frequency.get(byte) || 0) + 1);
        }

        // Calculer l'entropie
        let entropy = 0;
        for (const count of frequency.values()) {
            const p = count / bytes.length;
            entropy -= p * Math.log2(p);
        }

        return entropy;
    }

    /**
     * Vérifie si une clé est dans la liste des clés faibles connues
     */
    isKnownWeakKey(keyHex) {
        const normalized = keyHex.toUpperCase().replace(/\s/g, '');
        return KNOWN_WEAK_KEYS.some(weak =>
            normalized.includes(weak) || weak.includes(normalized)
        );
    }

    /**
     * Vérifie les patterns dangereux
     */
    hasBannedPattern(keyHex) {
        const normalized = keyHex.toUpperCase();
        return SECURITY_THRESHOLDS.bannedPatterns.some(pattern =>
            pattern.test(normalized)
        );
    }

    /**
     * Vérifie la longueur de clé
     */
    checkKeyLength(keyHex, algorithm) {
        const keyBits = (keyHex.length / 2) * 8;
        const minBits = SECURITY_THRESHOLDS.minKeyLength[algorithm] || 256;

        return {
            actual: keyBits,
            required: minBits,
            valid: keyBits >= minBits
        };
    }

    /**
     * Détecte les clés DES semi-faibles
     */
    isDESSemiWeakKey(keyHex) {
        const semiWeakKeys = [
            '01FE01FE01FE01FE', 'FE01FE01FE01FE01',
            '1FE01FE00EF10EF1', 'E01FE01FF10EF10E',
            '01E001E001F101F1', 'E001E001F101F101',
            '1FFE1FFE0EFE0EFE', 'FE1FFE1FFE0EFE0E'
        ];
        return semiWeakKeys.includes(keyHex.toUpperCase());
    }

    /**
     * Analyse complète d'une clé
     */
    analyzeKey(keyHex, algorithm = 'AES', keyId = 'unknown') {
        const issues = [];

        // 1. Vérifier la longueur
        const lengthCheck = this.checkKeyLength(keyHex, algorithm);
        if (!lengthCheck.valid) {
            issues.push({
                severity: 'CRITICAL',
                type: 'KEY_TOO_SHORT',
                message: `Clé ${algorithm} de ${lengthCheck.actual} bits (min: ${lengthCheck.required} bits)`
            });
        }

        // 2. Vérifier l'entropie
        const entropy = this.calculateEntropy(keyHex);
        if (entropy < SECURITY_THRESHOLDS.minEntropy) {
            issues.push({
                severity: 'HIGH',
                type: 'LOW_ENTROPY',
                message: `Entropie: ${entropy.toFixed(2)} bits/byte (min: ${SECURITY_THRESHOLDS.minEntropy})`
            });
        }

        // 3. Vérifier les patterns interdits
        if (this.hasBannedPattern(keyHex)) {
            issues.push({
                severity: 'CRITICAL',
                type: 'BANNED_PATTERN',
                message: 'La clé contient un pattern dangereux (répétition, séquence)'
            });
        }

        // 4. Vérifier les clés faibles connues
        if (this.isKnownWeakKey(keyHex)) {
            issues.push({
                severity: 'CRITICAL',
                type: 'KNOWN_WEAK_KEY',
                message: 'Cette clé est dans la liste des clés faibles connues!'
            });
        }

        // 5. Vérifier les clés DES semi-faibles
        if (algorithm === 'DES' || algorithm === '3DES') {
            if (this.isDESSemiWeakKey(keyHex)) {
                issues.push({
                    severity: 'HIGH',
                    type: 'SEMI_WEAK_DES',
                    message: 'Clé DES semi-faible détectée'
                });
            }
        }

        const result = {
            keyId,
            algorithm,
            keyLength: (keyHex.length / 2) * 8,
            entropy: entropy,
            vulnerable: issues.length > 0,
            issues
        };

        this.findings.push(result);
        return result;
    }

    /**
     * Scanne un ensemble de clés
     */
    scanKeys(keys) {
        console.log('\n🔍 Scan des clés...\n');

        const results = [];
        for (const { id, key, algorithm } of keys) {
            const result = this.analyzeKey(key, algorithm, id);
            results.push(result);

            console.log(`  ${id}: ${result.vulnerable ? '❌ VULNÉRABLE' : '✅ OK'}`);
            if (result.vulnerable) {
                result.issues.forEach(issue => {
                    console.log(`    ⚠️ [${issue.severity}] ${issue.type}`);
                });
            }
        }

        return results;
    }

    /**
     * Génère un rapport de sécurité
     */
    generateReport() {
        const vulnerable = this.findings.filter(f => f.vulnerable);
        const critical = vulnerable.filter(f =>
            f.issues.some(i => i.severity === 'CRITICAL')
        );

        return {
            totalKeys: this.findings.length,
            vulnerableKeys: vulnerable.length,
            criticalKeys: critical.length,
            summary: {
                keyLengthIssues: this.findings.filter(f =>
                    f.issues.some(i => i.type === 'KEY_TOO_SHORT')
                ).length,
                entropyIssues: this.findings.filter(f =>
                    f.issues.some(i => i.type === 'LOW_ENTROPY')
                ).length,
                knownWeakKeys: this.findings.filter(f =>
                    f.issues.some(i => i.type === 'KNOWN_WEAK_KEY')
                ).length
            },
            recommendations: this.getRecommendations(),
            findings: this.findings
        };
    }

    getRecommendations() {
        const recs = [];

        if (this.findings.some(f => f.algorithm === 'DES')) {
            recs.push('Migrer toutes les clés DES vers AES-256');
        }

        if (this.findings.some(f => f.issues.some(i => i.type === 'LOW_ENTROPY'))) {
            recs.push('Utiliser un CSPRNG (crypto.randomBytes) pour générer les clés');
        }

        if (this.findings.some(f => f.keyLength < 256)) {
            recs.push('Augmenter la longueur des clés à 256 bits minimum');
        }

        return recs;
    }
}

/**
 * Démonstration
 */
function demonstrateDetection() {
    console.log('═'.repeat(60));
    console.log('  🔑 WEAK KEY DETECTOR - Scénario 3');
    console.log('═'.repeat(60));

    const detector = new WeakKeyDetector();

    // Clés de test (bonnes et mauvaises)
    const testKeys = [
        { id: 'PIN_ENCRYPTION_KEY', key: '0000000000000000', algorithm: 'DES' },
        { id: 'MAC_KEY', key: '0123456789ABCDEFFEDCBA9876543210', algorithm: '3DES' },
        { id: 'TERMINAL_KEY_001', key: 'AAAAAAAAAAAAAAAA', algorithm: 'DES' },
        { id: 'MASTER_KEY', key: crypto.randomBytes(32).toString('hex'), algorithm: 'AES' },
        { id: 'SESSION_KEY', key: crypto.randomBytes(16).toString('hex'), algorithm: 'AES' },
        { id: 'LEGACY_KEY', key: '1111111111111111', algorithm: 'DES' },
    ];

    const results = detector.scanKeys(testKeys);

    // Rapport
    console.log('\n' + '═'.repeat(60));
    console.log('  📊 RAPPORT DE SÉCURITÉ');
    console.log('═'.repeat(60));

    const report = detector.generateReport();
    console.log(`
   Clés analysées:     ${report.totalKeys}
   Clés vulnérables:   ${report.vulnerableKeys}
   Clés critiques:     ${report.criticalKeys}
   
   Problèmes détectés:
     Longueur insuffisante: ${report.summary.keyLengthIssues}
     Entropie faible:       ${report.summary.entropyIssues}
     Clés faibles connues:  ${report.summary.knownWeakKeys}
`);

    if (report.recommendations.length > 0) {
        console.log('─'.repeat(60));
        console.log('  💡 RECOMMANDATIONS:');
        console.log('─'.repeat(60));
        report.recommendations.forEach((rec, i) => {
            console.log(`   ${i + 1}. ${rec}`);
        });
    }

    console.log('\n' + '═'.repeat(60) + '\n');
}

// Exécution
demonstrateDetection();

module.exports = { WeakKeyDetector };
