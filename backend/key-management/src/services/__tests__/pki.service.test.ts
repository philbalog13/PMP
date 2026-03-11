import fs from 'fs';
import path from 'path';
import forge from 'node-forge';
import { PKIService } from '../pki.service';

const pkiDir = path.resolve('/app/keys/pki');
const caKeyPath = path.join(pkiDir, 'ca.key');
const caCertPath = path.join(pkiDir, 'ca.crt');

describe('PKIService', () => {
    beforeEach(() => {
        fs.rmSync(pkiDir, { recursive: true, force: true });
        (PKIService as any).instance = undefined;
    });

    afterAll(() => {
        fs.rmSync(pkiDir, { recursive: true, force: true });
        (PKIService as any).instance = undefined;
    });

    it('should generate and persist a new root CA when none exists', () => {
        const service = PKIService.getInstance();
        const rootCertPem = service.getRootCACertificate();

        expect(rootCertPem).toContain('BEGIN CERTIFICATE');
        expect(fs.existsSync(caKeyPath)).toBe(true);
        expect(fs.existsSync(caCertPath)).toBe(true);
    });

    it('should reload an existing root CA from disk', () => {
        const firstInstance = PKIService.getInstance();
        const firstRootCert = firstInstance.getRootCACertificate();

        (PKIService as any).instance = undefined;

        const secondInstance = PKIService.getInstance();
        const secondRootCert = secondInstance.getRootCACertificate();

        expect(secondRootCert).toBe(firstRootCert);
    });

    it('should generate a server certificate signed by the root CA', () => {
        const service = PKIService.getInstance();
        const bundle = service.generateEntityCertificate('issuer.pmp.local');
        const cert = forge.pki.certificateFromPem(bundle.cert);
        const extKeyUsage = cert.getExtension('extKeyUsage') as {
            serverAuth?: boolean;
            clientAuth?: boolean;
        };

        expect(bundle.privateKey).toContain('BEGIN RSA PRIVATE KEY');
        expect(bundle.publicKey).toContain('BEGIN PUBLIC KEY');
        expect(cert.subject.getField('CN').value).toBe('issuer.pmp.local');
        expect(cert.subject.getField('OU').value).toBe('Microservices');
        expect(cert.issuer.getField('CN').value).toBe('MoneTIC PMP Root CA');
        expect(extKeyUsage.serverAuth).toBe(true);
        expect(extKeyUsage.clientAuth).toBe(true);
    });

    it('should generate an EMV card certificate with card-specific extensions', () => {
        const service = PKIService.getInstance();
        const bundle = service.generateEntityCertificate('CARD-0001', true);
        const cert = forge.pki.certificateFromPem(bundle.cert);
        const extKeyUsage = cert.getExtension('extKeyUsage') as {
            serverAuth?: boolean;
            clientAuth?: boolean;
            codeSign?: boolean;
        };

        expect(cert.subject.getField('CN').value).toBe('CARD-0001');
        expect(cert.subject.getField('OU').value).toBe('EMV Cards');
        expect(extKeyUsage.clientAuth).toBe(true);
        expect(extKeyUsage.serverAuth).not.toBe(true);
        expect(cert.validity.notAfter.getFullYear() - cert.validity.notBefore.getFullYear()).toBeGreaterThanOrEqual(3);
    });

    it('should throw when CA material is unavailable', () => {
        const service = PKIService.getInstance() as any;

        service.caCert = null;
        expect(() => service.getRootCACertificate()).toThrow('CA not initialized');

        service.caKey = null;
        expect(() => service.generateEntityCertificate('broken.local')).toThrow('CA not initialized');
    });
});
