import { TransactionResponse } from '../models';
import { routingService } from '../services/routing.service';
import axios from 'axios';
import { config } from '../config';

// Define extended config interface for TypeScript satisfaction if needed, 
// or simply cast config as any in usage if strict typing blocks it.
// However, since we updated config/index.ts, strict usage should work 
// *if* the type definition was simulated or inferred correctly.
// Given strict TS likely, we assume config.services now has 'pos' and 'blockchain'.

interface NotificationConfig {
    user: string;
    merchant: string;
    system: string;
}

interface TPEResponse extends TransactionResponse {
    userNotification: string;
    merchantNotification: string;
    systemAlert: string;
}

export class ResponseWorkflow {
    /**
     * Process the response flow (Phase 7)
     * Flow: Network -> Acquirer -> POS -> Display -> Audit
     */
    async processResponse(authResponse: TransactionResponse): Promise<any> {
        console.log("📤 PHASE 7: Réponse et Notification");

        // Étape 7.1: Retour via réseau
        console.log("   → 7.1 Routage retour vers l'acquéreur");
        const networkResponse = await routingService.routeBack(authResponse);

        // Étape 7.2: Traitement acquéreur
        console.log("   → 7.2 Traitement par l'acquéreur");
        const acquirerProcessing = await this.callAcquirerProcess(networkResponse);

        // Étape 7.3: Retour au TPE
        console.log("   → 7.3 Formatage pour le TPE");
        const tpeResponse = await this.formatForTPE(acquirerProcessing);

        // Étape 7.4: Affichage utilisateur
        console.log("   → 7.4 Affichage sur le terminal");
        await this.displayToUser(tpeResponse);

        // Étape 7.5: Notifications
        console.log("   → 7.5 Envoi des notifications");
        await this.sendNotifications({
            user: tpeResponse.userNotification,
            merchant: tpeResponse.merchantNotification,
            system: tpeResponse.systemAlert
        });

        // Étape 7.6: Journalisation blockchain
        if (process.env.BLOCKCHAIN_ENABLED === 'true') {
            console.log("   → 7.6 Journalisation dans la Blockchain");
            await this.logToBlockchain(tpeResponse);
        }

        // Étape 8: Monitoring & BI (Async)
        this.updateMonitoring(tpeResponse);

        // Post-Processing Phase (T0+1900ms onwards)
        const postProcessingTimestamps = {
            dbUpdate: new Date(),       // T0+1900ms
            auditLog: new Date(),       // T0+2000ms  
            monitoring: new Date(),     // T0+2100ms
            complete: new Date()        // T0+2200ms
        };

        // T0+1900ms: DB Update
        console.log("   → 8.1 Mise à jour Base de Données");
        await this.updateDatabase(tpeResponse);
        postProcessingTimestamps.dbUpdate = new Date();

        // T0+2000ms: Audit Log (already done in step 7.6)
        postProcessingTimestamps.auditLog = new Date();

        // T0+2100ms: Monitoring (already triggered async)
        postProcessingTimestamps.monitoring = new Date();

        // T0+2200ms: Complete
        postProcessingTimestamps.complete = new Date();
        console.log("   ✓ Transaction Complete");

        return {
            ...tpeResponse,
            timeline: {
                response: {
                    signature: new Date(authResponse.processedAt || Date.now()),
                    networkReturn: new Date(),
                    acquirerReturn: new Date(),
                    tpeReceived: new Date(),
                    userDisplayed: new Date()
                },
                postProcessing: postProcessingTimestamps
            },
            timestamps: {
                authorization: authResponse.processedAt,
                network: new Date().toISOString(),
                acquirer: acquirerProcessing.processedAt,
                tpe: new Date().toISOString()
            },
            traceId: authResponse.stan
        };
    }

    private async updateDatabase(response: TPEResponse): Promise<void> {
        // Simulate DB update
        console.log(`      [DB] Updating transaction ${response.stan || 'unknown'} status`);
        // In real impl: await db.transactions.update(...)
    }

    private async callAcquirerProcess(response: TransactionResponse): Promise<TransactionResponse> {
        try {
            // In a real microservices architecture, this would be an HTTP call
            // specific to the acquirer identified in the transaction.
            // For simulation, we call the sim-acquirer-service.
            const res = await axios.post(`${config.services.acquirer || 'http://localhost:8002'}/transaction/process-response`, response);
            return res.data;
        } catch (error) {
            console.warn("   [!] Acquirer processing failed, using raw response");
            return response;
        }
    }

    private async formatForTPE(response: TransactionResponse): Promise<TPEResponse> {
        try {
            const res = await axios.post(`${config.services.pos || 'http://localhost:8001'}/device/format-response`, response);
            return res.data;
        } catch (error) {
            // Fallback formatting
            return {
                ...response,
                userNotification: response.responseCode === '00' ? 'PAIEMENT ACCEPTE' : 'PAIEMENT REFUSE',
                merchantNotification: `TRANS ${response.stan} : ${response.responseCode}`,
                systemAlert: response.responseCode !== '00' ? `Failure: ${response.responseCode}` : 'Success'
            };
        }
    }

    private async displayToUser(response: TPEResponse): Promise<void> {
        try {
            await axios.post(`${config.services.pos || 'http://localhost:8001'}/device/display`, {
                message: response.userNotification,
                status: response.responseCode === '00' ? 'SUCCESS' : 'ERROR'
            });
        } catch (error) {
            console.log(`   [TPE Display] ${response.userNotification}`);
        }
    }

    private async sendNotifications(notifications: NotificationConfig): Promise<void> {
        // Simulation of notification service
        console.log(`      [SMS] User: ${notifications.user}`);
        console.log(`      [App] Merchant: ${notifications.merchant}`);
        if (notifications.system !== 'Success') {
            console.log(`      [Alert] System: ${notifications.system}`);
        }
    }

    private async logToBlockchain(response: any): Promise<void> {
        try {
            await axios.post('http://localhost:8008/ledger/log', {
                data: response,
                type: 'FINANCIAL_RESPONSE'
            });
        } catch (error) {
            console.warn("   [!] Blockchain logging failed");
            // Fallback: Alert system
            // In real scenario this would call AlertService
        }
    }

    private async updateMonitoring(response: TPEResponse): Promise<void> {
        // Phase 8: Real-time monitoring update
        try {
            const anyResponse = response as any;
            await axios.post(`${config.services.monitoring || 'http://localhost:4000'}/api/analytics/transaction`, {
                responseCode: response.responseCode,
                amount: anyResponse.amount,
                merchantId: anyResponse.merchantId,
                fraudCheck: response.systemAlert
            });
        } catch (e) {
            // Non-blocking
        }
    }
}
