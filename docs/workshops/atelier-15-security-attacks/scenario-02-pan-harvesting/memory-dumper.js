/**
 * Scénario 2 : Memory Dumper
 * EXPLOIT : Extraction de PAN depuis la mémoire des processus
 * 
 * ⚠️ USAGE PÉDAGOGIQUE UNIQUEMENT - SIMULATION
 */

const crypto = require('crypto');

/**
 * Simulateur de dump mémoire (version pédagogique sécurisée)
 * En production: accès mémoire réel est dangereux et souvent illégal
 */
class MemoryDumper {
    constructor() {
        this.simulatedMemory = new Map();
        this.extractedData = [];
    }

    /**
     * Simule l'allocation mémoire d'un processus de paiement
     */
    simulatePaymentProcess() {
        // Simuler des données en mémoire (comme un vrai processus de paiement)
        const paymentData = {
            // Données sensibles non effacées de la mémoire
            pan: '4111111111111111',
            expiry: '12/28',
            cvv: '123',
            cardholderName: 'JEAN DUPONT',

            // Données de session
            sessionId: crypto.randomBytes(16).toString('hex'),
            transactionId: 'TXN' + Date.now(),

            // Clés temporaires (VULNÉRABLE!)
            tempEncryptionKey: crypto.randomBytes(16).toString('hex'),

            // Traces de traitement
            processingSteps: [
                'Card validation',
                'PIN verification',
                'Authorization request',
                'Response processing'
            ]
        };

        // Stocker en "mémoire"
        const baseAddress = Math.floor(Math.random() * 0xFFFF0000);
        this.simulatedMemory.set(baseAddress, JSON.stringify(paymentData));

        return baseAddress;
    }

    /**
     * Simule un scan de la mémoire pour trouver des patterns de PAN
     */
    scanForPANPatterns() {
        console.log('\n[MemoryDumper] Scan de la mémoire simulée...\n');

        const panPatterns = [
            /4[0-9]{12}(?:[0-9]{3})?/g,  // Visa
            /5[1-5][0-9]{14}/g,           // Mastercard
            /3[47][0-9]{13}/g,            // Amex
            /6(?:011|5[0-9]{2})[0-9]{12}/g // Discover
        ];

        const findings = [];

        for (const [address, content] of this.simulatedMemory.entries()) {
            for (const pattern of panPatterns) {
                const matches = content.match(pattern);
                if (matches) {
                    matches.forEach(match => {
                        if (this.luhnCheck(match)) {
                            findings.push({
                                address: `0x${address.toString(16).toUpperCase()}`,
                                pan: match,
                                masked: this.maskPAN(match),
                                brand: this.identifyBrand(match)
                            });
                        }
                    });
                }
            }
        }

        this.extractedData = findings;
        return findings;
    }

    /**
     * Recherche d'autres données sensibles en mémoire
     */
    scanForSensitiveData() {
        console.log('[MemoryDumper] Recherche de données sensibles...\n');

        const sensitivePatterns = {
            cvv: /\b[0-9]{3,4}\b/g,
            expiry: /\b(0[1-9]|1[0-2])[\/\-]([0-9]{2}|[0-9]{4})\b/g,
            keys: /[0-9A-Fa-f]{32}/g,
            sessionIds: /[0-9a-f]{32}/g
        };

        const findings = [];

        for (const [address, content] of this.simulatedMemory.entries()) {
            const parsed = JSON.parse(content);

            if (parsed.cvv) {
                findings.push({
                    type: 'CVV',
                    address: `0x${address.toString(16).toUpperCase()}`,
                    value: parsed.cvv
                });
            }

            if (parsed.tempEncryptionKey) {
                findings.push({
                    type: 'ENCRYPTION_KEY',
                    address: `0x${address.toString(16).toUpperCase()}`,
                    value: parsed.tempEncryptionKey.substring(0, 8) + '...'
                });
            }
        }

        return findings;
    }

    /**
     * Vérifie un numéro avec l'algorithme de Luhn
     */
    luhnCheck(number) {
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
    maskPAN(pan) {
        return pan.substring(0, 6) + '****' + pan.substring(pan.length - 4);
    }

    /**
     * Identifie la marque de carte
     */
    identifyBrand(pan) {
        if (pan.startsWith('4')) return 'Visa';
        if (pan.startsWith('5')) return 'Mastercard';
        if (pan.startsWith('34') || pan.startsWith('37')) return 'Amex';
        if (pan.startsWith('6')) return 'Discover';
        return 'Unknown';
    }

    /**
     * Génère un rapport d'extraction
     */
    generateReport() {
        const pans = this.scanForPANPatterns();
        const sensitive = this.scanForSensitiveData();

        return {
            timestamp: new Date().toISOString(),
            memoryRegionsScanned: this.simulatedMemory.size,
            findings: {
                pans: pans.length,
                sensitiveData: sensitive.length,
                details: {
                    pans: pans.map(p => ({ ...p, pan: '[REDACTED]' })),
                    sensitive: sensitive
                }
            },
            riskLevel: pans.length > 0 ? 'CRITICAL' : 'LOW'
        };
    }
}

/**
 * Démonstration de l'exploitation
 */
function demonstrateExploit() {
    console.log('═'.repeat(60));
    console.log('  💾 MEMORY DUMPER - Scénario 2');
    console.log('  ⚠️  USAGE STRICTEMENT PÉDAGOGIQUE (SIMULATION)');
    console.log('═'.repeat(60));

    const dumper = new MemoryDumper();

    // Simuler un processus de paiement vulnérable
    console.log('\n📋 PHASE 1: Simulation d\'un processus de paiement\n');
    const address = dumper.simulatePaymentProcess();
    console.log(`   Processus simulé à l'adresse: 0x${address.toString(16).toUpperCase()}`);

    // Scanner la mémoire
    console.log('\n📋 PHASE 2: Scan de la mémoire\n');
    const pans = dumper.scanForPANPatterns();

    if (pans.length > 0) {
        console.log('   🚨 PAN TROUVÉS EN MÉMOIRE:');
        pans.forEach(finding => {
            console.log(`      ${finding.brand}: ${finding.masked} @ ${finding.address}`);
        });
    }

    // Autres données sensibles
    console.log('\n📋 PHASE 3: Recherche de données sensibles\n');
    const sensitive = dumper.scanForSensitiveData();

    if (sensitive.length > 0) {
        console.log('   🚨 DONNÉES SENSIBLES EXPOSÉES:');
        sensitive.forEach(item => {
            console.log(`      ${item.type}: ${item.value} @ ${item.address}`);
        });
    }

    // Rapport
    console.log('\n' + '═'.repeat(60));
    console.log('  📊 RAPPORT D\'EXTRACTION');
    console.log('═'.repeat(60));

    const report = dumper.generateReport();
    console.log(`
   Régions mémoire scannées: ${report.memoryRegionsScanned}
   PAN trouvés:              ${report.findings.pans}
   Données sensibles:        ${report.findings.sensitiveData}
   Niveau de risque:         ${report.riskLevel}
`);

    console.log('─'.repeat(60));
    console.log('  💡 POURQUOI CETTE VULNÉRABILITÉ EXISTE:');
    console.log('─'.repeat(60));
    console.log(`
  1. Les données sensibles ne sont PAS effacées de la mémoire
  2. Les clés temporaires restent accessibles
  3. Pas de protection de la mémoire (memory encryption)
  
  ✅ SOLUTIONS:
  - Effacer les données sensibles après utilisation (secure wipe)
  - Utiliser des zones mémoire protégées (enclave)
  - Minimiser le temps de rétention des données en mémoire
  - Chiffrer les données sensibles même en mémoire
`);
    console.log('═'.repeat(60) + '\n');
}

// Exécution
demonstrateExploit();

module.exports = { MemoryDumper };
