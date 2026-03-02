import axios from 'axios';
import { config } from '../config';

export interface ColdBootSession {
    zpk: string;
    zpkKcv: string;
    zmkId: string;
    sessionId: string;
    expiresAt: string;
    algorithm: string;
}

/**
 * ColdBootService — Nouvelle Architecture Cryptographique (NAC)
 *
 * Simulates the Power-On initialization sequence of a real POS/GAB terminal.
 * Before any payment can be processed, the POS must negotiate a Zone PIN Key (ZPK)
 * with the acquirer's HSM. This key is used to encrypt PIN blocks during transactions.
 *
 * Real-world flow:
 * TPE Power-On → Appel NAC → Acquéreur → Network Switch → HSM → ZPK chiffré ZMK → TPE
 */
export class ColdBootService {
    private static instance: ColdBootService;
    private session: ColdBootSession | null = null;
    private isReady = false;
    private terminalId = 'POS001';

    private constructor() { }

    public static getInstance(): ColdBootService {
        if (!ColdBootService.instance) {
            ColdBootService.instance = new ColdBootService();
        }
        return ColdBootService.instance;
    }

    /**
     * Perform the Cold Boot key exchange with the acquirer.
     * Called once at service startup. Does not block startup if it fails.
     */
    public async initialize(): Promise<void> {
        if (this.isReady && this.session && new Date(this.session.expiresAt) > new Date()) {
            return; // Session still valid
        }

        console.log('[COLD BOOT] ══════════════════════════════════════════════');
        console.log('[COLD BOOT] Démarrage TPE — Initialisation N.A.C');
        console.log('[COLD BOOT] Demande de clé de session (ZPK) en cours...');
        console.log('[COLD BOOT] Flux: TPE → Acquéreur → Switch → HSM');

        try {
            const response = await axios.post(
                `${config.acquirerService.url}/key-exchange`,
                {
                    terminalId: this.terminalId,
                    timestamp: new Date().toISOString()
                },
                { timeout: 10000 }
            );

            const data: ColdBootSession = response.data?.data;
            if (!data?.zpk) throw new Error('Invalid ZPK response from acquirer');

            this.session = data;
            this.isReady = true;

            console.log(`[COLD BOOT] ✅ ZPK négocié avec succès`);
            console.log(`[COLD BOOT] Session ID : ${data.sessionId}`);
            console.log(`[COLD BOOT] KCV (ZPK)  : ${data.zpkKcv}`);
            console.log(`[COLD BOOT] ZMK ID     : ${data.zmkId}`);
            console.log(`[COLD BOOT] Expire le  : ${data.expiresAt}`);
            console.log('[COLD BOOT] ══ TPE PRÊT POUR TRANSACTIONS ══════════');

        } catch (error: any) {
            this.isReady = false;
            this.session = null;
            console.warn(`[COLD BOOT] ⚠️  Échec de l'échange de clés: ${error.message}`);
            console.warn(`[COLD BOOT] TPE démarré en mode dégradé (sans ZPK).`);
            console.warn(`[COLD BOOT] Le chiffrement PIN sera simulé localement.`);
        }
    }

    /** Whether the Cold Boot completed successfully */
    public isOperational(): boolean {
        if (!this.session) return false;
        return this.isReady && new Date(this.session.expiresAt) > new Date();
    }

    /** Get the current session key (ZPK) */
    public getSessionKey(): string | null {
        if (!this.isOperational()) return null;
        return this.session!.zpk;
    }

    /** Get session details for health check */
    public getSessionInfo(): { ready: boolean; sessionId?: string; expiresAt?: string; zpkKcv?: string } {
        if (!this.session) return { ready: false };
        return {
            ready: this.isReady,
            sessionId: this.session.sessionId,
            expiresAt: this.session.expiresAt,
            zpkKcv: this.session.zpkKcv
        };
    }
}
