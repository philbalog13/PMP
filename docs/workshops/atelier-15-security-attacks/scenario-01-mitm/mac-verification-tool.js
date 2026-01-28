/**
 * Scénario 1 : Outil de Détection
 * Vérifie la présence et validité du MAC sur les messages ISO 8583
 * 
 * Usage: node mac-verification-tool.js
 */

const crypto = require('crypto');

// Clé MAC pour vérification (en production: dans HSM)
const MAC_KEY = '0123456789ABCDEFFEDCBA9876543210';

// Champs critiques qui DOIVENT avoir un MAC
const CRITICAL_FIELDS = ['DE4', 'DE38', 'DE39', 'DE41', 'DE42'];

/**
 * Calcule le MAC d'un message
 */
function calculateMAC(message, key) {
    return crypto.createHmac('sha256', key)
        .update(message)
        .digest('hex')
        .substring(0, 16)
        .toUpperCase();
}

/**
 * Vérifie si un message a un MAC valide
 */
function verifyMAC(message, providedMAC, key) {
    const calculatedMAC = calculateMAC(message, key);
    return {
        valid: calculatedMAC === providedMAC,
        calculated: calculatedMAC,
        provided: providedMAC
    };
}

/**
 * Analyse un message ISO 8583 pour les vulnérabilités MAC
 */
function analyzeMessage(messageData) {
    const results = {
        vulnerable: false,
        issues: [],
        recommendations: []
    };

    // Vérifier la présence du MAC
    if (!messageData.mac) {
        results.vulnerable = true;
        results.issues.push({
            severity: 'CRITICAL',
            field: 'DE64/DE128',
            issue: 'MAC absent du message',
            impact: 'Message peut être modifié sans détection'
        });
        results.recommendations.push('Ajouter un MAC obligatoire (DE64 ou DE128)');
    } else {
        // Vérifier la validité du MAC
        const macCheck = verifyMAC(messageData.content, messageData.mac, MAC_KEY);
        if (!macCheck.valid) {
            results.vulnerable = true;
            results.issues.push({
                severity: 'CRITICAL',
                field: 'MAC',
                issue: 'MAC invalide - message potentiellement altéré',
                expected: macCheck.calculated,
                received: macCheck.provided
            });
            results.recommendations.push('Rejeter les messages avec MAC invalide');
        }
    }

    // Vérifier quels champs sont protégés par le MAC
    if (messageData.macCoverage) {
        for (const field of CRITICAL_FIELDS) {
            if (!messageData.macCoverage.includes(field)) {
                results.vulnerable = true;
                results.issues.push({
                    severity: 'HIGH',
                    field: field,
                    issue: `Champ ${field} non couvert par le MAC`,
                    impact: 'Ce champ peut être modifié sans détection'
                });
            }
        }
    }

    return results;
}

/**
 * Scan d'un lot de messages
 */
function scanMessages(messages) {
    console.log('═'.repeat(60));
    console.log('  🔍 OUTIL DE VÉRIFICATION MAC - Scénario 1');
    console.log('═'.repeat(60));
    console.log(`\n  Analyse de ${messages.length} message(s)...\n`);

    let vulnerableCount = 0;
    const allIssues = [];

    for (let i = 0; i < messages.length; i++) {
        const msg = messages[i];
        const analysis = analyzeMessage(msg);

        console.log(`─── Message ${i + 1} ───`);
        console.log(`  MTI: ${msg.mti}`);
        console.log(`  PAN: ****${msg.pan?.slice(-4) || 'N/A'}`);
        console.log(`  Montant: ${msg.amount ? (parseInt(msg.amount) / 100).toFixed(2) + ' EUR' : 'N/A'}`);

        if (analysis.vulnerable) {
            vulnerableCount++;
            console.log('  Status: ❌ VULNÉRABLE');
            analysis.issues.forEach(issue => {
                console.log(`    ⚠️ [${issue.severity}] ${issue.field}: ${issue.issue}`);
                allIssues.push(issue);
            });
        } else {
            console.log('  Status: ✅ PROTÉGÉ');
        }
        console.log();
    }

    // Résumé
    console.log('═'.repeat(60));
    console.log('  📊 RÉSUMÉ DE L\'ANALYSE');
    console.log('═'.repeat(60));
    console.log(`  Messages analysés:   ${messages.length}`);
    console.log(`  Messages vulnérables: ${vulnerableCount}`);
    console.log(`  Messages protégés:   ${messages.length - vulnerableCount}`);

    if (allIssues.length > 0) {
        console.log('\n  📋 RECOMMANDATIONS:');
        const uniqueRecs = [...new Set(allIssues.map(i => i.issue))];
        uniqueRecs.forEach((rec, idx) => {
            console.log(`    ${idx + 1}. Corriger: ${rec}`);
        });
    }

    console.log('═'.repeat(60) + '\n');

    return { vulnerableCount, total: messages.length, issues: allIssues };
}

// Messages de test
const testMessages = [
    {
        mti: '0100',
        pan: '4111111111111111',
        amount: '000010000',
        content: '0100|4111111111111111|000000|000010000|123456',
        mac: null,  // PAS DE MAC - VULNÉRABLE
        macCoverage: []
    },
    {
        mti: '0100',
        pan: '5500000000000004',
        amount: '000005000',
        content: '0100|5500000000000004|000000|000005000|234567',
        mac: 'A1B2C3D4E5F60718',  // MAC présent mais invalide
        macCoverage: ['DE2', 'DE3']  // DE4 non couvert
    },
    {
        mti: '0100',
        pan: '340000000000009',
        amount: '000012500',
        content: '0100|340000000000009|000000|000012500|345678',
        mac: calculateMAC('0100|340000000000009|000000|000012500|345678', MAC_KEY),
        macCoverage: ['DE2', 'DE3', 'DE4', 'DE38', 'DE39', 'DE41', 'DE42']
    }
];

// Exécution
scanMessages(testMessages);

module.exports = { calculateMAC, verifyMAC, analyzeMessage, scanMessages };
