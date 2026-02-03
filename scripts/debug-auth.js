// using native fetch
// const fetch = require('node-fetch');

const API_URL = 'http://localhost:8000';

async function run() {
    const timestamp = Date.now();
    const newUser = {
        username: `debug_student_${timestamp}`,
        email: `debug_student_${timestamp}@pmp.edu`,
        password: 'StrongDebugPass_789!@#',
        firstName: 'Debug',
        lastName: 'Student',
        role: 'ROLE_ETUDIANT'
    };

    console.log('1. Registering new user:', newUser.email);

    try {
        const regRes = await fetch(`${API_URL}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newUser)
        });

        const regData = await regRes.json();
        console.log('Registration Response:', JSON.stringify(regData, null, 2));

        if (!regData.success) {
            console.error('Registration failed.');
            return;
        }

        console.log('\n2. Logging in...');
        const loginRes = await fetch(`${API_URL}/api/auth/etudiant/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: newUser.email,
                password: newUser.password
            })
        });

        const loginData = await loginRes.json();
        console.log('Login Response:', JSON.stringify(loginData, null, 2));

        if (loginData.accessToken) {
            console.log('\n3. Decoding Token...');
            const parts = loginData.accessToken.split('.');
            if (parts.length === 3) {
                const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
                console.log('Token Payload:', JSON.stringify(payload, null, 2));

                // Check role
                console.log('\n--- DIAGNOSIS ---');
                console.log('Role in payload:', payload.role);
                console.log('User role expected: ROLE_ETUDIANT');
                if (payload.role !== 'ROLE_ETUDIANT') {
                    console.log('MISMATCH! This is likely why the middleware redirects.');
                } else {
                    console.log('Role matches. Middleware issue might be elsewhere (cookie vs header? logic error?)');
                }
            } else {
                console.log('Invalid token format');
            }
        }

    } catch (e) {
        console.error('Error:', e);
    }
}

run();
