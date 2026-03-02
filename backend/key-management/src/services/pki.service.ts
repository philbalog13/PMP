import forge from 'node-forge';
import fs from 'fs';
import path from 'path';

export interface CertificateData {
    cert: string;
    privateKey: string;
    publicKey: string;
}

export class PKIService {
    private static instance: PKIService;
    private caKey: forge.pki.rsa.PrivateKey | null = null;
    private caCert: forge.pki.Certificate | null = null;
    private keysDir = '/app/keys/pki';

    private constructor() {
        this.initCA();
    }

    public static getInstance(): PKIService {
        if (!PKIService.instance) {
            PKIService.instance = new PKIService();
        }
        return PKIService.instance;
    }

    private initCA() {
        if (!fs.existsSync(this.keysDir)) {
            fs.mkdirSync(this.keysDir, { recursive: true });
        }

        const caKeyPath = path.join(this.keysDir, 'ca.key');
        const caCertPath = path.join(this.keysDir, 'ca.crt');

        if (fs.existsSync(caKeyPath) && fs.existsSync(caCertPath)) {
            // Load existing CA
            const keyPem = fs.readFileSync(caKeyPath, 'utf8');
            const certPem = fs.readFileSync(caCertPath, 'utf8');
            this.caKey = forge.pki.privateKeyFromPem(keyPem);
            this.caCert = forge.pki.certificateFromPem(certPem);
            console.log('[PKI] Loaded existing MoneTIC Root CA');
        } else {
            // Generate new Root CA
            console.log('[PKI] Generating new MoneTIC Root CA...');
            const keys = forge.pki.rsa.generateKeyPair(2048);
            this.caKey = keys.privateKey;

            const cert = forge.pki.createCertificate();
            cert.publicKey = keys.publicKey;
            cert.serialNumber = '01';
            cert.validity.notBefore = new Date();
            cert.validity.notAfter = new Date();
            cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 10);

            const attrs = [
                { name: 'commonName', value: 'MoneTIC PMP Root CA' },
                { name: 'countryName', value: 'FR' },
                { shortName: 'ST', value: 'Normandie' },
                { name: 'localityName', value: 'Caen' },
                { name: 'organizationName', value: 'MoneTIC' },
                { shortName: 'OU', value: 'PMP Platform Lab' }
            ];
            cert.setSubject(attrs);
            cert.setIssuer(attrs);

            // Self-sign the certificate
            cert.setExtensions([{
                name: 'basicConstraints',
                cA: true
            }, {
                name: 'keyUsage',
                keyCertSign: true,
                digitalSignature: true,
                nonRepudiation: true,
                keyEncipherment: true,
                dataEncipherment: true
            }]);

            cert.sign(this.caKey, forge.md.sha256.create());
            this.caCert = cert;

            // Save to disk
            fs.writeFileSync(caKeyPath, forge.pki.privateKeyToPem(this.caKey));
            fs.writeFileSync(caCertPath, forge.pki.certificateToPem(this.caCert));
            console.log('[PKI] MoneTIC Root CA generated and saved');
        }
    }

    public getRootCACertificate(): string {
        if (!this.caCert) throw new Error("CA not initialized");
        return forge.pki.certificateToPem(this.caCert);
    }

    public generateEntityCertificate(subjectCN: string, isEMVCard: boolean = false): CertificateData {
        if (!this.caKey || !this.caCert) throw new Error("CA not initialized");

        const keys = forge.pki.rsa.generateKeyPair(2048);
        const cert = forge.pki.createCertificate();

        cert.publicKey = keys.publicKey;
        cert.serialNumber = forge.util.bytesToHex(forge.random.getBytesSync(16));
        cert.validity.notBefore = new Date();
        cert.validity.notAfter = new Date();
        // Cards usually expire in 3 years, servers in 1
        cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + (isEMVCard ? 3 : 1));

        const attrs = [
            { name: 'commonName', value: subjectCN },
            { name: 'countryName', value: 'FR' },
            { name: 'organizationName', value: 'MoneTIC PMP' },
            { shortName: 'OU', value: isEMVCard ? 'EMV Cards' : 'Microservices' }
        ];

        cert.setSubject(attrs);
        cert.setIssuer(this.caCert.subject.attributes);

        const extensions: any[] = [{
            name: 'basicConstraints',
            cA: false
        }];

        if (isEMVCard) {
            extensions.push({
                name: 'keyUsage',
                digitalSignature: true,
                nonRepudiation: true,
                keyEncipherment: true
            });
            // OID for EMV usage (example)
            extensions.push({
                name: 'extKeyUsage',
                clientAuth: true,
                codeSign: true
            });
        } else {
            extensions.push({
                name: 'extKeyUsage',
                serverAuth: true,
                clientAuth: true
            });
        }

        cert.setExtensions(extensions);

        // Sign with CA
        cert.sign(this.caKey, forge.md.sha256.create());

        return {
            cert: forge.pki.certificateToPem(cert),
            privateKey: forge.pki.privateKeyToPem(keys.privateKey),
            publicKey: forge.pki.publicKeyToPem(keys.publicKey)
        };
    }
}
