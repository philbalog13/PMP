import forge from 'node-forge';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { config } from '../config';

export class ODAService {
    private static instance: ODAService;
    private rootCACert: forge.pki.Certificate | null = null;
    private isInitialized = false;

    private constructor() { }

    public static getInstance(): ODAService {
        if (!ODAService.instance) {
            ODAService.instance = new ODAService();
        }
        return ODAService.instance;
    }

    /**
     * Fetch the Root CA certificate from key-management service (dynamic PKI).
     * In a real POS, this would be flashed into the terminal firmware during personalization.
     * Fallback: load from local ca.crt if key-management is unreachable.
     */
    public async initialize(): Promise<void> {
        if (this.isInitialized) return;

        // Priority 1: Fetch from key-management (dynamic PKI)
        try {
            console.log('[ODA] Fetching Root CA from key-management PKI...');
            const response = await axios.get(
                `${config.keyManagementUrl}/api/pki/ca`,
                { timeout: 5000 }
            );
            const certPem: string = response.data?.data?.certificate;
            if (!certPem) throw new Error('Empty CA certificate in response');
            this.rootCACert = forge.pki.certificateFromPem(certPem);
            this.isInitialized = true;
            console.log('[ODA] Root CA fetched from key-management and loaded into POS memory.');
            return;
        } catch (err: any) {
            console.warn(`[ODA] key-management unreachable (${err.message}), falling back to local ca.crt`);
        }

        // Priority 2: Fallback to local static file (firmware simulation)
        try {
            const certPath = path.join(process.cwd(), 'ca.crt');
            const certPem = fs.readFileSync(certPath, 'utf8');
            this.rootCACert = forge.pki.certificateFromPem(certPem);
            this.isInitialized = true;
            console.log('[ODA] Root CA loaded from local firmware (ca.crt fallback).');
        } catch (error: any) {
            console.error('[ODA] Error loading Root CA (both sources failed):', error.message);
            // Allow POS to boot in degraded mode — ODA will reject all cards
        }
    }

    /**
     * Perform Offline Data Authentication (ODA) on the inserted card
     * 
     * @param cardCertPem The public certificate presented by the card
     * @returns boolean indicating if the card is authentic
     */
    public verifyCardCertificate(cardCertPem: string | undefined): boolean {
        if (!this.rootCACert || !this.isInitialized) {
            console.warn('[ODA] Warning: Root CA not initialized. ODA validation failed by default.');
            return false;
        }

        if (!cardCertPem) {
            console.warn('[ODA] Warning: Card did not present a certificate (SDA/DDA missing).');
            return false;
        }

        try {
            console.log('[ODA] Attempting to parse certificate: ', typeof cardCertPem, cardCertPem.substring(0, 100).replace(/\n/g, '\\n'), '...');

            // Ensure no leading/trailing whitespace that could break PEM parsing
            const sanitizedPem = cardCertPem.trim();
            const cardCert = forge.pki.certificateFromPem(sanitizedPem);

            // Verify the signature of the card's certificate using the Root CA's public key
            const isVerified = this.rootCACert.verify(cardCert);

            // Check expiry
            const now = new Date();
            const isValidDate = cardCert.validity.notBefore <= now && cardCert.validity.notAfter >= now;

            if (isVerified && isValidDate) {
                console.log('[ODA] Success: Card certificate (SDA/DDA) is authentic and signed by MoneTIC Root CA.');
                return true;
            } else {
                if (!isVerified) console.error('[ODA] Error: Card certificate signature invalid! Potential counterfeit card.');
                if (!isValidDate) console.error('[ODA] Error: Card certificate is expired or not yet valid.');
                return false;
            }
        } catch (error: any) {
            console.error('[ODA] Error parsing or verifying card certificate:', error.stack || error.message);
            return false;
        }
    }
}
