/**
 * Atelier 9 : Analyseur de Logs d'Audit
 * 
 * Analyse et agrège les logs de transaction.
 * Usage: node log-analyzer.js
 */

// Logs de test
const sampleLogs = [
    { timestamp: '2026-01-28T14:00:00Z', event: 'AUTH_REQUEST', terminal: 'TERM001', card: '****1111', amount: 50.00, result: 'SUCCESS', code: '00' },
    { timestamp: '2026-01-28T14:01:30Z', event: 'AUTH_REQUEST', terminal: 'TERM001', card: '****2222', amount: 75.00, result: 'SUCCESS', code: '00' },
    { timestamp: '2026-01-28T14:02:00Z', event: 'AUTH_REQUEST', terminal: 'TERM002', card: '****3333', amount: 150.00, result: 'DECLINED', code: '51' },
    { timestamp: '2026-01-28T14:03:00Z', event: 'AUTH_REQUEST', terminal: 'TERM001', card: '****1111', amount: 25.00, result: 'SUCCESS', code: '00' },
    { timestamp: '2026-01-28T14:03:30Z', event: 'PIN_VERIFY', terminal: 'TERM001', card: '****4444', amount: 0, result: 'FAILED', code: '55' },
    { timestamp: '2026-01-28T14:04:00Z', event: 'PIN_VERIFY', terminal: 'TERM001', card: '****4444', amount: 0, result: 'FAILED', code: '55' },
    { timestamp: '2026-01-28T14:04:30Z', event: 'PIN_VERIFY', terminal: 'TERM001', card: '****4444', amount: 0, result: 'FAILED', code: '75' },
    { timestamp: '2026-01-28T14:10:00Z', event: 'AUTH_REQUEST', terminal: 'TERM003', card: '****5555', amount: 5000.00, result: 'DECLINED', code: '61' },
    { timestamp: '2026-01-28T14:15:00Z', event: 'AUTH_REQUEST', terminal: 'TERM001', card: '****1111', amount: 30.00, result: 'SUCCESS', code: '00' },
    { timestamp: '2026-01-28T14:16:00Z', event: 'REVERSAL', terminal: 'TERM001', card: '****1111', amount: 30.00, result: 'SUCCESS', code: '00' }
];

function analyzeByResult() {
    const stats = { SUCCESS: 0, DECLINED: 0, FAILED: 0 };
    sampleLogs.forEach(log => stats[log.result]++);
    return stats;
}

function analyzeByTerminal() {
    const stats = {};
    sampleLogs.forEach(log => {
        stats[log.terminal] = stats[log.terminal] || { total: 0, success: 0, amount: 0 };
        stats[log.terminal].total++;
        if (log.result === 'SUCCESS') stats[log.terminal].success++;
        stats[log.terminal].amount += log.amount;
    });
    return stats;
}

function detectAnomalies() {
    const anomalies = [];
    const cardAttempts = {};

    sampleLogs.forEach(log => {
        if (log.event === 'PIN_VERIFY' && log.result === 'FAILED') {
            cardAttempts[log.card] = (cardAttempts[log.card] || 0) + 1;
            if (cardAttempts[log.card] >= 3) {
                anomalies.push({ type: 'PIN_BLOCKED', card: log.card, attempts: cardAttempts[log.card] });
            }
        }
        if (log.amount >= 5000) {
            anomalies.push({ type: 'HIGH_VALUE', card: log.card, amount: log.amount });
        }
    });

    return anomalies;
}

function demo() {
    console.log('═'.repeat(60));
    console.log('  📊 ANALYSEUR DE LOGS D\'AUDIT - Atelier 9');
    console.log('═'.repeat(60));

    console.log('\n📋 Résumé des résultats:');
    const results = analyzeByResult();
    for (const [result, count] of Object.entries(results)) {
        const icon = result === 'SUCCESS' ? '✅' : '❌';
        console.log(`   ${icon} ${result}: ${count}`);
    }

    console.log('\n📋 Par terminal:');
    const terminals = analyzeByTerminal();
    for (const [term, stats] of Object.entries(terminals)) {
        const rate = ((stats.success / stats.total) * 100).toFixed(0);
        console.log(`   ${term}: ${stats.total} TX, ${rate}% succès, ${stats.amount.toFixed(2)}€ total`);
    }

    console.log('\n🚨 Anomalies détectées:');
    const anomalies = detectAnomalies();
    if (anomalies.length === 0) {
        console.log('   Aucune anomalie');
    } else {
        anomalies.forEach(a => {
            if (a.type === 'PIN_BLOCKED') {
                console.log(`   🔴 PIN bloqué: ${a.card} (${a.attempts} tentatives)`);
            } else {
                console.log(`   🟠 Transaction élevée: ${a.card} - ${a.amount}€`);
            }
        });
    }

    console.log('\n' + '═'.repeat(60));
}

demo();
