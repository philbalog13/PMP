/**
 * WebSocket Server pour le streaming temps réel
 */

import { WebSocket, WebSocketServer as WSServer } from 'ws';
import { Server } from 'http';
import { v4 as uuidv4 } from 'uuid';

interface Client {
    id: string;
    ws: WebSocket;
    subscriptions: Set<string>;
    lastPing: number;
}

interface Message {
    type: string;
    channel?: string;
    payload?: any;
}

type MessageHandler = (client: Client, payload: any) => void;

export class WebSocketServer {
    private wss: WSServer;
    private clients: Map<string, Client> = new Map();
    private handlers: Map<string, MessageHandler> = new Map();
    private running: boolean = false;
    private pingInterval?: NodeJS.Timeout;
    private simulationInterval?: NodeJS.Timeout;

    constructor(server: Server) {
        this.wss = new WSServer({ server, path: '/ws' });
        this.setupHandlers();
        this.setupServer();
        this.startPingInterval();
        this.startSimulation();
        this.running = true;

        console.log('  ✅ WebSocket Server initialisé');
    }

    private setupServer(): void {
        this.wss.on('connection', (ws: WebSocket) => {
            const clientId = uuidv4();
            const client: Client = {
                id: clientId,
                ws,
                subscriptions: new Set(['transactions', 'metrics']),
                lastPing: Date.now()
            };

            this.clients.set(clientId, client);
            console.log(`  📡 Client connecté: ${clientId.substring(0, 8)}...`);

            // Envoyer le message de bienvenue
            this.send(client, {
                type: 'connected',
                payload: {
                    clientId,
                    subscriptions: Array.from(client.subscriptions),
                    timestamp: new Date().toISOString()
                }
            });

            // Gérer les messages entrants
            ws.on('message', (data: Buffer) => {
                try {
                    const message: Message = JSON.parse(data.toString());
                    this.handleMessage(client, message);
                } catch (error) {
                    this.send(client, {
                        type: 'error',
                        payload: { message: 'Invalid JSON message' }
                    });
                }
            });

            // Gérer la déconnexion
            ws.on('close', () => {
                this.clients.delete(clientId);
                console.log(`  📴 Client déconnecté: ${clientId.substring(0, 8)}...`);
            });

            // Gérer les erreurs
            ws.on('error', (error) => {
                console.error(`  ❌ Erreur WebSocket: ${error.message}`);
            });

            // Répondre aux pings
            ws.on('pong', () => {
                client.lastPing = Date.now();
            });
        });
    }

    private setupHandlers(): void {
        // Subscribe à un channel
        this.handlers.set('subscribe', (client, payload) => {
            const { channel } = payload;
            if (channel) {
                client.subscriptions.add(channel);
                this.send(client, {
                    type: 'subscribed',
                    payload: { channel }
                });
            }
        });

        // Unsubscribe d'un channel
        this.handlers.set('unsubscribe', (client, payload) => {
            const { channel } = payload;
            if (channel) {
                client.subscriptions.delete(channel);
                this.send(client, {
                    type: 'unsubscribed',
                    payload: { channel }
                });
            }
        });

        // Ping/Pong
        this.handlers.set('ping', (client) => {
            this.send(client, { type: 'pong', payload: { timestamp: Date.now() } });
        });

        // Requête de données historiques
        this.handlers.set('getHistory', (client, payload) => {
            const { channel, limit = 100 } = payload;
            // Envoyer des données simulées
            const history = this.generateHistoricalData(channel, limit);
            this.send(client, {
                type: 'history',
                channel,
                payload: history
            });
        });
    }

    private handleMessage(client: Client, message: Message): void {
        const handler = this.handlers.get(message.type);
        if (handler) {
            handler(client, message.payload || {});
        } else {
            this.send(client, {
                type: 'error',
                payload: { message: `Unknown message type: ${message.type}` }
            });
        }
    }

    private send(client: Client, message: Message): void {
        if (client.ws.readyState === WebSocket.OPEN) {
            client.ws.send(JSON.stringify(message));
        }
    }

    // Broadcast à tous les clients abonnés à un channel
    broadcast(channel: string, message: Message): void {
        for (const client of this.clients.values()) {
            if (client.subscriptions.has(channel)) {
                this.send(client, { ...message, channel });
            }
        }
    }

    // Broadcast à tous les clients
    broadcastAll(message: Message): void {
        for (const client of this.clients.values()) {
            this.send(client, message);
        }
    }

    private startPingInterval(): void {
        this.pingInterval = setInterval(() => {
            const now = Date.now();
            for (const [id, client] of this.clients.entries()) {
                if (now - client.lastPing > 60000) {
                    // Client inactif depuis plus de 60s
                    client.ws.terminate();
                    this.clients.delete(id);
                } else if (client.ws.readyState === WebSocket.OPEN) {
                    client.ws.ping();
                }
            }
        }, 30000);
    }

    // Simulation de données temps réel
    private startSimulation(): void {
        this.simulationInterval = setInterval(() => {
            // Simuler une transaction
            this.broadcast('transactions', {
                type: 'transaction',
                payload: this.generateTransaction()
            });

            // Simuler des métriques (toutes les 5 secondes)
            if (Math.random() < 0.2) {
                this.broadcast('metrics', {
                    type: 'metrics',
                    payload: this.generateMetrics()
                });
            }
        }, 1000);
    }

    private generateTransaction(): object {
        const responseCodes = ['00', '00', '00', '00', '05', '51', '14', '54'];
        const types = ['auth', 'auth', 'auth', 'refund', 'reversal'];
        const terminals = ['TERM001', 'TERM002', 'TERM003', 'TERM004', 'TERM005'];

        return {
            id: uuidv4(),
            timestamp: new Date().toISOString(),
            type: types[Math.floor(Math.random() * types.length)],
            amount: Math.floor(Math.random() * 50000) + 100,
            currency: 'EUR',
            responseCode: responseCodes[Math.floor(Math.random() * responseCodes.length)],
            terminalId: terminals[Math.floor(Math.random() * terminals.length)],
            latency: Math.floor(Math.random() * 200) + 50,
            pan: `****${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
            location: {
                lat: 48.8566 + (Math.random() - 0.5) * 0.1,
                lng: 2.3522 + (Math.random() - 0.5) * 0.1
            }
        };
    }

    private generateMetrics(): object {
        return {
            timestamp: new Date().toISOString(),
            requestsPerSecond: Math.floor(Math.random() * 100) + 50,
            avgLatency: Math.floor(Math.random() * 100) + 50,
            p95Latency: Math.floor(Math.random() * 200) + 100,
            p99Latency: Math.floor(Math.random() * 400) + 200,
            errorRate: Math.random() * 0.05,
            activeConnections: this.clients.size,
            services: {
                'auth-engine': { status: 'up', latency: Math.floor(Math.random() * 50) + 20 },
                'hsm-simulator': { status: 'up', latency: Math.floor(Math.random() * 30) + 10 },
                'switch': { status: 'up', latency: Math.floor(Math.random() * 40) + 15 }
            }
        };
    }

    private generateHistoricalData(channel: string, limit: number): any[] {
        const data = [];
        for (let i = 0; i < limit; i++) {
            if (channel === 'transactions') {
                data.push(this.generateTransaction());
            } else if (channel === 'metrics') {
                data.push(this.generateMetrics());
            }
        }
        return data;
    }

    isRunning(): boolean {
        return this.running;
    }

    close(): void {
        this.running = false;
        if (this.pingInterval) clearInterval(this.pingInterval);
        if (this.simulationInterval) clearInterval(this.simulationInterval);

        for (const client of this.clients.values()) {
            client.ws.close(1000, 'Server shutting down');
        }

        this.wss.close();
        console.log('  ✅ WebSocket Server fermé');
    }
}
