/**
 * Atelier 14 : Outil d'Audit de Conformité PCI-DSS
 * 
 * Vérifie automatiquement certains contrôles PCI-DSS.
 * 
 * Usage: node compliance-auditor.js
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Charger la checklist
const checklistPath = path.join(__dirname, 'pci-checklist.json');
const checklist = JSON.parse(fs.readFileSync(checklistPath, 'utf8'));

// Simuler des données système pour l'audit
const systemConfig = {
    passwords: {
        defaultPasswordsRemoved: true,
        minLength: 12,
        complexity: true,
        mfaEnabled: true
    },
    encryption: {
        tlsVersion: 'TLS 1.3',
        cipherSuites: ['AES-256-GCM'],
        panEncrypted: true
    },
    logging: {
        enabled: true,
        retentionDays: 365,
        tamperProof: true,
        synced: true
    },
    accessControl: {
        leastPrivilege: true,
        uniqueUserIds: true,
        sessionTimeout: 15
    },
    dataProtection: {
        panMasked: true,
        sensitiveDataPurged: true,
        tokenizationEnabled: true
    }
};

// Règles d'audit automatisées
const auditRules = {
    '2.1': () => systemConfig.passwords.defaultPasswordsRemoved,
    '2.3': () => systemConfig.encryption.tlsVersion >= 'TLS 1.2',
    '3.3': () => systemConfig.dataProtection.panMasked,
    '3.4': () => systemConfig.encryption.panEncrypted || systemConfig.dataProtection.tokenizationEnabled,
    '4.1': () => systemConfig.encryption.tlsVersion >= 'TLS 1.2',
    '7.1': () => systemConfig.accessControl.leastPrivilege,
    '8.1': () => systemConfig.accessControl.uniqueUserIds,
    '8.2': () => systemConfig.passwords.mfaEnabled,
    '8.3': () => systemConfig.passwords.minLength >= 12 && systemConfig.passwords.complexity,
    '8.4': () => systemConfig.accessControl.sessionTimeout <= 15,
    '10.1': () => systemConfig.logging.enabled,
    '10.4': () => systemConfig.logging.synced,
    '10.5': () => systemConfig.logging.tamperProof,
    '10.7': () => systemConfig.logging.retentionDays >= 365
};

/**
 * Exécute l'audit de conformité
 */
function runAudit() {
    const results = {
        passed: 0,
        failed: 0,
        manual: 0,
        total: 0,
        details: []
    };

    for (const requirement of checklist.requirements) {
        for (const check of requirement.checks) {
            results.total++;

            const rule = auditRules[check.id];
            let status, icon;

            if (rule) {
                const passed = rule();
                status = passed ? 'PASS' : 'FAIL';
                icon = passed ? '✅' : '❌';
                if (passed) results.passed++; else results.failed++;
            } else {
                status = 'MANUAL';
                icon = '🔍';
                results.manual++;
            }

            results.details.push({
                id: check.id,
                description: check.description,
                status,
                icon
            });
        }
    }

    return results;
}

/**
 * Génère un rapport d'audit
 */
function generateReport(results) {
    console.log('═'.repeat(70));
    console.log('  📋 RAPPORT D\'AUDIT PCI-DSS - Atelier 14');
    console.log('═'.repeat(70));

    console.log(`\n📊 RÉSUMÉ:`);
    console.log(`   Total contrôles:     ${results.total}`);
    console.log(`   ✅ Passés:           ${results.passed}`);
    console.log(`   ❌ Échoués:          ${results.failed}`);
    console.log(`   🔍 Vérif. manuelle:  ${results.manual}`);

    const complianceRate = ((results.passed / (results.passed + results.failed)) * 100).toFixed(1);
    const complianceStatus = complianceRate >= 100 ? '🟢 CONFORME' :
        complianceRate >= 80 ? '🟡 PARTIELLEMENT CONFORME' :
            '🔴 NON CONFORME';

    console.log(`\n   📈 Taux de conformité: ${complianceRate}%`);
    console.log(`   📌 Statut: ${complianceStatus}`);

    console.log('\n' + '─'.repeat(70));
    console.log('  DÉTAIL DES CONTRÔLES');
    console.log('─'.repeat(70));

    let currentReq = '';
    for (const detail of results.details) {
        const reqNum = detail.id.split('.')[0];
        if (reqNum !== currentReq) {
            const req = checklist.requirements.find(r => r.number === reqNum);
            console.log(`\n📁 Exigence ${reqNum}: ${req.title}`);
            currentReq = reqNum;
        }
        console.log(`   ${detail.icon} ${detail.id}: ${detail.description.substring(0, 50)}`);
    }

    console.log('\n' + '═'.repeat(70));
    console.log('  🔒 RECOMMANDATIONS');
    console.log('═'.repeat(70));

    const failed = results.details.filter(d => d.status === 'FAIL');
    if (failed.length === 0) {
        console.log('\n   ✅ Tous les contrôles automatisés sont passés!');
    } else {
        console.log('\n   Les contrôles suivants nécessitent une attention:');
        for (const f of failed) {
            console.log(`   ❌ ${f.id}: ${f.description}`);
        }
    }

    console.log('\n' + '═'.repeat(70));
    console.log(`  Rapport généré le: ${new Date().toISOString()}`);
    console.log('═'.repeat(70) + '\n');
}

/**
 * Simule un log d'audit conforme PCI
 */
function logAuditEvent(event) {
    const auditLog = {
        timestamp: new Date().toISOString(),
        event_id: crypto.randomUUID(),
        ...event,
        source_system: 'compliance-auditor',
        integrity_hash: null
    };

    // Ajouter un hash d'intégrité
    const dataToHash = JSON.stringify({ ...auditLog, integrity_hash: undefined });
    auditLog.integrity_hash = crypto.createHash('sha256').update(dataToHash).digest('hex').substring(0, 16);

    console.log('📝 Audit Log:', JSON.stringify(auditLog, null, 2));
    return auditLog;
}

// Démonstration
function demo() {
    // Logger le début de l'audit
    logAuditEvent({
        event_type: 'AUDIT_STARTED',
        user_id: 'auditor@example.com',
        action: 'RUN_COMPLIANCE_CHECK',
        component: 'PCI-DSS_AUDITOR'
    });

    // Exécuter l'audit
    const results = runAudit();
    generateReport(results);

    // Logger la fin de l'audit
    logAuditEvent({
        event_type: 'AUDIT_COMPLETED',
        user_id: 'auditor@example.com',
        action: 'GENERATE_REPORT',
        result: results.failed > 0 ? 'ISSUES_FOUND' : 'ALL_PASSED',
        compliance_rate: ((results.passed / (results.passed + results.failed)) * 100).toFixed(1) + '%'
    });
}

demo();
