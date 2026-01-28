/**
 * WebSocket Hook for real-time data streaming
 */

import { useState, useEffect, useCallback, useRef } from 'react';

interface Transaction {
    id: string;
    timestamp: string;
    type: string;
    amount: number;
    currency: string;
    responseCode: string;
    terminalId: string;
    latency: number;
    pan: string;
    location?: { lat: number; lng: number };
}

interface Metrics {
    timestamp: string;
    requestsPerSecond: number;
    avgLatency: number;
    p95Latency: number;
    p99Latency: number;
    errorRate: number;
    activeConnections: number;
    services: Record<string, { status: string; latency: number }>;
}

interface WebSocketState {
    connected: boolean;
    reconnecting: boolean;
    transactions: Transaction[];
    metrics: Metrics | null;
    subscribe: (channel: string) => void;
    unsubscribe: (channel: string) => void;
    send: (type: string, payload: any) => void;
}

export function useWebSocket(): WebSocketState {
    const [connected, setConnected] = useState(false);
    const [reconnecting, setReconnecting] = useState(false);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [metrics, setMetrics] = useState<Metrics | null>(null);

    const wsRef = useRef<WebSocket | null>(null);
    const reconnectTimeoutRef = useRef<number | null>(null);
    const maxTransactions = 100;

    const connect = useCallback(() => {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws`;

        try {
            const ws = new WebSocket(wsUrl);
            wsRef.current = ws;

            ws.onopen = () => {
                console.log('WebSocket connected');
                setConnected(true);
                setReconnecting(false);

                // Subscribe to default channels
                ws.send(JSON.stringify({ type: 'subscribe', payload: { channel: 'transactions' } }));
                ws.send(JSON.stringify({ type: 'subscribe', payload: { channel: 'metrics' } }));

                // Request historical data
                ws.send(JSON.stringify({ type: 'getHistory', payload: { channel: 'transactions', limit: 50 } }));
            };

            ws.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);
                    handleMessage(message);
                } catch (error) {
                    console.error('Failed to parse WebSocket message:', error);
                }
            };

            ws.onclose = () => {
                console.log('WebSocket disconnected');
                setConnected(false);
                wsRef.current = null;

                // Attempt to reconnect
                if (!reconnecting) {
                    setReconnecting(true);
                    reconnectTimeoutRef.current = window.setTimeout(() => {
                        connect();
                    }, 3000);
                }
            };

            ws.onerror = (error) => {
                console.error('WebSocket error:', error);
            };
        } catch (error) {
            console.error('Failed to connect WebSocket:', error);

            // Generate simulated data for demo purposes
            startSimulation();
        }
    }, [reconnecting]);

    const handleMessage = useCallback((message: any) => {
        switch (message.type) {
            case 'transaction':
                setTransactions(prev => {
                    const updated = [message.payload, ...prev];
                    return updated.slice(0, maxTransactions);
                });
                break;

            case 'metrics':
                setMetrics(message.payload);
                break;

            case 'history':
                if (message.channel === 'transactions') {
                    setTransactions(message.payload || []);
                }
                break;

            case 'connected':
                console.log('Connected with ID:', message.payload.clientId);
                break;

            case 'subscribed':
                console.log('Subscribed to:', message.payload.channel);
                break;

            default:
                console.log('Unknown message type:', message.type);
        }
    }, []);

    // Simulation for when WebSocket is not available
    const startSimulation = useCallback(() => {
        console.log('Starting simulated data...');
        setConnected(true);

        // Generate initial transactions
        const initialTxns: Transaction[] = [];
        for (let i = 0; i < 20; i++) {
            initialTxns.push(generateTransaction());
        }
        setTransactions(initialTxns);

        // Simulate real-time updates
        const txnInterval = setInterval(() => {
            setTransactions(prev => {
                const updated = [generateTransaction(), ...prev];
                return updated.slice(0, maxTransactions);
            });
        }, 1000);

        const metricsInterval = setInterval(() => {
            setMetrics(generateMetrics());
        }, 2000);

        return () => {
            clearInterval(txnInterval);
            clearInterval(metricsInterval);
        };
    }, []);

    const subscribe = useCallback((channel: string) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: 'subscribe', payload: { channel } }));
        }
    }, []);

    const unsubscribe = useCallback((channel: string) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: 'unsubscribe', payload: { channel } }));
        }
    }, []);

    const send = useCallback((type: string, payload: any) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type, payload }));
        }
    }, []);

    useEffect(() => {
        connect();

        return () => {
            if (wsRef.current) {
                wsRef.current.close();
            }
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
        };
    }, [connect]);

    return {
        connected,
        reconnecting,
        transactions,
        metrics,
        subscribe,
        unsubscribe,
        send
    };
}

// Helper functions for simulation
function generateTransaction(): Transaction {
    const responseCodes = ['00', '00', '00', '00', '05', '51', '14', '54'];
    const types = ['auth', 'auth', 'auth', 'refund', 'reversal'];
    const terminals = ['TERM001', 'TERM002', 'TERM003', 'TERM004', 'TERM005'];

    return {
        id: `txn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
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

function generateMetrics(): Metrics {
    return {
        timestamp: new Date().toISOString(),
        requestsPerSecond: Math.floor(Math.random() * 100) + 50,
        avgLatency: Math.floor(Math.random() * 100) + 50,
        p95Latency: Math.floor(Math.random() * 200) + 100,
        p99Latency: Math.floor(Math.random() * 400) + 200,
        errorRate: Math.random() * 0.05,
        activeConnections: Math.floor(Math.random() * 50) + 10,
        services: {
            'auth-engine': { status: 'up', latency: Math.floor(Math.random() * 50) + 20 },
            'hsm-simulator': { status: 'up', latency: Math.floor(Math.random() * 30) + 10 },
            'switch': { status: 'up', latency: Math.floor(Math.random() * 40) + 15 }
        }
    };
}

export type { Transaction, Metrics };
