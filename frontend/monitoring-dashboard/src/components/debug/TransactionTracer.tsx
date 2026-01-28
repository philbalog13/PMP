/**
 * Transaction Tracer Component
 * Trace une transaction par son ID unique
 */

import { useState } from 'react';

interface TraceStep {
    id: number;
    name: string;
    service: string;
    timestamp: string;
    duration: number;
    status: 'success' | 'error' | 'warning';
    details: Record<string, any>;
}

interface TraceData {
    transactionId: string;
    status: string;
    startTime: string;
    endTime: string;
    totalDuration: number;
    steps: TraceStep[];
    request: any;
    response: any;
}

export default function TransactionTracer() {
    const [txnId, setTxnId] = useState('');
    const [trace, setTrace] = useState<TraceData | null>(null);
    const [loading, setLoading] = useState(false);
    const [selectedStep, setSelectedStep] = useState<TraceStep | null>(null);

    const loadTrace = async () => {
        if (!txnId.trim()) return;

        setLoading(true);
        try {
            const res = await fetch(`/api/debug/trace/${txnId}`);
            const json = await res.json();
            setTrace(json.data);
        } catch (error) {
            // Use mock data
            setTrace(generateMockTrace(txnId));
        } finally {
            setLoading(false);
        }
    };

    const statusColors = {
        success: '#22c55e',
        error: '#ef4444',
        warning: '#f59e0b'
    };

    return (
        <div>
            <div className="card-header">
                <h3 className="card-title">
                    <span className="card-title-icon">🔍</span>
                    Transaction Tracer
                </h3>
            </div>

            <div className="card-body">
                {/* Search Input */}
                <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
                    <input
                        type="text"
                        className="debug-input"
                        style={{ minHeight: 'auto', height: '44px', flex: 1 }}
                        placeholder="Entrez l'ID de transaction (ex: txn-1234567890)"
                        value={txnId}
                        onChange={(e) => setTxnId(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && loadTrace()}
                    />
                    <button
                        className="btn btn-primary"
                        onClick={loadTrace}
                        disabled={loading}
                    >
                        {loading ? '⏳' : '🔍'} Tracer
                    </button>
                </div>

                {/* Trace Results */}
                {trace && (
                    <div>
                        {/* Summary */}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(4, 1fr)',
                            gap: '16px',
                            marginBottom: '24px'
                        }}>
                            <div style={{
                                background: 'var(--bg-tertiary)',
                                padding: '16px',
                                borderRadius: 'var(--radius-sm)'
                            }}>
                                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>ID</div>
                                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', marginTop: '4px' }}>
                                    {trace.transactionId}
                                </div>
                            </div>

                            <div style={{
                                background: 'var(--bg-tertiary)',
                                padding: '16px',
                                borderRadius: 'var(--radius-sm)'
                            }}>
                                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Statut</div>
                                <div style={{
                                    color: trace.status === 'completed' ? '#22c55e' : '#ef4444',
                                    fontWeight: 600,
                                    marginTop: '4px'
                                }}>
                                    {trace.status === 'completed' ? '✓ Terminé' : '✗ Échoué'}
                                </div>
                            </div>

                            <div style={{
                                background: 'var(--bg-tertiary)',
                                padding: '16px',
                                borderRadius: 'var(--radius-sm)'
                            }}>
                                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Durée Totale</div>
                                <div style={{ fontWeight: 600, marginTop: '4px' }}>
                                    {trace.totalDuration}ms
                                </div>
                            </div>

                            <div style={{
                                background: 'var(--bg-tertiary)',
                                padding: '16px',
                                borderRadius: 'var(--radius-sm)'
                            }}>
                                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Étapes</div>
                                <div style={{ fontWeight: 600, marginTop: '4px' }}>
                                    {trace.steps.length} étapes
                                </div>
                            </div>
                        </div>

                        {/* Timeline */}
                        <div style={{ display: 'flex', gap: '24px' }}>
                            {/* Steps Timeline */}
                            <div style={{ flex: 2 }}>
                                <h4 style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>
                                    Timeline
                                </h4>
                                <div style={{
                                    position: 'relative',
                                    paddingLeft: '24px',
                                    borderLeft: '2px solid var(--border-color)'
                                }}>
                                    {trace.steps.map((step, index) => (
                                        <div
                                            key={step.id}
                                            onClick={() => setSelectedStep(step)}
                                            style={{
                                                position: 'relative',
                                                marginBottom: '16px',
                                                padding: '12px 16px',
                                                background: selectedStep?.id === step.id
                                                    ? 'var(--bg-tertiary)'
                                                    : 'transparent',
                                                borderRadius: 'var(--radius-sm)',
                                                cursor: 'pointer',
                                                transition: 'all var(--transition-fast)'
                                            }}
                                        >
                                            {/* Dot on timeline */}
                                            <div style={{
                                                position: 'absolute',
                                                left: '-31px',
                                                top: '16px',
                                                width: '12px',
                                                height: '12px',
                                                borderRadius: '50%',
                                                background: statusColors[step.status],
                                                border: '2px solid var(--bg-primary)'
                                            }} />

                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div>
                                                    <span style={{ fontWeight: 500 }}>{step.name}</span>
                                                    <span style={{
                                                        marginLeft: '8px',
                                                        fontSize: '12px',
                                                        color: 'var(--text-secondary)'
                                                    }}>
                                                        ({step.service})
                                                    </span>
                                                </div>
                                                <span style={{
                                                    fontSize: '12px',
                                                    color: statusColors[step.status],
                                                    fontWeight: 600
                                                }}>
                                                    {step.duration}ms
                                                </span>
                                            </div>

                                            <div style={{
                                                fontSize: '11px',
                                                color: 'var(--text-tertiary)',
                                                marginTop: '4px'
                                            }}>
                                                {new Date(step.timestamp).toLocaleTimeString('fr-FR', {
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                    second: '2-digit',
                                                    fractionalSecondDigits: 3
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Step Details */}
                            <div style={{ flex: 1 }}>
                                <h4 style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>
                                    Détails
                                </h4>
                                {selectedStep ? (
                                    <div style={{
                                        background: 'var(--bg-tertiary)',
                                        padding: '16px',
                                        borderRadius: 'var(--radius-sm)'
                                    }}>
                                        <div style={{ marginBottom: '12px' }}>
                                            <strong>{selectedStep.name}</strong>
                                        </div>
                                        <pre style={{
                                            fontFamily: 'var(--font-mono)',
                                            fontSize: '12px',
                                            background: 'var(--bg-primary)',
                                            padding: '12px',
                                            borderRadius: 'var(--radius-sm)',
                                            overflow: 'auto',
                                            maxHeight: '300px'
                                        }}>
                                            {JSON.stringify(selectedStep.details, null, 2)}
                                        </pre>
                                    </div>
                                ) : (
                                    <div style={{
                                        color: 'var(--text-tertiary)',
                                        textAlign: 'center',
                                        padding: '40px'
                                    }}>
                                        Sélectionnez une étape
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Empty State */}
                {!trace && !loading && (
                    <div style={{
                        textAlign: 'center',
                        padding: '60px',
                        color: 'var(--text-secondary)'
                    }}>
                        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔍</div>
                        <div>Entrez un ID de transaction pour voir sa trace complète</div>
                    </div>
                )}
            </div>
        </div>
    );
}

function generateMockTrace(txnId: string): TraceData {
    const baseTime = Date.now();

    return {
        transactionId: txnId || `txn-${baseTime}`,
        status: 'completed',
        startTime: new Date(baseTime - 1500).toISOString(),
        endTime: new Date(baseTime).toISOString(),
        totalDuration: 1500,
        steps: [
            { id: 1, name: 'Request Received', service: 'Gateway', timestamp: new Date(baseTime - 1500).toISOString(), duration: 5, status: 'success', details: { source: 'TERM001', method: 'POST' } },
            { id: 2, name: 'Message Parsing', service: 'Switch', timestamp: new Date(baseTime - 1495).toISOString(), duration: 15, status: 'success', details: { mti: '0100', fields: 22 } },
            { id: 3, name: 'MAC Verification', service: 'HSM', timestamp: new Date(baseTime - 1480).toISOString(), duration: 45, status: 'success', details: { algorithm: 'ISO-9797-1-ALG3', valid: true } },
            { id: 4, name: 'PIN Verification', service: 'HSM', timestamp: new Date(baseTime - 1435).toISOString(), duration: 80, status: 'success', details: { format: 'ISO-9564-1-FORMAT0', attempts: 1 } },
            { id: 5, name: 'Authorization', service: 'Auth Engine', timestamp: new Date(baseTime - 1355).toISOString(), duration: 850, status: 'success', details: { issuer: 'BNP', responseCode: '00' } },
            { id: 6, name: 'Response Generation', service: 'Switch', timestamp: new Date(baseTime - 505).toISOString(), duration: 25, status: 'success', details: { mti: '0110', authCode: 'ABC123' } },
            { id: 7, name: 'MAC Calculation', service: 'HSM', timestamp: new Date(baseTime - 480).toISOString(), duration: 40, status: 'success', details: { algorithm: 'ISO-9797-1-ALG3' } },
            { id: 8, name: 'Response Sent', service: 'Gateway', timestamp: new Date(baseTime - 440).toISOString(), duration: 10, status: 'success', details: { destination: 'TERM001' } }
        ],
        request: { mti: '0100', pan: '****1234', amount: 15000 },
        response: { mti: '0110', responseCode: '00', authCode: 'ABC123' }
    };
}
