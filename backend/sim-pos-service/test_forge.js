const forge = require('node-forge');
const fs = require('fs');

async function test() {
    try {
        const response = await fetch('http://localhost:8001/cards', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cardholderName: 'Test' })
        });
        const data = await response.json();
        const certPem = data.data.pkiCert;

        console.log('Got cert length:', certPem.length);
        console.log('Cert header:', certPem.substring(0, 50));

        const cert = forge.pki.certificateFromPem(certPem);
        console.log('Successfully parsed cert:', cert.subject.getField('CN').value);
    } catch (e) {
        console.error('Error parsing:', e.message);
    }
}
test();
