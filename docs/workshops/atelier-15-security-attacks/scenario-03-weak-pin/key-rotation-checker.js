/**
 * Scénario 3 : Outil de Détection
 * Vérifie que la rotation des clés est correctement implémentée
 * 
 * Usage: node key-rotation-checker.js
 */

const crypto = require('crypto');

// Configuration de sécurité recommandée
const SECURITY_REQUIREMENTS = {
    maxKeyAgeHours: 24,           // Rotation toutes les 24h minimum
    minKeyLength: 32,              // 256 bits minimum
    uniqueKeyPerTerminal: true,    // Clé unique par terminal
    dukptEnabled: true,            // DUKPT recommandé
    hsmRequired: true              // Stockage HSM obligatoire
};

// Simulation de l'état du système
const systemState = {
    terminals: [
        { id: 'TERM001', keyId: 'KEY-001', lastRotation: Date.now() - 48 * 60 * 60 * 1000 },
        { id: 'TERM002', keyId: 'KEY-001', lastRotation: Date.now() - 48 * 60 * 60 * 1000 },
        { id: 'TERM003', keyId: 'KEY-002', lastRotation: Date.now() - 2 * 60 * 60 * 1000 },
        { id: 'TERM004', keyId: 'KEY-003', lastRotation: Date.now() - 1 * 60 * 60 * 1000 },
    ],
    keys: {
        'KEY-001': { length: 16, created: Date.now() - 30 * 24 * 60 * 60 * 1000, storage: 'file' },
        'KEY-002': { length: 32, created: Date.now() - 2 * 60 * 60 * 1000, storage: 'hsm' },
        'KEY-003': { length: 32, created: Date.now() - 1 * 60 * 60 * 1000, storage: 'hsm' },
    },
    dukpt: {
        enabled: false,
        futureTxnKey: false
    }
};

/**
 * Vérifie un terminal
 */
function checkTerminal(terminal, allTerminals, keys) {
    const issues = [];
    const keyInfo = keys[terminal.keyId];

    // Vérifier l'âge de la clé
    const keyAgeHours = (Date.now() - terminal.lastRotation) / (60 * 60 * 1000);
    if (keyAgeHours > SECURITY_REQUIREMENTS.maxKeyAgeHours) {
        issues.push({
            severity: 'CRITICAL',
            issue: `Clé non rotée depuis ${keyAgeHours.toFixed(0)}h (max: ${SECURITY_REQUIREMENTS.maxKeyAgeHours}h)`,
            recommendation: 'Rotation immédiate requise'
        });
    }

    // Vérifier si la clé est partagée
    const terminalsWithSameKey = allTerminals.filter(t => t.keyId === terminal.keyId);
    if (terminalsWithSameKey.length > 1) {
        issues.push({
            severity: 'HIGH',
            issue: `Clé partagée avec ${terminalsWithSameKey.length - 1} autre(s) terminal(aux)`,
            recommendation: 'Implémenter des clés uniques par terminal'
        });
    }

    // Vérifier la longueur de la clé
    if (keyInfo && keyInfo.length < SECURITY_REQUIREMENTS.minKeyLength) {
        issues.push({
            severity: 'HIGH',
            issue: `Clé trop courte: ${keyInfo.length * 8} bits (min: ${SECURITY_REQUIREMENTS.minKeyLength * 8} bits)`,
            recommendation: 'Utiliser AES-256 ou 3DES-168'
        });
    }

    // Vérifier le stockage
    if (keyInfo && keyInfo.storage !== 'hsm') {
        issues.push({
            severity: 'MEDIUM',
            issue: `Clé stockée dans: ${keyInfo.storage} (recommandé: HSM)`,
            recommendation: 'Migrer vers un HSM'
        });
    }

    return issues;
}

/**
 * Vérifie la configuration DUKPT
 */
function checkDUKPT(dukptConfig) {
    const issues = [];

    if (!dukptConfig.enabled) {
        issues.push({
            severity: 'HIGH',
            issue: 'DUKPT non activé',
            recommendation: 'Implémenter DUKPT pour dérivation par transaction'
        });
    }

    if (dukptConfig.enabled && !dukptConfig.futureTxnKey) {
        issues.push({
            severity: 'MEDIUM',
            issue: 'DUKPT: Future Transaction Key non configuré',
            recommendation: 'Activer la prédérivation des clés'
        });
    }

    return issues;
}

/**
 * Effectue l'audit complet
 */
function runAudit(state) {
    console.log('═'.repeat(60));
    console.log('  🔍 AUDIT DE ROTATION DES CLÉS - Scénario 3');
    console.log('═'.repeat(60));

    const results = {
        terminals: {},
        dukpt: [],
        summary: { critical: 0, high: 0, medium: 0, low: 0 }
    };

    // Vérifier chaque terminal
    console.log('\n📋 ANALYSE DES TERMINAUX:');
    console.log('─'.repeat(60));

    for (const terminal of state.terminals) {
        const issues = checkTerminal(terminal, state.terminals, state.keys);
        results.terminals[terminal.id] = issues;

        console.log(`\n  Terminal: ${terminal.id}`);
        console.log(`  Clé: ${terminal.keyId}`);

        if (issues.length === 0) {
            console.log('  Status: ✅ Conforme');
        } else {
            console.log('  Status: ❌ Non conforme');
            issues.forEach(issue => {
                console.log(`    ⚠️ [${issue.severity}] ${issue.issue}`);
                results.summary[issue.severity.toLowerCase()]++;
            });
        }
    }

    // Vérifier DUKPT
    console.log('\n\n📋 CONFIGURATION DUKPT:');
    console.log('─'.repeat(60));

    const dukptIssues = checkDUKPT(state.dukpt);
    results.dukpt = dukptIssues;

    console.log(`  DUKPT activé: ${state.dukpt.enabled ? '✅ Oui' : '❌ Non'}`);

    dukptIssues.forEach(issue => {
        console.log(`  ⚠️ [${issue.severity}] ${issue.issue}`);
        results.summary[issue.severity.toLowerCase()]++;
    });

    // Résumé
    console.log('\n' + '═'.repeat(60));
    console.log('  📊 RÉSUMÉ DE L\'AUDIT');
    console.log('═'.repeat(60));

    const totalIssues = results.summary.critical + results.summary.high +
        results.summary.medium + results.summary.low;

    console.log(`\n  Total issues: ${totalIssues}`);
    console.log(`    🔴 Critical: ${results.summary.critical}`);
    console.log(`    🟠 High:     ${results.summary.high}`);
    console.log(`    🟡 Medium:   ${results.summary.medium}`);
    console.log(`    🟢 Low:      ${results.summary.low}`);

    if (results.summary.critical > 0) {
        console.log('\n  ❌ SYSTÈME VULNÉRABLE - Action immédiate requise!');
    } else if (results.summary.high > 0) {
        console.log('\n  ⚠️  RISQUES ÉLEVÉS - Corrections prioritaires nécessaires');
    } else {
        console.log('\n  ✅ Système globalement conforme');
    }

    console.log('\n' + '─'.repeat(60));
    console.log('  💡 RECOMMANDATIONS PRIORITAIRES:');
    console.log('─'.repeat(60));
    console.log(`
  1. Activer DUKPT pour dérivation par transaction
  2. Implémenter la rotation automatique (< 24h)
  3. Migrer toutes les clés vers HSM
  4. Supprimer les clés partagées entre terminaux
`);
    console.log('═'.repeat(60) + '\n');

    return results;
}

// Exécution
runAudit(systemState);

module.exports = { checkTerminal, checkDUKPT, runAudit };
