/**
 * Atelier 8 : Simulateur de Scénarios de Refus
 * 
 * Simule différents codes de réponse et leur traitement.
 * Usage: node scenario-simulator.js
 */

const fs = require('fs');
const path = require('path');

const codesData = JSON.parse(fs.readFileSync(path.join(__dirname, 'response-codes.json'), 'utf8'));

const scenarios = [
    { name: 'Achat normal', pan: '4111111111111111', amount: 50.00, expectedCode: '00' },
    { name: 'Fonds insuffisants', pan: '4000000000000051', amount: 5000.00, expectedCode: '51' },
    { name: 'Carte expirée', pan: '4000000000000054', amount: 25.00, expectedCode: '54' },
    { name: 'PIN incorrect (1ère)', pan: '4111111111111111', amount: 30.00, expectedCode: '55', pinAttempt: 1 },
    { name: 'Carte perdue', pan: '4000000000000041', amount: 100.00, expectedCode: '41' },
    { name: 'Émetteur indisponible', pan: '4111111111111111', amount: 75.00, expectedCode: '91' },
    { name: 'Plafond dépassé', pan: '4111111111111111', amount: 15000.00, expectedCode: '61' }
];

function simulateTransaction(scenario) {
    const code = scenario.expectedCode;
    const codeInfo = codesData.codes[code];
    const category = codesData.categories[codeInfo.category];

    return {
        scenario: scenario.name,
        pan: scenario.pan.substring(0, 4) + '****' + scenario.pan.substring(12),
        amount: scenario.amount,
        responseCode: code,
        meaning: codeInfo.meaning,
        message: codeInfo.message_fr,
        category: codeInfo.category,
        canRetry: codeInfo.retry,
        action: category.action,
        icon: category.icon
    };
}

function handleResult(result) {
    console.log(`\n${result.icon} ${result.scenario}`);
    console.log(`   Carte: ${result.pan} | Montant: ${result.amount}€`);
    console.log(`   Code: ${result.responseCode} - ${result.meaning}`);
    console.log(`   Message: "${result.message}"`);
    console.log(`   Action: ${result.action}${result.canRetry ? ' (retry possible)' : ''}`);
}

function demo() {
    console.log('═'.repeat(60));
    console.log('  🎰 SIMULATEUR DE SCÉNARIOS DE REFUS - Atelier 8');
    console.log('═'.repeat(60));

    for (const scenario of scenarios) {
        const result = simulateTransaction(scenario);
        handleResult(result);
    }

    console.log('\n' + '═'.repeat(60));
    console.log('  📊 STATISTIQUES PAR CATÉGORIE');
    console.log('═'.repeat(60));

    const stats = {};
    for (const scenario of scenarios) {
        const code = scenario.expectedCode;
        const cat = codesData.codes[code].category;
        stats[cat] = (stats[cat] || 0) + 1;
    }

    for (const [cat, count] of Object.entries(stats)) {
        const info = codesData.categories[cat];
        console.log(`   ${info.icon} ${cat}: ${count} transaction(s)`);
    }
}

demo();
