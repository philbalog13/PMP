/**
 * Debug Tools Dashboard
 * Transaction Tracer, Message Decoder, Crypto Debugger, Performance Profiler
 */

import { useState } from 'react';
import TransactionTracer from './TransactionTracer';
import MessageDecoder from './MessageDecoder';
import CryptoDebugger from './CryptoDebugger';

type Tool = 'tracer' | 'decoder' | 'crypto' | 'profiler';

export default function DebugTools() {
    const [activeTool, setActiveTool] = useState<Tool>('tracer');

    const tools = [
        { id: 'tracer' as Tool, label: '🔍 Transaction Tracer', description: 'Trace par ID' },
        { id: 'decoder' as Tool, label: '📝 Message Decoder', description: 'ISO 8583 ↔ JSON' },
        { id: 'crypto' as Tool, label: '🔐 Crypto Debugger', description: 'Étape par étape' },
        { id: 'profiler' as Tool, label: '⚡ Performance', description: 'Profiler' }
    ];

    return (
        <div>
            {/* Tool Selector */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '12px',
                marginBottom: '24px'
            }}>
                {tools.map(tool => (
                    <button
                        key={tool.id}
                        onClick={() => setActiveTool(tool.id)}
                        style={{
                            background: activeTool === tool.id
                                ? 'var(--accent-gradient)'
                                : 'var(--bg-secondary)',
                            border: activeTool === tool.id
                                ? 'none'
                                : '1px solid var(--border-color)',
                            borderRadius: 'var(--radius-md)',
                            padding: '16px',
                            cursor: 'pointer',
                            textAlign: 'left',
                            transition: 'all var(--transition-fast)'
                        }}
                    >
                        <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>
                            {tool.label}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                            {tool.description}
                        </div>
                    </button>
                ))}
            </div>

            {/* Active Tool */}
            <div className="card">
                {activeTool === 'tracer' && <TransactionTracer />}
                {activeTool === 'decoder' && <MessageDecoder />}
                {activeTool === 'crypto' && <CryptoDebugger />}
                {activeTool === 'profiler' && <PerformanceProfiler />}
            </div>
        </div>
    );
}

// Performance Profiler Component
function PerformanceProfiler() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    const loadProfile = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/debug/performance');
            const json = await res.json();
            setData(json.data);
        } catch (error) {
            // Use mock data
            setData(generateMockProfile());
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <div className="card-header">
                <h3 className="card-title">
                    <span className="card-title-icon">⚡</span>
                    Performance Profiler
                </h3>
                <button className="btn btn-primary" onClick={loadProfile}>
                    {loading ? 'Chargement...' : '🔄 Actualiser'}
                </button>
            </div>

            <div className="card-body">
                {!data ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                        Cliquez sur Actualiser pour lancer le profiler
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                        {/* CPU & Memory */}
                        <div>
                            <h4 style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>
                                Ressources Système
                            </h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <div style={{
                                    background: 'var(--bg-tertiary)',
                                    padding: '16px',
                                    borderRadius: 'var(--radius-sm)'
                                }}>
                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        marginBottom: '8px'
                                    }}>
                                        <span>CPU</span>
                                        <span style={{ fontWeight: 600 }}>
                                            {((data.cpu?.usage || 0.35) * 100).toFixed(1)}%
                                        </span>
                                    </div>
                                    <div className="progress-bar">
                                        <div
                                            className="progress-fill"
                                            style={{
                                                width: `${(data.cpu?.usage || 0.35) * 100}%`,
                                                background: data.cpu?.usage > 0.8 ? '#ef4444' : 'var(--accent-gradient)'
                                            }}
                                        />
                                    </div>
                                </div>

                                <div style={{
                                    background: 'var(--bg-tertiary)',
                                    padding: '16px',
                                    borderRadius: 'var(--radius-sm)'
                                }}>
                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        marginBottom: '8px'
                                    }}>
                                        <span>Mémoire Heap</span>
                                        <span style={{ fontWeight: 600 }}>
                                            {((data.memory?.heapUsed || 500000000) / 1024 / 1024).toFixed(0)} MB
                                        </span>
                                    </div>
                                    <div className="progress-bar">
                                        <div
                                            className="progress-fill"
                                            style={{
                                                width: `${((data.memory?.heapUsed || 500000000) / (data.memory?.heapTotal || 1073741824)) * 100}%`
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Hotspots */}
                        <div>
                            <h4 style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>
                                Points Chauds (Flame Graph)
                            </h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {(data.hotspots || []).map((hotspot: any, i: number) => (
                                    <div key={i} style={{
                                        background: `linear-gradient(90deg, rgba(239, 68, 68, ${0.3 + (hotspot.percentage / 100) * 0.7}) 0%, transparent ${hotspot.percentage}%)`,
                                        padding: '12px',
                                        borderRadius: 'var(--radius-sm)',
                                        fontFamily: 'var(--font-mono)',
                                        fontSize: '12px'
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span>{hotspot.function}</span>
                                            <span style={{ fontWeight: 600 }}>{hotspot.percentage}%</span>
                                        </div>
                                        <div style={{ color: 'var(--text-secondary)', fontSize: '11px', marginTop: '4px' }}>
                                            {hotspot.time}ms · {hotspot.calls} appels
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Service Stats */}
                        <div style={{ gridColumn: '1 / -1' }}>
                            <h4 style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>
                                Performance par Service
                            </h4>
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Service</th>
                                        <th>Appels</th>
                                        <th>Latence Moy.</th>
                                        <th>P99</th>
                                        <th>% du Temps</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(data.services || []).map((service: any, i: number) => (
                                        <tr key={i}>
                                            <td style={{ fontWeight: 500 }}>{service.name}</td>
                                            <td>{service.calls.toLocaleString()}</td>
                                            <td>{service.avgLatency}ms</td>
                                            <td>{service.p99Latency}ms</td>
                                            <td>
                                                <div style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '8px'
                                                }}>
                                                    <div
                                                        className="progress-bar"
                                                        style={{ width: '100px', height: '6px' }}
                                                    >
                                                        <div
                                                            className="progress-fill"
                                                            style={{
                                                                width: `${(service.calls / 3500) * 100}%`
                                                            }}
                                                        />
                                                    </div>
                                                    <span style={{ fontSize: '12px' }}>
                                                        {((service.calls / 3500) * 100).toFixed(0)}%
                                                    </span>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function generateMockProfile() {
    return {
        timestamp: new Date().toISOString(),
        cpu: { usage: 0.35, cores: 8 },
        memory: { heapUsed: 450000000, heapTotal: 1073741824 },
        services: [
            { name: 'Gateway', calls: 1250, avgLatency: 12, p99Latency: 45 },
            { name: 'Switch', calls: 1200, avgLatency: 25, p99Latency: 80 },
            { name: 'Auth Engine', calls: 1150, avgLatency: 85, p99Latency: 250 },
            { name: 'HSM', calls: 2300, avgLatency: 35, p99Latency: 90 },
            { name: 'Database', calls: 3500, avgLatency: 8, p99Latency: 30 }
        ],
        hotspots: [
            { function: 'AuthEngine.processAuth', time: 45, calls: 1150, percentage: 35 },
            { function: 'HSM.calculateMAC', time: 20, calls: 2300, percentage: 15 },
            { function: 'Switch.parseMessage', time: 15, calls: 1200, percentage: 12 },
            { function: 'Database.query', time: 12, calls: 3500, percentage: 10 },
            { function: 'HSM.verifyPIN', time: 18, calls: 1150, percentage: 14 }
        ]
    };
}
