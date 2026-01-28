/**
 * Scénario 1 : Tests de Validation
 * Tests automatisés pour valider exploit/détection/correctif
 * 
 * Usage: node test-mitm-attack.js
 */

const crypto = require('crypto');

// Simuler les imports (en prod: vrais imports)
const { parseISO8583, modifyAmount, buildISO8583 } = require('./mitm-attack.js');
const { calculateMAC, verifyMAC, analyzeMessage } = require('./mac-verification-tool.js');
const { SecureISO8583Message, macVerificationMiddleware } = require('./fix-mac-mandatory.js');

// Configuration des tests
const TEST_KEY = '0123456789ABCDEFFEDCBA9876543210';

class TestRunner {
    constructor() {
        this.passed = 0;
        this.failed = 0;
        this.results = [];
    }

    test(name, fn) {
        try {
            fn();
            this.passed++;
            this.results.push({ name, status: 'PASS', error: null });
            console.log(`  ✅ ${name}`);
        } catch (error) {
            this.failed++;
            this.results.push({ name, status: 'FAIL', error: error.message });
            console.log(`  ❌ ${name}`);
            console.log(`     Error: ${error.message}`);
        }
    }

    assertEqual(actual, expected, message = '') {
        if (actual !== expected) {
            throw new Error(`${message} Expected: ${expected}, Got: ${actual}`);
        }
    }

    assertTrue(condition, message = '') {
        if (!condition) {
            throw new Error(`${message} Expected true but got false`);
        }
    }

    assertFalse(condition, message = '') {
        if (condition) {
            throw new Error(`${message} Expected false but got true`);
        }
    }

    summary() {
        const total = this.passed + this.failed;
        console.log('\n' + '─'.repeat(60));
        console.log(`  RÉSULTATS: ${this.passed}/${total} tests passés`);
        console.log('─'.repeat(60));

        if (this.failed > 0) {
            console.log('\n  Tests échoués:');
            this.results
                .filter(r => r.status === 'FAIL')
                .forEach(r => console.log(`    - ${r.name}: ${r.error}`));
        }

        return this.failed === 0;
    }
}

/**
 * Tests de l'exploit MitM
 */
function testExploit(runner) {
    console.log('\n📋 Tests de l\'exploit (mitm-attack.js):\n');

    runner.test('Parse d\'un message ISO 8583', () => {
        const raw = Buffer.from('0100|4111111111111111|000000|000010000|123456');
        const parsed = parseISO8583(raw);

        runner.assertEqual(parsed.mti, '0100', 'MTI incorrect');
        runner.assertEqual(parsed.pan, '4111111111111111', 'PAN incorrect');
        runner.assertEqual(parsed.amount, '000010000', 'Amount incorrect');
    });

    runner.test('Modification du montant fonctionne', () => {
        const parsed = {
            mti: '0100',
            pan: '4111111111111111',
            amount: '000100000',
            fields: ['0100', '4111111111111111', '000000', '000100000', '123456']
        };

        const modified = modifyAmount({ ...parsed, fields: [...parsed.fields] }, 0.1);

        runner.assertEqual(modified.fields[3], '000010000', 'Montant non réduit à 10%');
    });

    runner.test('Rebuild du message après modification', () => {
        const parsed = {
            mti: '0100',
            fields: ['0100', '4111111111111111', '000000', '000010000', '123456']
        };

        const rebuilt = buildISO8583(parsed);
        runner.assertTrue(rebuilt.includes('000010000'), 'Message mal reconstruit');
    });
}

/**
 * Tests de détection
 */
function testDetection(runner) {
    console.log('\n📋 Tests de détection (mac-verification-tool.js):\n');

    runner.test('Calcul du MAC cohérent', () => {
        const message = 'test-message-data';
        const mac1 = calculateMAC(message, TEST_KEY);
        const mac2 = calculateMAC(message, TEST_KEY);

        runner.assertEqual(mac1, mac2, 'MAC non déterministe');
    });

    runner.test('Vérification MAC valide', () => {
        const message = 'test-message-data';
        const mac = calculateMAC(message, TEST_KEY);
        const result = verifyMAC(message, mac, TEST_KEY);

        runner.assertTrue(result.valid, 'MAC valide rejeté');
    });

    runner.test('Détection de MAC invalide', () => {
        const message = 'test-message-data';
        const wrongMAC = 'DEADBEEFDEADBEEF';
        const result = verifyMAC(message, wrongMAC, TEST_KEY);

        runner.assertFalse(result.valid, 'MAC invalide accepté');
    });

    runner.test('Détection de message sans MAC', () => {
        const messageData = {
            mti: '0100',
            pan: '4111111111111111',
            amount: '10000',
            mac: null,
            macCoverage: []
        };

        const analysis = analyzeMessage(messageData);
        runner.assertTrue(analysis.vulnerable, 'Message sans MAC non détecté');
    });

    runner.test('Message avec MAC valide non marqué vulnérable', () => {
        const content = '0100|4111111111111111|000000|10000';
        const mac = calculateMAC(content, TEST_KEY);

        const messageData = {
            mti: '0100',
            pan: '4111111111111111',
            amount: '10000',
            content: content,
            mac: mac,
            macCoverage: ['DE2', 'DE3', 'DE4', 'DE38', 'DE39', 'DE41', 'DE42']
        };

        const analysis = analyzeMessage(messageData);
        runner.assertFalse(analysis.vulnerable, 'Message sécurisé marqué vulnérable');
    });
}

/**
 * Tests du correctif
 */
function testFix(runner) {
    console.log('\n📋 Tests du correctif (fix-mac-mandatory.js):\n');

    runner.test('Création de message sécurisé avec signature', () => {
        const key = crypto.randomBytes(32);
        const message = new SecureISO8583Message();
        message.setField(2, '4111111111111111');
        message.setField(4, '10000');

        const signature = message.sign(key);
        runner.assertTrue(signature.length > 0, 'Signature vide');
    });

    runner.test('Vérification de signature valide', () => {
        const key = crypto.randomBytes(32);
        const message = new SecureISO8583Message();
        message.setField(2, '4111111111111111');
        message.setField(4, '10000');
        message.sign(key);

        const result = message.verify(key);
        runner.assertTrue(result.valid, 'Signature valide rejetée');
    });

    runner.test('Détection de modification après signature', () => {
        const key = crypto.randomBytes(32);
        const message = new SecureISO8583Message();
        message.setField(2, '4111111111111111');
        message.setField(4, '10000');
        message.sign(key);

        // Modifier le montant après signature (attaque)
        message.fields['DE4'] = '1000';

        const result = message.verify(key);
        runner.assertFalse(result.valid, 'Modification non détectée');
    });

    runner.test('Middleware rejette message sans MAC', () => {
        const key = crypto.randomBytes(32);
        const middleware = macVerificationMiddleware(key);

        const unsignedMessage = new SecureISO8583Message();
        unsignedMessage.setField(2, '4111111111111111');
        // Pas de signature

        const result = middleware(unsignedMessage);
        runner.assertFalse(result.accepted, 'Message non signé accepté');
    });

    runner.test('Middleware accepte message avec MAC valide', () => {
        const key = crypto.randomBytes(32);
        const middleware = macVerificationMiddleware(key);

        const signedMessage = new SecureISO8583Message();
        signedMessage.setField(2, '4111111111111111');
        signedMessage.setField(4, '10000');
        signedMessage.sign(key);

        const result = middleware(signedMessage);
        runner.assertTrue(result.accepted, 'Message signé rejeté');
    });
}

/**
 * Tests d'intégration (attack → detection → fix)
 */
function testIntegration(runner) {
    console.log('\n📋 Tests d\'intégration (cycle complet):\n');

    runner.test('Attaque réussie AVANT correctif', () => {
        // Simuler un message sans MAC
        const raw = Buffer.from('0100|4111111111111111|000000|000100000|123456');
        const parsed = parseISO8583(raw);
        const modified = modifyAmount({ ...parsed, fields: [...parsed.fields] }, 0.1);

        // Vérifier que la modification a fonctionné
        runner.assertEqual(modified.fields[3], '000010000', 'Attaque MitM a échoué');
    });

    runner.test('Détection identifie le message vulnérable', () => {
        const messageData = {
            mti: '0100',
            pan: '4111111111111111',
            amount: '100000',
            mac: null,
            macCoverage: []
        };

        const analysis = analyzeMessage(messageData);
        runner.assertTrue(analysis.vulnerable, 'Vulnérabilité non détectée');
        runner.assertTrue(
            analysis.issues.some(i => i.issue.includes('MAC absent')),
            'Issue MAC absent non signalée'
        );
    });

    runner.test('Attaque ÉCHOUE APRÈS correctif', () => {
        const key = crypto.randomBytes(32);

        // Créer un message signé
        const message = new SecureISO8583Message();
        message.setField(2, '4111111111111111');
        message.setField(4, '100000');
        message.sign(key);

        // Tenter de modifier (simulation attaque MitM)
        message.fields['DE4'] = '10000';

        // Vérifier que la modification est détectée
        const verification = message.verify(key);
        runner.assertFalse(verification.valid, 'Attaque MitM réussie après correctif!');
    });
}

/**
 * Exécution des tests
 */
function runAllTests() {
    console.log('═'.repeat(60));
    console.log('  🧪 TESTS DE VALIDATION - Scénario 1 (MitM)');
    console.log('═'.repeat(60));

    const runner = new TestRunner();

    try {
        testExploit(runner);
        testDetection(runner);
        testFix(runner);
        testIntegration(runner);
    } catch (error) {
        console.log(`\n⚠️ Erreur lors de l'exécution: ${error.message}`);
        console.log('   (Normal si les modules ne sont pas chargés en mode standalone)');
    }

    const success = runner.summary();

    console.log('\n' + '═'.repeat(60));
    console.log(success ? '  ✅ TOUS LES TESTS PASSÉS' : '  ❌ CERTAINS TESTS ONT ÉCHOUÉ');
    console.log('═'.repeat(60) + '\n');

    return success;
}

// Exécution
runAllTests();

module.exports = { TestRunner, runAllTests };
