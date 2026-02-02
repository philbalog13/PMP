/**
 * Script de test automatisé - 4 Personas + Sécurité
 * Execute: node test-personas.js
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:8000';
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

// Résultats des tests
const results = {
    passed: 0,
    failed: 0,
    tests: []
};

// Helper functions
const log = (message, color = 'reset') => {
    console.log(`${colors[color]}${message}${colors.reset}`);
};

const testResult = (testName, passed, details = '') => {
    const symbol = passed ? '✅' : '❌';
    const color = passed ? 'green' : 'red';
    log(`${symbol} ${testName}`, color);
    if (details) {
        log(`   ${details}`, 'cyan');
    }
    results.tests.push({ testName, passed, details });
    if (passed) results.passed++;
    else results.failed++;
};

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// API Helpers
const register = async (userData) => {
    try {
        const response = await axios.post(`${BASE_URL}/api/auth/register`, userData);
        return { success: true, data: response.data };
    } catch (error) {
        return {
            success: false,
            error: error.response?.data || error.message,
            status: error.response?.status
        };
    }
};

const login = async (email, password, code2fa = null) => {
    try {
        const payload = { email, password };
        if (code2fa) payload.code2fa = code2fa;

        const response = await axios.post(`${BASE_URL}/api/auth/login`, payload);
        return { success: true, data: response.data };
    } catch (error) {
        return {
            success: false,
            error: error.response?.data || error.message,
            status: error.response?.status
        };
    }
};

const callEndpoint = async (path, token, method = 'GET') => {
    try {
        const response = await axios({
            method,
            url: `${BASE_URL}${path}`,
            headers: { Authorization: `Bearer ${token}` }
        });
        return { success: true, data: response.data, status: response.status };
    } catch (error) {
        return {
            success: false,
            error: error.response?.data || error.message,
            status: error.response?.status
        };
    }
};

const logout = async (token) => {
    try {
        const response = await axios.post(
            `${BASE_URL}/api/auth/logout`,
            {},
            { headers: { Authorization: `Bearer ${token}` } }
        );
        return { success: true, data: response.data };
    } catch (error) {
        return { success: false, error: error.response?.data || error.message };
    }
};

// Test suites
const testClient = async () => {
    log('\n🔵 TEST PERSONA: CLIENT', 'blue');
    log('━'.repeat(60), 'blue');

    // 1. Register avec mot de passe faible (devrait échouer)
    const weakPassword = await register({
        username: 'client_weak',
        email: 'client_weak@test.com',
        password: '123456',
        firstName: 'Test',
        lastName: 'Weak',
        role: 'ROLE_CLIENT'
    });
    testResult(
        'CLIENT - Register avec mot de passe faible (devrait échouer)',
        !weakPassword.success && weakPassword.status === 400,
        `Code: ${weakPassword.error?.code || 'N/A'}`
    );

    // 2. Register avec mot de passe fort
    const registerResult = await register({
        username: 'client1',
        email: 'client@test.com',
        password: 'ClientTest123!@#',
        firstName: 'Jean',
        lastName: 'Dupont',
        role: 'ROLE_CLIENT'
    });
    testResult(
        'CLIENT - Register avec mot de passe fort',
        registerResult.success,
        `User ID: ${registerResult.data?.user?.id || 'N/A'}`
    );

    // 3. Login
    const loginResult = await login('client@test.com', 'ClientTest123!@#');
    testResult(
        'CLIENT - Login',
        loginResult.success && loginResult.data?.token,
        `Token présent: ${loginResult.data?.token ? 'OUI' : 'NON'}`
    );

    if (!loginResult.success) return null;
    const token = loginResult.data.token;

    // 4. Accès endpoint autorisé
    const cardsAccess = await callEndpoint('/api/client/cards', token);
    testResult(
        'CLIENT - Accès /api/client/cards (autorisé)',
        cardsAccess.success || cardsAccess.status === 502, // 502 = service backend pas dispo
        `Status: ${cardsAccess.status}`
    );

    // 5. Accès endpoint NON autorisé (cross-role)
    const merchantAccess = await callEndpoint('/api/marchand/transactions', token);
    testResult(
        'CLIENT - Accès /api/marchand/transactions (interdit)',
        !merchantAccess.success && merchantAccess.status === 403,
        `Status: ${merchantAccess.status} (devrait être 403)`
    );

    return token;
};

const testMarchand = async () => {
    log('\n🟢 TEST PERSONA: MARCHAND', 'green');
    log('━'.repeat(60), 'green');

    // Register
    const registerResult = await register({
        username: 'marchand1',
        email: 'marchand@test.com',
        password: 'MarchandTest123!@#',
        firstName: 'Marie',
        lastName: 'Commerce',
        role: 'ROLE_MARCHAND'
    });
    testResult(
        'MARCHAND - Register',
        registerResult.success,
        `User ID: ${registerResult.data?.user?.id || 'N/A'}`
    );

    // Login
    const loginResult = await login('marchand@test.com', 'MarchandTest123!@#');
    testResult(
        'MARCHAND - Login',
        loginResult.success && loginResult.data?.token,
        `Token présent: ${loginResult.data?.token ? 'OUI' : 'NON'}`
    );

    if (!loginResult.success) return null;
    const token = loginResult.data.token;

    // Accès endpoint autorisé
    const transactionsAccess = await callEndpoint('/api/marchand/transactions', token);
    testResult(
        'MARCHAND - Accès /api/marchand/transactions',
        transactionsAccess.success || transactionsAccess.status === 502,
        `Status: ${transactionsAccess.status}`
    );

    const reportsAccess = await callEndpoint('/api/marchand/reports/daily', token);
    testResult(
        'MARCHAND - Accès /api/marchand/reports/daily',
        reportsAccess.success || reportsAccess.status === 502,
        `Status: ${reportsAccess.status}`
    );

    // Accès endpoint NON autorisé
    const clientAccess = await callEndpoint('/api/client/cards', token);
    testResult(
        'MARCHAND - Accès /api/client/cards (interdit)',
        !clientAccess.success && clientAccess.status === 403,
        `Status: ${clientAccess.status} (devrait être 403)`
    );

    return token;
};

const testEtudiant = async () => {
    log('\n🟡 TEST PERSONA: ÉTUDIANT', 'yellow');
    log('━'.repeat(60), 'yellow');

    // Register
    const registerResult = await register({
        username: 'etudiant1',
        email: 'etudiant@test.com',
        password: 'EtudiantTest123!@#',
        firstName: 'Paul',
        lastName: 'Martin',
        role: 'ROLE_ETUDIANT'
    });
    testResult(
        'ÉTUDIANT - Register',
        registerResult.success,
        `User ID: ${registerResult.data?.user?.id || 'N/A'}`
    );

    // Login
    const loginResult = await login('etudiant@test.com', 'EtudiantTest123!@#');
    testResult(
        'ÉTUDIANT - Login',
        loginResult.success && loginResult.data?.token,
        `Token présent: ${loginResult.data?.token ? 'OUI' : 'NON'}`
    );

    if (!loginResult.success) return null;
    const token = loginResult.data.token;

    // Accès endpoints autorisés
    const progressionAccess = await callEndpoint('/api/etudiant/progression', token);
    testResult(
        'ÉTUDIANT - Accès /api/etudiant/progression',
        progressionAccess.success || progressionAccess.status === 502,
        `Status: ${progressionAccess.status}`
    );

    const quizAccess = await callEndpoint('/api/etudiant/quiz', token);
    testResult(
        'ÉTUDIANT - Accès /api/etudiant/quiz',
        quizAccess.success || quizAccess.status === 502,
        `Status: ${quizAccess.status}`
    );

    const exercisesAccess = await callEndpoint('/api/etudiant/exercises', token);
    testResult(
        'ÉTUDIANT - Accès /api/etudiant/exercises',
        exercisesAccess.success || exercisesAccess.status === 502,
        `Status: ${exercisesAccess.status}`
    );

    return token;
};

const testFormateur = async () => {
    log('\n🔴 TEST PERSONA: FORMATEUR (avec 2FA)', 'red');
    log('━'.repeat(60), 'red');

    // Register
    const registerResult = await register({
        username: 'formateur1',
        email: 'formateur@test.com',
        password: 'FormateurTest123!@#',
        firstName: 'Sophie',
        lastName: 'Prof',
        role: 'ROLE_FORMATEUR'
    });
    testResult(
        'FORMATEUR - Register',
        registerResult.success,
        `User ID: ${registerResult.data?.user?.id || 'N/A'}`
    );

    // Login SANS 2FA (devrait échouer)
    const loginWithout2FA = await login('formateur@test.com', 'FormateurTest123!@#');
    testResult(
        'FORMATEUR - Login SANS code 2FA (devrait échouer)',
        !loginWithout2FA.success,
        `Erreur: ${loginWithout2FA.error?.error || 'N/A'}`
    );

    // Login AVEC 2FA correct
    const loginResult = await login('formateur@test.com', 'FormateurTest123!@#', 'ADMIN_SECRET');
    testResult(
        'FORMATEUR - Login AVEC code 2FA correct',
        loginResult.success && loginResult.data?.token,
        `Token présent: ${loginResult.data?.token ? 'OUI' : 'NON'}`
    );

    if (!loginResult.success) return null;
    const token = loginResult.data.token;

    // Accès endpoints FORMATEUR
    const sessionsAccess = await callEndpoint('/api/formateur/sessions-actives', token);
    testResult(
        'FORMATEUR - Accès /api/formateur/sessions-actives',
        sessionsAccess.success || sessionsAccess.status === 502,
        `Status: ${sessionsAccess.status}`
    );

    // Accès endpoints ADMIN (FORMATEUR a FULL_ACCESS)
    const logsAccess = await callEndpoint('/api/admin/logs', token);
    testResult(
        'FORMATEUR - Accès /api/admin/logs (permission ADMIN)',
        logsAccess.success || logsAccess.status === 502,
        `Status: ${logsAccess.status}`
    );

    const usersAccess = await callEndpoint('/api/admin/users', token);
    testResult(
        'FORMATEUR - Accès /api/admin/users (permission ADMIN)',
        usersAccess.success || usersAccess.status === 502,
        `Status: ${usersAccess.status}`
    );

    return token;
};

const testSecurity = async () => {
    log('\n🔒 TEST FONCTIONNALITÉS SÉCURITÉ', 'cyan');
    log('━'.repeat(60), 'cyan');

    // Test 1: Account Lockout
    log('\n[1/3] Test Account Lockout (6 tentatives échouées)...', 'cyan');
    const lockoutEmail = 'lockout@test.com';

    // Register user pour lockout test
    await register({
        username: 'lockout_user',
        email: lockoutEmail,
        password: 'LockoutTest123!@#',
        firstName: 'Lock',
        lastName: 'Test',
        role: 'ROLE_CLIENT'
    });

    // 6 tentatives échouées
    let lockoutTriggered = false;
    for (let i = 1; i <= 6; i++) {
        const attempt = await login(lockoutEmail, 'wrong_password');
        await wait(100); // Small delay between attempts

        if (attempt.error?.code === 'ACCOUNT_LOCKED') {
            lockoutTriggered = true;
            testResult(
                `Account Lockout - Tentative ${i}/6`,
                true,
                'ACCOUNT_LOCKED détecté'
            );
            break;
        }
    }

    testResult(
        'Account Lockout - Compte bloqué après tentatives échouées',
        lockoutTriggered,
        lockoutTriggered ? 'Lockout activé' : 'Lockout non détecté'
    );

    // Test 2: Token Blacklist (Logout)
    log('\n[2/3] Test Token Blacklist (Logout + Revocation)...', 'cyan');

    // Login
    const blacklistUser = await register({
        username: 'blacklist_user',
        email: 'blacklist@test.com',
        password: 'BlacklistTest123!@#',
        firstName: 'Black',
        lastName: 'List',
        role: 'ROLE_CLIENT'
    });

    const blacklistLogin = await login('blacklist@test.com', 'BlacklistTest123!@#');

    if (blacklistLogin.success) {
        const token = blacklistLogin.data.token;

        // 1. Utiliser token avant logout (devrait fonctionner)
        const beforeLogout = await callEndpoint('/api/client/cards', token);
        testResult(
            'Token Blacklist - Token valide AVANT logout',
            beforeLogout.success || beforeLogout.status === 502,
            `Status: ${beforeLogout.status}`
        );

        // 2. Logout
        const logoutResult = await logout(token);
        testResult(
            'Token Blacklist - Logout (blacklist token)',
            logoutResult.success,
            `Message: ${logoutResult.data?.message || 'N/A'}`
        );

        // 3. Réutiliser token après logout (devrait échouer)
        await wait(500); // Wait for Redis blacklist propagation
        const afterLogout = await callEndpoint('/api/client/cards', token);
        testResult(
            'Token Blacklist - Token révoqué APRÈS logout',
            !afterLogout.success && afterLogout.status === 401,
            `Status: ${afterLogout.status} - Code: ${afterLogout.error?.code || 'N/A'}`
        );
    }

    // Test 3: Password Strength Validation
    log('\n[3/3] Test Password Strength Validation...', 'cyan');

    const weakPasswords = [
        { pwd: '123456', reason: 'Trop court + commun' },
        { pwd: 'password', reason: 'Mot de passe commun' },
        { pwd: 'abcdefgh', reason: 'Pas de majuscule/chiffre/spécial' },
        { pwd: 'Short1!', reason: 'Trop court (<12 chars)' }
    ];

    for (const test of weakPasswords) {
        const result = await register({
            username: `weak_${Date.now()}`,
            email: `weak_${Date.now()}@test.com`,
            password: test.pwd,
            firstName: 'Weak',
            lastName: 'Password',
            role: 'ROLE_CLIENT'
        });

        testResult(
            `Password Validation - Rejette "${test.pwd}" (${test.reason})`,
            !result.success && result.status === 400,
            `Code: ${result.error?.code || 'N/A'}`
        );
    }

    // Test mot de passe fort (devrait réussir)
    const strongPassword = await register({
        username: `strong_${Date.now()}`,
        email: `strong_${Date.now()}@test.com`,
        password: 'MyStr0ng!P@ssw0rd#2024',
        firstName: 'Strong',
        lastName: 'Password',
        role: 'ROLE_CLIENT'
    });

    testResult(
        'Password Validation - Accepte mot de passe fort',
        strongPassword.success,
        'Complexité suffisante'
    );
};

// Main test runner
const runTests = async () => {
    log('\n╔═══════════════════════════════════════════════════════════════╗', 'cyan');
    log('║   SUITE DE TESTS - 4 PERSONAS + SÉCURITÉ                     ║', 'cyan');
    log('║   PMP Authentication System                                   ║', 'cyan');
    log('╚═══════════════════════════════════════════════════════════════╝', 'cyan');

    try {
        // Vérifier que le serveur est démarré
        try {
            await axios.get(`${BASE_URL}/health`);
            log('✅ API Gateway accessible\n', 'green');
        } catch (error) {
            log('❌ ERREUR: API Gateway non accessible sur http://localhost:8000', 'red');
            log('   Assurez-vous que le serveur est démarré: npm run dev\n', 'yellow');
            process.exit(1);
        }

        // Exécuter les tests
        await testClient();
        await testMarchand();
        await testEtudiant();
        await testFormateur();
        await testSecurity();

        // Rapport final
        log('\n╔═══════════════════════════════════════════════════════════════╗', 'cyan');
        log('║   RAPPORT FINAL                                               ║', 'cyan');
        log('╚═══════════════════════════════════════════════════════════════╝', 'cyan');

        const total = results.passed + results.failed;
        const percentage = Math.round((results.passed / total) * 100);

        log(`\n✅ Tests réussis: ${results.passed}`, 'green');
        log(`❌ Tests échoués: ${results.failed}`, results.failed > 0 ? 'red' : 'green');
        log(`📊 Taux de réussite: ${percentage}%\n`, percentage >= 80 ? 'green' : 'yellow');

        if (results.failed > 0) {
            log('Tests échoués:', 'red');
            results.tests.filter(t => !t.passed).forEach(t => {
                log(`  - ${t.testName}`, 'red');
                if (t.details) log(`    ${t.details}`, 'cyan');
            });
        }

        log('\n━'.repeat(67), 'cyan');

        if (percentage >= 90) {
            log('🎉 EXCELLENT! Score de sécurité >90% maintenu!', 'green');
        } else if (percentage >= 70) {
            log('⚠️  ATTENTION: Certains tests ont échoué', 'yellow');
        } else {
            log('❌ CRITIQUE: Trop de tests échoués', 'red');
        }

        process.exit(results.failed > 0 ? 1 : 0);

    } catch (error) {
        log(`\n❌ ERREUR FATALE: ${error.message}`, 'red');
        console.error(error);
        process.exit(1);
    }
};

// Execute tests
runTests();
