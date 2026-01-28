/**
 * Service Elasticsearch pour le stockage des logs et métriques
 */

import { Client } from '@elastic/elasticsearch';

interface IndexedDocument {
    id: string;
    index: string;
    body: object;
}

interface SearchQuery {
    index: string;
    query?: object;
    size?: number;
    from?: number;
    sort?: object[];
}

export class ElasticsearchService {
    private client: Client | null = null;
    private connected: boolean = false;
    private readonly indices = {
        transactions: 'pmp-transactions',
        metrics: 'pmp-metrics',
        alerts: 'pmp-alerts',
        analytics: 'pmp-analytics'
    };

    constructor() {
        this.connect();
    }

    private async connect(): Promise<void> {
        const esHost = process.env.ELASTICSEARCH_HOST || 'http://localhost:9200';

        try {
            this.client = new Client({ node: esHost });
            await this.client.ping();

            this.connected = true;
            console.log(`  ✅ Elasticsearch connecté: ${esHost}`);

            // Créer les indices si nécessaire
            await this.ensureIndices();
        } catch (error) {
            console.log(`  ⚠️ Elasticsearch non disponible: ${esHost}`);
            console.log('     Mode simulation activé');
            this.connected = false;
        }
    }

    private async ensureIndices(): Promise<void> {
        if (!this.client) return;

        for (const [name, index] of Object.entries(this.indices)) {
            try {
                const exists = await this.client.indices.exists({ index });
                if (!exists) {
                    await this.client.indices.create({
                        index,
                        body: this.getIndexMapping(name)
                    });
                    console.log(`     ✅ Index créé: ${index}`);
                }
            } catch (error) {
                // Index existe déjà ou erreur
            }
        }
    }

    private getIndexMapping(indexName: string): object {
        const mappings: Record<string, object> = {
            transactions: {
                mappings: {
                    properties: {
                        id: { type: 'keyword' },
                        timestamp: { type: 'date' },
                        type: { type: 'keyword' },
                        amount: { type: 'long' },
                        currency: { type: 'keyword' },
                        responseCode: { type: 'keyword' },
                        terminalId: { type: 'keyword' },
                        latency: { type: 'integer' },
                        pan: { type: 'keyword' },
                        location: { type: 'geo_point' }
                    }
                }
            },
            metrics: {
                mappings: {
                    properties: {
                        timestamp: { type: 'date' },
                        requestsPerSecond: { type: 'float' },
                        avgLatency: { type: 'float' },
                        p95Latency: { type: 'float' },
                        p99Latency: { type: 'float' },
                        errorRate: { type: 'float' },
                        activeConnections: { type: 'integer' }
                    }
                }
            },
            alerts: {
                mappings: {
                    properties: {
                        id: { type: 'keyword' },
                        timestamp: { type: 'date' },
                        severity: { type: 'keyword' },
                        type: { type: 'keyword' },
                        message: { type: 'text' },
                        resolved: { type: 'boolean' }
                    }
                }
            },
            analytics: {
                mappings: {
                    properties: {
                        timestamp: { type: 'date' },
                        studentId: { type: 'keyword' },
                        workshop: { type: 'keyword' },
                        score: { type: 'integer' },
                        completed: { type: 'boolean' },
                        duration: { type: 'integer' }
                    }
                }
            }
        };

        return mappings[indexName] || {};
    }

    isConnected(): boolean {
        return this.connected;
    }

    // Indexer un document
    async index(doc: IndexedDocument): Promise<boolean> {
        if (!this.client || !this.connected) {
            return this.simulateIndex(doc);
        }

        try {
            await this.client.index({
                index: doc.index,
                id: doc.id,
                body: doc.body
            });
            return true;
        } catch (error) {
            console.error('Erreur indexation:', error);
            return false;
        }
    }

    private simulateIndex(doc: IndexedDocument): boolean {
        // Mode simulation - log seulement
        return true;
    }

    // Rechercher des documents
    async search(query: SearchQuery): Promise<any[]> {
        if (!this.client || !this.connected) {
            return this.simulateSearch(query);
        }

        try {
            const result = await this.client.search({
                index: query.index,
                body: {
                    query: query.query || { match_all: {} },
                    size: query.size || 100,
                    from: query.from || 0,
                    sort: query.sort || [{ timestamp: { order: 'desc' } }]
                }
            });

            return result.hits.hits.map((hit: any) => ({
                id: hit._id,
                ...hit._source
            }));
        } catch (error) {
            console.error('Erreur recherche:', error);
            return [];
        }
    }

    private simulateSearch(query: SearchQuery): any[] {
        // Retourner des données simulées
        const data = [];
        const size = query.size || 20;

        for (let i = 0; i < size; i++) {
            if (query.index === this.indices.transactions) {
                data.push({
                    id: `txn-${Date.now()}-${i}`,
                    timestamp: new Date(Date.now() - i * 60000).toISOString(),
                    type: ['auth', 'refund', 'reversal'][Math.floor(Math.random() * 3)],
                    amount: Math.floor(Math.random() * 50000) + 100,
                    currency: 'EUR',
                    responseCode: ['00', '05', '51'][Math.floor(Math.random() * 3)],
                    terminalId: `TERM00${Math.floor(Math.random() * 5) + 1}`,
                    latency: Math.floor(Math.random() * 200) + 50
                });
            } else if (query.index === this.indices.metrics) {
                data.push({
                    timestamp: new Date(Date.now() - i * 60000).toISOString(),
                    requestsPerSecond: Math.floor(Math.random() * 100) + 50,
                    avgLatency: Math.floor(Math.random() * 100) + 50,
                    errorRate: Math.random() * 0.05
                });
            }
        }

        return data;
    }

    // Agrégations
    async aggregate(index: string, aggs: object): Promise<any> {
        if (!this.client || !this.connected) {
            return this.simulateAggregation(index, aggs);
        }

        try {
            const result = await this.client.search({
                index,
                body: {
                    size: 0,
                    aggs
                }
            });
            return result.aggregations;
        } catch (error) {
            console.error('Erreur agrégation:', error);
            return null;
        }
    }

    private simulateAggregation(index: string, aggs: object): any {
        // Retourner des agrégations simulées
        return {
            byResponseCode: {
                buckets: [
                    { key: '00', doc_count: 850 },
                    { key: '05', doc_count: 75 },
                    { key: '51', doc_count: 50 },
                    { key: '14', doc_count: 15 },
                    { key: '54', doc_count: 10 }
                ]
            },
            avgLatency: { value: 85.5 },
            p95Latency: { value: 180 },
            errorRate: { value: 0.025 }
        };
    }

    // Obtenir les métriques en temps réel
    async getRealtimeMetrics(): Promise<object> {
        const now = new Date();
        const oneMinuteAgo = new Date(now.getTime() - 60000);

        if (!this.connected) {
            return {
                requestsPerSecond: Math.floor(Math.random() * 100) + 50,
                avgLatency: Math.floor(Math.random() * 100) + 50,
                p95Latency: Math.floor(Math.random() * 200) + 100,
                p99Latency: Math.floor(Math.random() * 400) + 200,
                errorRate: Math.random() * 0.05,
                successRate: 0.95 + Math.random() * 0.04,
                totalTransactions: Math.floor(Math.random() * 10000) + 50000
            };
        }

        // Vraie requête Elasticsearch
        try {
            const result = await this.aggregate(this.indices.transactions, {
                recentTransactions: {
                    filter: { range: { timestamp: { gte: oneMinuteAgo.toISOString() } } },
                    aggs: {
                        count: { value_count: { field: 'id' } },
                        avgLatency: { avg: { field: 'latency' } },
                        errors: {
                            filter: { bool: { must_not: { term: { responseCode: '00' } } } }
                        }
                    }
                }
            });

            return result;
        } catch (error) {
            return {};
        }
    }
}
