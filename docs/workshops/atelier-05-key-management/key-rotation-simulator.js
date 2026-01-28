/**
 * Atelier 5 : Simulateur de Rotation de Clés
 * 
 * Démontre le processus complet de rotation d'une clé
 * de zone (ZPK) incluant la distribution aux terminaux.
 * 
 * Usage: node key-rotation-simulator.js
 */

const crypto = require('crypto');

// Simulation d'une base de données de clés
const keyStore = {
    current: {
        ZPK: {
            key: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAA1111',
            kcv: 'A11111',
            version: 1,
            activatedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 jours
            expiresAt: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000) // expire dans 1 jour
        }
    },
    pending: null,
    history: []
};

// Simulation des terminaux
const terminals = [
    { id: 'TERM001', name: 'Boutique Paris', zpkVersion: 1, status: 'ACTIVE' },
    { id: 'TERM002', name: 'Café Lyon', zpkVersion: 1, status: 'ACTIVE' },
    { id: 'TERM003', name: 'Restaurant Marseille', zpkVersion: 1, status: 'ACTIVE' },
    { id: 'TERM004', name: 'Shop Bordeaux', zpkVersion: 1, status: 'OFFLINE' }
];

/**
 * Génère une nouvelle clé
 */
function generateKey() {
    return crypto.randomBytes(16).toString('hex').toUpperCase();
}

/**
 * Calcule le KCV
 */
function calculateKCV(keyHex) {
    return crypto.createHash('sha256').update(keyHex).digest('hex').substring(0, 6).toUpperCase();
}

/**
 * Affiche l'état du système
 */
function displaySystemState() {
    console.log('\n┌' + '─'.repeat(68) + '┐');
    console.log('│' + ' ÉTAT DU SYSTÈME DE CLÉS '.padStart(47).padEnd(68) + '│');
    console.log('├' + '─'.repeat(68) + '┤');

    const current = keyStore.current.ZPK;
    const age = Math.floor((Date.now() - new Date(current.activatedAt)) / (24 * 60 * 60 * 1000));
    const expires = Math.floor((new Date(current.expiresAt) - Date.now()) / (24 * 60 * 60 * 1000));

    console.log(`│ ZPK Actuelle:                                                      │`);
    console.log(`│   Version: ${current.version}                                                        │`);
    console.log(`│   KCV:     ${current.kcv}                                                      │`);
    console.log(`│   Âge:     ${age} jour(s)                                                    │`);
    console.log(`│   Expire:  ${expires > 0 ? expires + ' jour(s)' : '⚠️  EXPIRÉ!'}                                                   │`);

    if (keyStore.pending) {
        console.log('├' + '─'.repeat(68) + '┤');
        console.log(`│ ZPK Pendante:                                                      │`);
        console.log(`│   Version: ${keyStore.pending.version}                                                        │`);
        console.log(`│   KCV:     ${keyStore.pending.kcv}                                                      │`);
    }

    console.log('├' + '─'.repeat(68) + '┤');
    console.log(`│ Terminaux:                                                         │`);

    for (const term of terminals) {
        const status = term.status === 'ACTIVE' ? '🟢' : '🔴';
        const zpkStatus = term.zpkVersion === current.version ? '✓' : '⚠️';
        console.log(`│   ${status} ${term.id}: ${term.name.padEnd(25)} ZPK v${term.zpkVersion} ${zpkStatus}       │`);
    }

    console.log('└' + '─'.repeat(68) + '┘');
}

/**
 * Étape 1: Génération de la nouvelle clé
 */
function step1_GenerateNewKey() {
    console.log('\n' + '═'.repeat(60));
    console.log('  ÉTAPE 1: Génération de la nouvelle ZPK');
    console.log('═'.repeat(60));

    const newKey = generateKey();
    const newKcv = calculateKCV(newKey);
    const newVersion = keyStore.current.ZPK.version + 1;

    keyStore.pending = {
        key: newKey,
        kcv: newKcv,
        version: newVersion,
        generatedAt: new Date().toISOString()
    };

    console.log(`\n   ✅ Nouvelle clé générée`);
    console.log(`   Version: ${newVersion}`);
    console.log(`   KCV:     ${newKcv}`);
    console.log(`   Status:  PENDING (en attente de distribution)`);

    return true;
}

/**
 * Étape 2: Distribution aux terminaux
 */
function step2_DistributeToTerminals() {
    console.log('\n' + '═'.repeat(60));
    console.log('  ÉTAPE 2: Distribution aux terminaux');
    console.log('═'.repeat(60));

    if (!keyStore.pending) {
        console.log('\n   ❌ Aucune clé pendante à distribuer');
        return false;
    }

    let distributed = 0;
    let failed = 0;

    for (const term of terminals) {
        process.stdout.write(`\n   📡 Distribution vers ${term.id}...`);

        if (term.status === 'OFFLINE') {
            console.log(' ❌ OFFLINE');
            failed++;
            continue;
        }

        // Simulation de l'envoi (chiffré avec la clé actuelle)
        const encryptedNewKey = `[ENCRYPTED:${keyStore.pending.kcv}]`;
        console.log(` ✅ OK`);
        console.log(`      Payload: ${encryptedNewKey}`);

        // Mise à jour du terminal
        term.zpkVersion = keyStore.pending.version;
        term.lastKeyUpdate = new Date().toISOString();
        distributed++;
    }

    console.log(`\n   📊 Résultat: ${distributed} réussi(s), ${failed} échoué(s)`);

    return distributed > 0;
}

/**
 * Étape 3: Activation de la nouvelle clé
 */
function step3_ActivateNewKey() {
    console.log('\n' + '═'.repeat(60));
    console.log('  ÉTAPE 3: Activation de la nouvelle ZPK');
    console.log('═'.repeat(60));

    if (!keyStore.pending) {
        console.log('\n   ❌ Aucune clé pendante à activer');
        return false;
    }

    // Vérifier que tous les terminaux actifs ont la nouvelle clé
    const activeTerminals = terminals.filter(t => t.status === 'ACTIVE');
    const updatedTerminals = activeTerminals.filter(t => t.zpkVersion === keyStore.pending.version);

    if (updatedTerminals.length < activeTerminals.length) {
        console.log('\n   ⚠️ Tous les terminaux actifs n\'ont pas reçu la clé');
        console.log(`      ${updatedTerminals.length}/${activeTerminals.length} terminaux mis à jour`);
        console.log('      Forcer l\'activation? (simulation: oui)');
    }

    // Archiver l'ancienne clé
    keyStore.history.push({
        ...keyStore.current.ZPK,
        revokedAt: new Date().toISOString()
    });

    // Activer la nouvelle clé
    keyStore.current.ZPK = {
        ...keyStore.pending,
        activatedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // +30 jours
    };

    keyStore.pending = null;

    console.log('\n   ✅ Nouvelle ZPK activée');
    console.log(`   Version: ${keyStore.current.ZPK.version}`);
    console.log(`   Validité: 30 jours`);

    return true;
}

/**
 * Scénario de compromission
 */
function scenario_KeyCompromised() {
    console.log('\n' + '🚨'.repeat(30));
    console.log('  ALERTE: COMPROMISSION DE CLÉ DÉTECTÉE!');
    console.log('🚨'.repeat(30));

    console.log('\n   📋 Procédure d\'urgence initiée:');
    console.log('   1. Révoquer immédiatement la clé compromise');
    console.log('   2. Générer une nouvelle clé');
    console.log('   3. Distribution d\'urgence');
    console.log('   4. Invalider toutes les transactions en cours');

    // Révoquer l'ancienne
    keyStore.history.push({
        ...keyStore.current.ZPK,
        revokedAt: new Date().toISOString(),
        reason: 'COMPROMISED'
    });

    // Générer et activer immédiatement
    const emergencyKey = generateKey();
    keyStore.current.ZPK = {
        key: emergencyKey,
        kcv: calculateKCV(emergencyKey),
        version: keyStore.current.ZPK.version + 100, // Saut de version pour marquer l'urgence
        activatedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 jours seulement
        emergency: true
    };

    console.log('\n   ✅ Nouvelle clé d\'urgence générée');
    console.log(`   Version: ${keyStore.current.ZPK.version} (saut d'urgence)`);
    console.log(`   Validité réduite: 7 jours`);

    // Forcer la mise à jour des terminaux
    for (const term of terminals) {
        if (term.status === 'ACTIVE') {
            term.zpkVersion = keyStore.current.ZPK.version;
        }
    }

    console.log('\n   📡 Distribution forcée aux terminaux actifs');
}

/**
 * Démonstration complète
 */
function demo() {
    console.log('═'.repeat(60));
    console.log('  🔄 SIMULATEUR DE ROTATION DE CLÉS - Atelier 5');
    console.log('═'.repeat(60));

    // État initial
    console.log('\n📋 ÉTAT INITIAL:');
    displaySystemState();

    // Processus de rotation normal
    console.log('\n\n' + '▓'.repeat(60));
    console.log('  PROCESSUS DE ROTATION PLANIFIÉE');
    console.log('▓'.repeat(60));

    step1_GenerateNewKey();
    step2_DistributeToTerminals();
    step3_ActivateNewKey();

    // État après rotation
    console.log('\n📋 ÉTAT APRÈS ROTATION:');
    displaySystemState();

    // Scénario de compromission
    console.log('\n\n' + '▓'.repeat(60));
    console.log('  SCÉNARIO: COMPROMISSION DE CLÉ');
    console.log('▓'.repeat(60));

    scenario_KeyCompromised();

    // État final
    console.log('\n📋 ÉTAT APRÈS COMPROMISSION:');
    displaySystemState();

    // Historique
    console.log('\n' + '═'.repeat(60));
    console.log('  📚 HISTORIQUE DES CLÉS');
    console.log('═'.repeat(60));

    for (const key of keyStore.history) {
        console.log(`\n   Version ${key.version}:`);
        console.log(`     KCV: ${key.kcv}`);
        console.log(`     Révoquée: ${key.revokedAt}`);
        if (key.reason) console.log(`     Raison: ${key.reason}`);
    }
}

// Exécution
demo();
