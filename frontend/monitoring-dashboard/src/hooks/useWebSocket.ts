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

type DataSource = 'live' | 'simulated';

interface WebSocketState {
    connected: boolean;
    reconnecting: boolean;
    dataSource: DataSource;
    transactions: Transaction[];
    metrics: Metrics | null;
    subscribe: (channel: string) => void;
    unsubscribe: (channel: string) => void;
    send: (type: string, payload: unknown) => void;
}

const MAX_TRANSACTIONS = 100;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_BASE_DELAY_MS = 1000;
const RECONNECT_MAX_DELAY_MS = 15000;

function resolveWebSocketUrl(): string {
    const envUrl = import.meta.env.VITE_MONITORING_WS_URL as string | undefined;
    if (envUrl && envUrl.trim()) {
        return envUrl;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}/ws`;
}

export function useWebSocket(): WebSocketState {
    const [connected, setConnected] = useState(false);
    const [reconnecting, setReconnecting] = useState(false);
    const [dataSource, setDataSource] = useState<DataSource>('live');
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [metrics, setMetrics] = useState<Metrics | null>(null);

    const wsRef = useRef<WebSocket | null>(null);
    const reconnectTimeoutRef = useRef<number | null>(null);
    const reconnectAttemptsRef = useRef(0);
    const simulationCleanupRef = useRef<(() => void) | null>(null);
    const simulationEnabledRef = useRef(false);
    const isUnmountedRef = useRef(false);
    const connectRef = useRef<() => void>(() => undefined);

    const clearReconnectTimeout = useCallback(() => {
        if (reconnectTimeoutRef.current !== null) {
            window.clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
        }
    }, []);

    const stopSimulation = useCallback(() => {
        if (simulationCleanupRef.current) {
            simulationCleanupRef.current();
            simulationCleanupRef.current = null;
        }
    }, []);

    const handleMessage = useCallback((message: any) => {
        switch (message.type) {
            case 'transaction':
                if (message.payload) {
                    setTransactions((prev) => [message.payload, ...prev].slice(0, MAX_TRANSACTIONS));
                }
                break;

            case 'metrics':
                setMetrics(message.payload);
                break;

            case 'history':
                if (message.channel === 'transactions') {
                    const payload = Array.isArray(message.payload) ? message.payload : [];
                    setTransactions(payload.slice(0, MAX_TRANSACTIONS));
                }
                break;

            case 'connected':
            case 'subscribed':
            case 'unsubscribed':
                break;

            default:
                console.log('Unknown message type:', message.type);
        }
    }, []);

    const startSimulation = useCallback(() => {
        if (simulationCleanupRef.current) {
            return;
        }

        simulationEnabledRef.current = true;
        setConnected(false);
        setReconnecting(false);
        setDataSource('simulated');
        setTransactions(Array.from({ length: 20 }, () => generateTransaction()));
        setMetrics(generateMetrics());

        const txnInterval = window.setInterval(() => {
            setTransactions((prev) => [generateTransaction(), ...prev].slice(0, MAX_TRANSACTIONS));
        }, 1000);

        const metricsInterval = window.setInterval(() => {
            setMetrics(generateMetrics());
        }, 2000);

        simulationCleanupRef.current = () => {
            window.clearInterval(txnInterval);
            window.clearInterval(metricsInterval);
        };
    }, []);

    const scheduleReconnect = useCallback(() => {
        if (isUnmountedRef.current || simulationEnabledRef.current || reconnectTimeoutRef.current !== null) {
            return;
        }

        const attempt = reconnectAttemptsRef.current + 1;
        reconnectAttemptsRef.current = attempt;

        if (attempt > MAX_RECONNECT_ATTEMPTS) {
            startSimulation();
            return;
        }

        setReconnecting(true);
        const delay = Math.min(RECONNECT_BASE_DELAY_MS * 2 ** (attempt - 1), RECONNECT_MAX_DELAY_MS);

        reconnectTimeoutRef.current = window.setTimeout(() => {
            reconnectTimeoutRef.current = null;
            if (!isUnmountedRef.current && !simulationEnabledRef.current) {
                connectRef.current();
            }
        }, delay);
    }, [startSimulation]);

    const connect = useCallback(() => {
        if (isUnmountedRef.current || simulationEnabledRef.current) {
            return;
        }

        clearReconnectTimeout();

        try {
            const ws = new WebSocket(resolveWebSocketUrl());
            wsRef.current = ws;

            ws.onopen = () => {
                reconnectAttemptsRef.current = 0;
                setConnected(true);
                setReconnecting(false);
                setDataSource('live');
                simulationEnabledRef.current = false;
                stopSimulation();

                ws.send(JSON.stringify({ type: 'subscribe', payload: { channel: 'transactions' } }));
                ws.send(JSON.stringify({ type: 'subscribe', payload: { channel: 'metrics' } }));
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
                if (wsRef.current === ws) {
                    wsRef.current = null;
                }
                setConnected(false);
                if (!isUnmountedRef.current) {
                    scheduleReconnect();
                }
            };

            ws.onerror = () => {
                // onclose handles retry policy
            };
        } catch (error) {
            console.error('Failed to initialize WebSocket:', error);
            scheduleReconnect();
        }
    }, [clearReconnectTimeout, handleMessage, scheduleReconnect, stopSimulation]);

    useEffect(() => {
        connectRef.current = connect;
    }, [connect]);

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

    const send = useCallback((type: string, payload: unknown) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type, payload }));
        }
    }, []);

    useEffect(() => {
        isUnmountedRef.current = false;
        connect();

        return () => {
            isUnmountedRef.current = true;
            clearReconnectTimeout();
            stopSimulation();
            if (wsRef.current) {
                wsRef.current.close();
                wsRef.current = null;
            }
        };
    }, [clearReconnectTimeout, connect, stopSimulation]);

    return {
        connected,
        reconnecting,
        dataSource,
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
        id: `txn-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
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

export type { Transaction, Metrics, DataSource };
