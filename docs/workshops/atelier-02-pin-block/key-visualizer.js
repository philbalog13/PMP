/**
 * Atelier 2 : Visualisation de la Hiérarchie des Clés
 * 
 * Ce script illustre la structure hiérarchique des clés
 * utilisées dans les systèmes de paiement.
 * 
 * Usage: node key-visualizer.js
 */

const crypto = require('crypto');

// Hiérarchie des clés (simulation pédagogique)
const KEY_HIERARCHY = {
    level1: {
        name: 'Master Key (ZMK/ZMKI)',
        description: 'Clé maître stockée dans le HSM, ne sort JAMAIS',
        color: '\x1b[31m', // Rouge
        keys: {
            ZMK: generateMockKey('ZMK')
        }
    },
    level2: {
        name: 'Zone Keys',
        description: 'Clés de zone dérivées de la clé maître',
        color: '\x1b[33m', // Jaune
        keys: {
            ZPK: generateMockKey('ZPK'),
            ZAK: generateMockKey('ZAK'),
            ZEK: generateMockKey('ZEK')
        }
    },
    level3: {
        name: 'Working Keys',
        description: 'Clés de session utilisées pour les transactions',
        color: '\x1b[32m', // Vert
        keys: {
            TPK: generateMockKey('TPK'),
            TAK: generateMockKey('TAK'),
            TEK: generateMockKey('TEK')
        }
    }
};

const KEY_DESCRIPTIONS = {
    ZMK: 'Zone Master Key - Clé pour l\'échange de clés entre zones',
    ZPK: 'Zone PIN Key - Chiffrement des PIN Blocks',
    ZAK: 'Zone Authentication Key - Génération des MAC',
    ZEK: 'Zone Encryption Key - Chiffrement des données sensibles',
    TPK: 'Terminal PIN Key - Clé PIN au niveau terminal',
    TAK: 'Terminal Authentication Key - MAC terminal',
    TEK: 'Terminal Encryption Key - Chiffrement terminal'
};

/**
 * Génère une clé factice pour la démonstration
 */
function generateMockKey(prefix) {
    const random = crypto.randomBytes(16).toString('hex').toUpperCase();
    return {
        value: random,
        kcv: calculateKCV(random),
        created: new Date().toISOString()
    };
}

/**
 * Calcule le Key Check Value (KCV)
 * Le KCV est le chiffrement de 8 octets de zéros avec la clé
 */
function calculateKCV(keyHex) {
    try {
        const key = Buffer.from(keyHex, 'hex');
        const zeros = Buffer.alloc(8, 0);
        const cipher = crypto.createCipheriv('des-ede3', key, Buffer.alloc(0));
        cipher.setAutoPadding(false);
        const encrypted = cipher.update(zeros);
        return encrypted.toString('hex').substring(0, 6).toUpperCase();
    } catch (e) {
        // Fallback pour les clés de mauvaise taille
        return crypto.createHash('md5').update(keyHex).digest('hex').substring(0, 6).toUpperCase();
    }
}

/**
 * Affiche la hiérarchie des clés
 */
function displayHierarchy() {
    console.log('\n' + '═'.repeat(70));
    console.log('  🔐 HIÉRARCHIE DES CLÉS - SYSTÈME DE PAIEMENT');
    console.log('═'.repeat(70) + '\n');

    console.log('  Structure de sécurité multicouche:\n');
    console.log('                    ┌─────────────────────────────────┐');
    console.log('                    │     \x1b[31m🔴 MASTER KEY (ZMK)\x1b[0m        │');
    console.log('                    │     Niveau: HSM ONLY            │');
    console.log('                    └───────────────┬─────────────────┘');
    console.log('                                    │');
    console.log('              ┌────────────────────┼────────────────────┐');
    console.log('              ▼                    ▼                    ▼');
    console.log('    ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐');
    console.log('    │ \x1b[33m🟡 ZPK (PIN)\x1b[0m    │  │ \x1b[33m🟡 ZAK (MAC)\x1b[0m    │  │ \x1b[33m🟡 ZEK (Data)\x1b[0m   │');
    console.log('    │ Zone Keys       │  │ Zone Keys       │  │ Zone Keys       │');
    console.log('    └────────┬────────┘  └────────┬────────┘  └────────┬────────┘');
    console.log('             │                    │                    │');
    console.log('             ▼                    ▼                    ▼');
    console.log('    ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐');
    console.log('    │ \x1b[32m🟢 TPK\x1b[0m          │  │ \x1b[32m🟢 TAK\x1b[0m          │  │ \x1b[32m🟢 TEK\x1b[0m          │');
    console.log('    │ Terminal Keys   │  │ Terminal Keys   │  │ Terminal Keys   │');
    console.log('    └─────────────────┘  └─────────────────┘  └─────────────────┘\n');

    console.log('─'.repeat(70));
    console.log('  📋 DÉTAIL DES CLÉS GÉNÉRÉES (Simulation)\n');

    for (const [level, data] of Object.entries(KEY_HIERARCHY)) {
        console.log(`${data.color}▶ ${data.name}\x1b[0m`);
        console.log(`  ${data.description}\n`);

        for (const [keyName, keyData] of Object.entries(data.keys)) {
            console.log(`  ${keyName}:`);
            console.log(`    Description: ${KEY_DESCRIPTIONS[keyName]}`);
            console.log(`    Valeur: ${keyData.value}`);
            console.log(`    KCV:    ${keyData.kcv}`);
            console.log('');
        }
    }

    console.log('═'.repeat(70));
    console.log('  ⚠️  RAPPEL SÉCURIT: En production, les clés sont dans des HSM !');
    console.log('═'.repeat(70) + '\n');
}

/**
 * Simule la dérivation d'une clé de session
 */
function demonstrateKeyDerivation() {
    console.log('\n' + '─'.repeat(70));
    console.log('  🔄 DÉMONSTRATION: Dérivation de clé de session\n');

    const zmk = KEY_HIERARCHY.level1.keys.ZMK.value;
    const sessionId = Date.now().toString(16).toUpperCase();

    console.log(`  Clé maître (ZMK): ${zmk.substring(0, 8)}...`);
    console.log(`  Session ID:       ${sessionId}`);

    // Simulation de dérivation (HMAC)
    const derivedKey = crypto.createHmac('sha256', Buffer.from(zmk, 'hex'))
        .update(sessionId)
        .digest('hex')
        .substring(0, 32)
        .toUpperCase();

    console.log(`  Clé dérivée:      ${derivedKey}`);
    console.log(`  KCV:              ${calculateKCV(derivedKey)}`);

    console.log('\n  ✅ La clé de session peut maintenant être utilisée pour cette transaction.\n');
    console.log('─'.repeat(70) + '\n');
}

// Main
displayHierarchy();
demonstrateKeyDerivation();
