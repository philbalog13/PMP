/**
 * HsmWebSocket.ts
 * 
 * Serveur WebSocket pour monitoring temps réel du HSM
 * Permet la visualisation live des opérations crypto
 * 
 * @educational WebSocket pour observer les opérations HSM en temps réel
 */

import { EventEmitter } from 'events';
import WebSocket from 'ws';
import * as http from 'http';
import { AuditLogger } from '../core/AuditLogger';

// Types d'événements WebSocket
export type WsEventType =
    | 'HSM_STATUS'
    | 'KEY_OPERATION'
    | 'PIN_OPERATION'
    | 'CRYPTO_OPERATION'
    | 'MAC_OPERATION'
    | 'TRANSACTION'
    | 'TAMPER_ALERT'
    | 'AUDIT_LOG'
    | 'DISPLAY_UPDATE'
    | 'BUTTON_EVENT'
    | 'LED_STATE'
    | 'ERROR';

export interface WsEvent {
    type: WsEventType;
    timestamp: Date;
    data: any;
    correlationId?: string;
    educationalNotes?: string[];
}

export interface WsClientInfo {
    id: string;
    connectedAt: Date;
    subscriptions: WsEventType[];
    lastActivity: Date;
}

export interface HsmWebSocketConfig {
    port: number;
    host: string;
    heartbeatIntervalMs: number;
    maxClients: number;
    enableEducationalMode: boolean;
}

export class HsmWebSocket extends EventEmitter {
    private wss: WebSocket.Server | null = null;
    private server: http.Server | null = null;
    private clients: Map<string, { ws: WebSocket.WebSocket; info: WsClientInfo }> = new Map();
    private config: HsmWebSocketConfig;
    private auditLogger: AuditLogger;
    private heartbeatTimer: NodeJS.Timeout | null = null;
    private eventHistory: WsEvent[] = [];
    private readonly MAX_HISTORY = 1000;

    // Notes pédagogiques pour chaque type d'opération
    private readonly EDUCATIONAL_NOTES: Record<WsEventType, string[]> = {
        HSM_STATUS: [
            'Le HSM (Hardware Security Module) est un dispositif physique dédié à la sécurité cryptographique',
            'Les vrais HSM sont certifiés FIPS 140-2 Level 3 ou PCI HSM',
            'Ce simulateur reproduit les comportements sans le hardware sécurisé',
        ],
        KEY_OPERATION: [
            'Les clés sont stockées chiffrées sous la LMK (Local Master Key)',
            'La LMK ne quitte jamais le HSM - même en maintenance',
            'Le KCV (Key Check Value) permet de vérifier l\'intégrité sans exposer la clé',
        ],
        PIN_OPERATION: [
            'Le PIN n\'est jamais transmis ou stocké en clair',
            'Le PIN Block ISO 9564-1 combine le PIN avec le PAN',
            'Format 0 = PIN XOR PAN, Format 3 = aléatoire pour chaque transaction',
        ],
        CRYPTO_OPERATION: [
            'AES-256 est le standard pour le chiffrement symétrique',
            'RSA-2048 minimum pour les signatures et échanges de clés',
            '3DES est encore utilisé pour compatibilité mais sera déprécié',
        ],
        MAC_OPERATION: [
            'Le MAC (Message Authentication Code) garantit l\'intégrité et l\'authenticité',
            'ISO 9797-1 définit 3 méthodes de calcul MAC',
            'Retail MAC (ISO 9797-1 Method 1) est le plus courant en monétique',
        ],
        TRANSACTION: [
            'Une transaction passe par: Terminal → Acquéreur → Réseau → Émetteur',
            'Le processus complet prend généralement 1-3 secondes',
            'Chaque étape ajoute une couche de vérification et de sécurité',
        ],
        TAMPER_ALERT: [
            '⚠️ La détection de tamper efface immédiatement toutes les clés',
            'Les capteurs incluent: ouverture boîtier, voltage, température, mouvement',
            'Cette protection est obligatoire pour la certification PCI HSM',
        ],
        AUDIT_LOG: [
            'Tous les accès aux clés doivent être journalisés',
            'Les logs d\'audit sont signés et horodatés',
            'La rétention minimale est de 90 jours selon PCI',
        ],
        DISPLAY_UPDATE: [
            'L\'écran LCD affiche les informations sans exposer les données sensibles',
            'Le PIN est toujours masqué par des astérisques',
            'Les numéros de carte sont partiellement masqués (premiers 6, derniers 4)',
        ],
        BUTTON_EVENT: [
            'Le clavier du TPE/HSM est sécurisé contre l\'écoute',
            'Un maillage de protection détecte les tentatives de sonde',
            'Les touches sont conçues pour éviter les traces de doigts révélatrices',
        ],
        LED_STATE: [
            'Les LEDs indiquent l\'état sans révéler d\'informations sensibles',
            'Vert = opération réussie, Rouge = erreur, Orange = en cours',
            'Le clignotement indique une activité crypto en cours',
        ],
        ERROR: [
            'Les erreurs HSM utilisent des codes standardisés',
            'Le code 90 = erreur interne HSM (problème matériel)',
            'Le code 01 = échec de vérification (PIN incorrect, MAC invalide)',
        ],
    };

    constructor(auditLogger: AuditLogger, config?: Partial<HsmWebSocketConfig>) {
        super();
        this.auditLogger = auditLogger;
        this.config = {
            port: 8020,
            host: '0.0.0.0',
            heartbeatIntervalMs: 30000,
            maxClients: 50,
            enableEducationalMode: true,
            ...config,
        };
    }

    // ========================
    // Lifecycle
    // ========================

    /**
     * Démarre le serveur WebSocket
     */
    async start(): Promise<void> {
        return new Promise((resolve, reject) => {
            this.server = http.createServer();

            this.wss = new WebSocket.Server({
                server: this.server,
                path: '/hsm-events',
            });

            this.wss.on('connection', (ws, req) => {
                this.handleConnection(ws, req);
            });

            this.wss.on('error', (error) => {
                this.auditLogger.log('WS_SERVER_ERROR', { error: error.message });
                this.emit('error', error);
            });

            this.server.listen(this.config.port, this.config.host, () => {
                this.auditLogger.log('WS_SERVER_STARTED', {
                    port: this.config.port,
                    host: this.config.host,
                });
                this.startHeartbeat();
                resolve();
            });

            this.server.on('error', reject);
        });
    }

    /**
     * Arrête le serveur WebSocket
     */
    async stop(): Promise<void> {
        this.stopHeartbeat();

        // Ferme toutes les connexions client
        for (const [id, client] of this.clients) {
            client.ws.close(1001, 'Server shutting down');
        }
        this.clients.clear();

        return new Promise((resolve) => {
            if (this.wss) {
                this.wss.close(() => {
                    if (this.server) {
                        this.server.close(() => {
                            this.auditLogger.log('WS_SERVER_STOPPED');
                            resolve();
                        });
                    } else {
                        resolve();
                    }
                });
            } else {
                resolve();
            }
        });
    }

    // ========================
    // Broadcasting
    // ========================

    /**
     * Diffuse un événement à tous les clients abonnés
     */
    broadcast(event: Omit<WsEvent, 'timestamp'>): void {
        const fullEvent: WsEvent = {
            ...event,
            timestamp: new Date(),
            educationalNotes: this.config.enableEducationalMode
                ? this.EDUCATIONAL_NOTES[event.type]
                : undefined,
        };

        // Sauvegarde dans l'historique
        this.eventHistory.push(fullEvent);
        if (this.eventHistory.length > this.MAX_HISTORY) {
            this.eventHistory.shift();
        }

        // Diffuse aux clients abonnés
        const message = JSON.stringify(fullEvent);

        for (const [id, client] of this.clients) {
            if (this.isSubscribed(client.info, event.type)) {
                try {
                    if (client.ws.readyState === WebSocket.OPEN) {
                        client.ws.send(message);
                    }
                } catch (error) {
                    this.auditLogger.log('WS_SEND_ERROR', { clientId: id, error: (error as Error).message });
                }
            }
        }

        this.emit('broadcast', fullEvent);
    }

    /**
     * Diffuse un événement HSM Status
     */
    broadcastStatus(status: {
        state: 'OPERATIONAL' | 'TAMPERED' | 'MAINTENANCE' | 'ERROR';
        keysLoaded: number;
        uptime: number;
        lastOperation?: string;
    }): void {
        this.broadcast({
            type: 'HSM_STATUS',
            data: status,
        });
    }

    /**
     * Diffuse une opération sur les clés
     */
    broadcastKeyOperation(operation: {
        action: 'GENERATE' | 'IMPORT' | 'EXPORT' | 'DELETE' | 'ROTATE';
        keyId: string;
        keyType: string;
        kcv?: string;
        success: boolean;
    }): void {
        this.broadcast({
            type: 'KEY_OPERATION',
            data: operation,
        });
    }

    /**
     * Diffuse une opération PIN
     */
    broadcastPinOperation(operation: {
        action: 'GENERATE_BLOCK' | 'VERIFY' | 'TRANSLATE' | 'CHANGE';
        format: string;
        maskedPan: string;
        success: boolean;
        errorCode?: string;
    }): void {
        this.broadcast({
            type: 'PIN_OPERATION',
            data: operation,
        });
    }

    /**
     * Diffuse une opération crypto
     */
    broadcastCryptoOperation(operation: {
        action: 'ENCRYPT' | 'DECRYPT' | 'SIGN' | 'VERIFY';
        algorithm: string;
        keyId: string;
        inputSize: number;
        outputSize: number;
        durationMs: number;
    }): void {
        this.broadcast({
            type: 'CRYPTO_OPERATION',
            data: operation,
        });
    }

    /**
     * Diffuse une transaction complète
     */
    broadcastTransaction(transaction: {
        id: string;
        type: 'PURCHASE' | 'REFUND' | 'CANCEL' | 'PREAUTH';
        amount: number;
        currency: string;
        responseCode: string;
        authCode?: string;
        maskedPan: string;
        steps: Array<{ step: string; durationMs: number; status: 'OK' | 'ERROR' }>;
    }): void {
        this.broadcast({
            type: 'TRANSACTION',
            data: transaction,
            correlationId: transaction.id,
        });
    }

    /**
     * Diffuse une alerte tamper
     */
    broadcastTamperAlert(alert: {
        type: 'COVER_OPEN' | 'VOLTAGE' | 'TEMPERATURE' | 'MOTION';
        severity: 'WARNING' | 'CRITICAL';
        keysWiped: boolean;
    }): void {
        this.broadcast({
            type: 'TAMPER_ALERT',
            data: alert,
        });

        this.auditLogger.log('WS_TAMPER_BROADCAST', alert);
    }

    // ========================
    // Client Management
    // ========================

    private handleConnection(ws: WebSocket.WebSocket, req: http.IncomingMessage): void {
        if (this.clients.size >= this.config.maxClients) {
            ws.close(1013, 'Max clients reached');
            return;
        }

        const clientId = this.generateClientId();
        const clientInfo: WsClientInfo = {
            id: clientId,
            connectedAt: new Date(),
            subscriptions: ['HSM_STATUS', 'TRANSACTION', 'ERROR'], // Abonnements par défaut
            lastActivity: new Date(),
        };

        this.clients.set(clientId, { ws, info: clientInfo });

        this.auditLogger.log('WS_CLIENT_CONNECTED', {
            clientId,
            ip: req.socket.remoteAddress,
        });

        // Envoie le message de bienvenue
        ws.send(JSON.stringify({
            type: 'WELCOME',
            timestamp: new Date(),
            data: {
                clientId,
                serverVersion: '1.0.0',
                availableEvents: Object.keys(this.EDUCATIONAL_NOTES),
                educationalMode: this.config.enableEducationalMode,
            },
        }));

        // Envoie l'historique récent
        this.sendRecentHistory(ws);

        ws.on('message', (data) => {
            this.handleMessage(clientId, data.toString());
        });

        ws.on('close', () => {
            this.clients.delete(clientId);
            this.auditLogger.log('WS_CLIENT_DISCONNECTED', { clientId });
        });

        ws.on('error', (error) => {
            this.auditLogger.log('WS_CLIENT_ERROR', { clientId, error: error.message });
        });
    }

    private handleMessage(clientId: string, message: string): void {
        const client = this.clients.get(clientId);
        if (!client) return;

        try {
            const parsed = JSON.parse(message);
            client.info.lastActivity = new Date();

            switch (parsed.action) {
                case 'subscribe':
                    this.handleSubscribe(clientId, parsed.events);
                    break;
                case 'unsubscribe':
                    this.handleUnsubscribe(clientId, parsed.events);
                    break;
                case 'getHistory':
                    this.sendHistory(client.ws, parsed.type, parsed.count);
                    break;
                case 'ping':
                    client.ws.send(JSON.stringify({ type: 'pong', timestamp: new Date() }));
                    break;
            }
        } catch (error) {
            client.ws.send(JSON.stringify({
                type: 'ERROR',
                timestamp: new Date(),
                data: { message: 'Invalid message format' },
            }));
        }
    }

    private handleSubscribe(clientId: string, events: WsEventType[]): void {
        const client = this.clients.get(clientId);
        if (!client) return;

        for (const event of events) {
            if (!client.info.subscriptions.includes(event)) {
                client.info.subscriptions.push(event);
            }
        }

        client.ws.send(JSON.stringify({
            type: 'SUBSCRIBED',
            timestamp: new Date(),
            data: { subscriptions: client.info.subscriptions },
        }));
    }

    private handleUnsubscribe(clientId: string, events: WsEventType[]): void {
        const client = this.clients.get(clientId);
        if (!client) return;

        client.info.subscriptions = client.info.subscriptions.filter(
            (s) => !events.includes(s)
        );

        client.ws.send(JSON.stringify({
            type: 'UNSUBSCRIBED',
            timestamp: new Date(),
            data: { subscriptions: client.info.subscriptions },
        }));
    }

    private isSubscribed(info: WsClientInfo, eventType: WsEventType): boolean {
        return info.subscriptions.includes(eventType) || info.subscriptions.includes('*' as any);
    }

    private sendRecentHistory(ws: WebSocket.WebSocket): void {
        const recent = this.eventHistory.slice(-10);
        ws.send(JSON.stringify({
            type: 'HISTORY',
            timestamp: new Date(),
            data: { events: recent },
        }));
    }

    private sendHistory(ws: WebSocket.WebSocket, type?: WsEventType, count: number = 50): void {
        let events = this.eventHistory;

        if (type) {
            events = events.filter((e) => e.type === type);
        }

        ws.send(JSON.stringify({
            type: 'HISTORY',
            timestamp: new Date(),
            data: { events: events.slice(-count) },
        }));
    }

    // ========================
    // Utilities
    // ========================

    private generateClientId(): string {
        return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    private startHeartbeat(): void {
        this.heartbeatTimer = setInterval(() => {
            for (const [id, client] of this.clients) {
                if (client.ws.readyState === WebSocket.OPEN) {
                    client.ws.ping();
                }
            }
        }, this.config.heartbeatIntervalMs);
    }

    private stopHeartbeat(): void {
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
            this.heartbeatTimer = null;
        }
    }

    // ========================
    // Getters
    // ========================

    getConnectedClients(): WsClientInfo[] {
        return Array.from(this.clients.values()).map((c) => c.info);
    }

    getEventHistory(type?: WsEventType, count: number = 100): WsEvent[] {
        let events = this.eventHistory;
        if (type) {
            events = events.filter((e) => e.type === type);
        }
        return events.slice(-count);
    }

    isRunning(): boolean {
        return this.wss !== null && this.server?.listening === true;
    }
}
