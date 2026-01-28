/**
 * Atelier 4 : Détecteur d'Anomalies de Fraude
 * 
 * Implémentation de plusieurs règles de détection de fraude
 * avec scoring et classification du risque.
 * 
 * Usage: node anomaly-detector.js
 */

const fs = require('fs');
const path = require('path');

// Charger les règles
const rulesPath = path.join(__dirname, 'fraud-rules.json');
const config = JSON.parse(fs.readFileSync(rulesPath, 'utf8'));

// Données de test - historique du client
const clientHistory = {
    pan: '4111111111111111',
    averageAmount: 75.00,
    countries: ['FR', 'ES', 'IT'],
    lastTransaction: {
        timestamp: new Date(Date.now() - 30 * 60 * 1000), // 30 min ago
        location: { lat: 48.8566, lon: 2.3522, city: 'Paris', country: 'FR' }
    },
    recentTransactions: [
        { timestamp: new Date(Date.now() - 5 * 60 * 1000), amount: 25.00 },
        { timestamp: new Date(Date.now() - 10 * 60 * 1000), amount: 45.00 },
        { timestamp: new Date(Date.now() - 15 * 60 * 1000), amount: 30.00 }
    ]
};

// Coordonnées des villes pour le test de voyage impossible
const cityCoordinates = {
    'Paris': { lat: 48.8566, lon: 2.3522 },
    'New York': { lat: 40.7128, lon: -74.0060 },
    'Tokyo': { lat: 35.6762, lon: 139.6503 },
    'London': { lat: 51.5074, lon: -0.1278 },
    'Dubai': { lat: 25.2048, lon: 55.2708 }
};

/**
 * Calcule la distance entre deux points GPS (formule Haversine)
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Rayon de la Terre en km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

/**
 * Vérifie la règle de velocity
 */
function checkVelocity(transaction, rule, history) {
    const windowMs = rule.params.windowMinutes * 60 * 1000;
    const now = new Date(transaction.timestamp);

    const recentCount = history.recentTransactions.filter(tx => {
        return (now - new Date(tx.timestamp)) <= windowMs;
    }).length + 1; // +1 pour la transaction actuelle

    if (recentCount > rule.params.maxTransactions) {
        return {
            triggered: true,
            details: `${recentCount} transactions en ${rule.params.windowMinutes} min (max: ${rule.params.maxTransactions})`
        };
    }
    return { triggered: false };
}

/**
 * Vérifie la règle de montant élevé
 */
function checkHighAmount(transaction, rule) {
    if (transaction.amount > rule.params.threshold) {
        return {
            triggered: true,
            details: `Montant ${transaction.amount}€ > seuil ${rule.params.threshold}€`
        };
    }
    return { triggered: false };
}

/**
 * Vérifie le voyage impossible
 */
function checkImpossibleTravel(transaction, rule, history) {
    if (!history.lastTransaction || !transaction.location) return { triggered: false };

    const lastLoc = history.lastTransaction.location;
    const currLoc = transaction.location;

    const distanceKm = calculateDistance(lastLoc.lat, lastLoc.lon, currLoc.lat, currLoc.lon);
    const timeHours = (new Date(transaction.timestamp) - new Date(history.lastTransaction.timestamp)) / (1000 * 60 * 60);

    if (timeHours <= 0) return { triggered: false };

    const speedKmh = distanceKm / timeHours;

    if (speedKmh > rule.params.maxSpeedKmh) {
        return {
            triggered: true,
            details: `${lastLoc.city} → ${currLoc.city}: ${Math.round(distanceKm)}km en ${Math.round(timeHours * 60)}min = ${Math.round(speedKmh)} km/h (max: ${rule.params.maxSpeedKmh})`
        };
    }
    return { triggered: false };
}

/**
 * Vérifie l'anomalie de montant
 */
function checkAmountAnomaly(transaction, rule, history) {
    const threshold = history.averageAmount * rule.params.multiplier;
    if (transaction.amount > threshold) {
        return {
            triggered: true,
            details: `Montant ${transaction.amount}€ > ${rule.params.multiplier}x moyenne (${history.averageAmount}€)`
        };
    }
    return { triggered: false };
}

/**
 * Vérifie le nouveau pays
 */
function checkNewCountry(transaction, rule, history) {
    if (!transaction.location) return { triggered: false };

    if (!history.countries.includes(transaction.location.country)) {
        return {
            triggered: true,
            details: `Premier achat dans le pays: ${transaction.location.country}`
        };
    }
    return { triggered: false };
}

/**
 * Vérifie le MCC à risque
 */
function checkHighRiskMCC(transaction, rule) {
    if (rule.params.riskyMCCs.includes(transaction.mcc)) {
        const mccInfo = config.mccRiskCategories[transaction.mcc] || { name: 'Unknown' };
        return {
            triggered: true,
            details: `MCC à risque: ${transaction.mcc} (${mccInfo.name})`
        };
    }
    return { triggered: false };
}

/**
 * Analyse une transaction avec toutes les règles
 */
function analyzeTransaction(transaction, history) {
    const results = {
        transaction,
        timestamp: new Date().toISOString(),
        triggeredRules: [],
        totalScore: 0,
        riskLevel: 'LOW',
        action: 'APPROVE'
    };

    for (const rule of config.rules) {
        if (!rule.enabled) continue;

        let result = { triggered: false };

        switch (rule.type) {
            case 'velocity':
                result = checkVelocity(transaction, rule, history);
                break;
            case 'amount':
                result = checkHighAmount(transaction, rule);
                break;
            case 'geography':
                result = checkImpossibleTravel(transaction, rule, history);
                break;
            case 'behavior':
                if (rule.id === 'AMOUNT_ANOMALY') {
                    result = checkAmountAnomaly(transaction, rule, history);
                } else if (rule.id === 'NEW_COUNTRY') {
                    result = checkNewCountry(transaction, rule, history);
                }
                break;
            case 'merchant':
                result = checkHighRiskMCC(transaction, rule);
                break;
        }

        if (result.triggered) {
            results.triggeredRules.push({
                id: rule.id,
                name: rule.name,
                weight: rule.weight,
                details: result.details
            });
            results.totalScore += rule.weight;
        }
    }

    // Déterminer le niveau de risque
    for (const [level, threshold] of Object.entries(config.riskThresholds)) {
        if (results.totalScore >= threshold.min && results.totalScore <= threshold.max) {
            results.riskLevel = level.toUpperCase();
            results.action = threshold.action;
            break;
        }
    }

    return results;
}

/**
 * Affiche le résultat de l'analyse
 */
function displayResults(results) {
    const riskColors = {
        'LOW': '\x1b[32m',      // Vert
        'MEDIUM': '\x1b[33m',   // Jaune
        'HIGH': '\x1b[38;5;208m', // Orange
        'CRITICAL': '\x1b[31m'  // Rouge
    };

    console.log('\n' + '═'.repeat(60));
    console.log('  🛡️ ANALYSE DE FRAUDE');
    console.log('═'.repeat(60));

    console.log(`\n📋 Transaction:`);
    console.log(`   Montant: ${results.transaction.amount} EUR`);
    console.log(`   Location: ${results.transaction.location?.city || 'N/A'}`);
    console.log(`   MCC: ${results.transaction.mcc || 'N/A'}`);

    console.log(`\n⚠️ Règles déclenchées (${results.triggeredRules.length}):`);
    console.log('─'.repeat(60));

    if (results.triggeredRules.length === 0) {
        console.log('   Aucune règle déclenchée ✓');
    } else {
        for (const rule of results.triggeredRules) {
            console.log(`   🔸 ${rule.name} (+${rule.weight} points)`);
            console.log(`      ${rule.details}`);
        }
    }

    console.log('\n' + '─'.repeat(60));
    console.log(`   📊 SCORE TOTAL: ${results.totalScore}/100`);
    console.log(`   ${riskColors[results.riskLevel]}🎯 RISQUE: ${results.riskLevel}\x1b[0m`);
    console.log(`   📌 ACTION: ${results.action}`);
    console.log('═'.repeat(60) + '\n');
}

// Démonstration
function demo() {
    console.log('\n' + '═'.repeat(60));
    console.log('  📋 DÉMONSTRATION: Détection de Fraude');
    console.log('═'.repeat(60));

    // Test 1: Transaction normale
    console.log('\n📝 Test 1: Transaction normale');
    const tx1 = {
        amount: 45.00,
        timestamp: new Date(),
        location: cityCoordinates.Paris,
        mcc: '5411'
    };
    tx1.location.city = 'Paris';
    tx1.location.country = 'FR';
    displayResults(analyzeTransaction(tx1, clientHistory));

    // Test 2: Montant élevé + nouveau pays
    console.log('\n📝 Test 2: Montant élevé + Nouveau pays');
    const tx2 = {
        amount: 6000.00,
        timestamp: new Date(),
        location: { ...cityCoordinates.Dubai, city: 'Dubai', country: 'AE' },
        mcc: '5411'
    };
    displayResults(analyzeTransaction(tx2, clientHistory));

    // Test 3: Voyage impossible
    console.log('\n📝 Test 3: Voyage impossible (Paris → Tokyo en 1h)');
    const tx3 = {
        amount: 100.00,
        timestamp: new Date(Date.now() + 60 * 60 * 1000), // 1h après
        location: { ...cityCoordinates.Tokyo, city: 'Tokyo', country: 'JP' },
        mcc: '5812'
    };
    displayResults(analyzeTransaction(tx3, clientHistory));

    // Test 4: Multiple patterns suspects
    console.log('\n📝 Test 4: Multiple patterns suspects');
    const tx4 = {
        amount: 8000.00,
        timestamp: new Date(),
        location: { ...cityCoordinates['New York'], city: 'New York', country: 'US' },
        mcc: '7995' // Gambling
    };
    displayResults(analyzeTransaction(tx4, clientHistory));
}

demo();
