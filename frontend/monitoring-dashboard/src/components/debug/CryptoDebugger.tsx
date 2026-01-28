/**
 * Crypto Debugger Component
 * Step-by-step visualization of cryptographic operations
 */

import { useState } from 'react';

interface CryptoStep {
    step: number;
    name: string;
    value: string;
    type: string;
}

interface CryptoResult {
    operation: string;
    algorithm: string;
    steps: CryptoStep[];
    duration: number;
    success: boolean;
}

type Operation = 'encrypt' | 'mac' | 'pin-block' | 'dukpt';

export default function CryptoDebugger() {
    const [operation, setOperation] = useState<Operation>('mac');
    const [data, setData] = useState('');
    const [key, setKey] = useState('');
    const [result, setResult] = useState<CryptoResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [animatingStep, setAnimatingStep] = useState(-1);

    const operations: { id: Operation; label: string; icon: string; description: string }[] = [
        { id: 'encrypt', label: 'Chiffrement', icon: '🔒', description: 'AES-256-CBC' },
        { id: 'mac', label: 'MAC', icon: '🛡️', description: 'ISO 9797-1 Algorithm 3' },
        { id: 'pin-block', label: 'PIN Block', icon: '🔐', description: 'ISO 9564-1 Format 0' },
        { id: 'dukpt', label: 'DUKPT', icon: '🔑', description: 'Key Derivation' }
    ];

    const runCrypto = async () => {
        if (!data.trim()) return;

        setLoading(true);
        setResult(null);
        setAnimatingStep(-1);

        try {
            const res = await fetch('/api/debug/crypto', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ operation, data, key: key || 'default_key_123' })
            });
            const json = await res.json();
            setResult(json.data);
            animateSteps(json.data.steps.length);
        } catch (error) {
            // Use mock data
            const mockResult = generateMockCrypto(operation, data);
            setResult(mockResult);
            animateSteps(mockResult.steps.length);
        } finally {
            setLoading(false);
        }
    };

    const animateSteps = (totalSteps: number) => {
        let currentStep = 0;
        const interval = setInterval(() => {
            setAnimatingStep(currentStep);
            currentStep++;
            if (currentStep >= totalSteps) {
                clearInterval(interval);
            }
        }, 300);
    };

    const getStepColor = (type: string) => {
        switch (type) {
            case 'plaintext':
            case 'message':
            case 'pin':
                return '#3b82f6';
            case 'key':
                return '#f59e0b';
            case 'algorithm':
            case 'format':
                return '#8b5cf6';
            case 'iv':
            case 'padding':
                return '#6b7280';
            case 'intermediate':
                return '#06b6d4';
            case 'ciphertext':
            case 'mac':
            case 'pinblock':
                return '#22c55e';
            default:
                return 'var(--text-primary)';
        }
    };

    return (
        <div>
            <div className="card-header">
                <h3 className="card-title">
                    <span className="card-title-icon">🔐</span>
                    Crypto Debugger
                </h3>
            </div>

            <div className="card-body">
                {/* Operation Selector */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: '12px',
                    marginBottom: '24px'
                }}>
                    {operations.map(op => (
                        <button
                            key={op.id}
                            onClick={() => { setOperation(op.id); setResult(null); }}
                            style={{
                                background: operation === op.id
                                    ? 'var(--accent-gradient)'
                                    : 'var(--bg-tertiary)',
                                border: 'none',
                                borderRadius: 'var(--radius-sm)',
                                padding: '12px',
                                cursor: 'pointer',
                                textAlign: 'center'
                            }}
                        >
                            <div style={{ fontSize: '24px', marginBottom: '4px' }}>{op.icon}</div>
                            <div style={{ fontWeight: 500, fontSize: '13px' }}>{op.label}</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                                {op.description}
                            </div>
                        </button>
                    ))}
                </div>

                {/* Input Fields */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: '2fr 1fr auto',
                    gap: '12px',
                    marginBottom: '24px'
                }}>
                    <input
                        type="text"
                        className="debug-input"
                        style={{ minHeight: 'auto', height: '44px' }}
                        placeholder={
                            operation === 'pin-block'
                                ? 'PAN (ex: 4111111111111111)'
                                : 'Données à traiter (hex ou texte)'
                        }
                        value={data}
                        onChange={(e) => setData(e.target.value)}
                    />
                    <input
                        type="text"
                        className="debug-input"
                        style={{ minHeight: 'auto', height: '44px' }}
                        placeholder="Clé (optionnel)"
                        value={key}
                        onChange={(e) => setKey(e.target.value)}
                    />
                    <button
                        className="btn btn-primary"
                        style={{ height: '44px', padding: '0 24px' }}
                        onClick={runCrypto}
                        disabled={loading || !data.trim()}
                    >
                        {loading ? '⏳' : '▶️'} Exécuter
                    </button>
                </div>

                {/* Results - Step by Step Animation */}
                {result && (
                    <div>
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '16px'
                        }}>
                            <h4 style={{ color: 'var(--text-secondary)', margin: 0 }}>
                                Étapes de l'opération
                            </h4>
                            <div style={{
                                display: 'flex',
                                gap: '16px',
                                fontSize: '13px'
                            }}>
                                <span>
                                    <span style={{ color: 'var(--text-secondary)' }}>Algorithme: </span>
                                    <span style={{ fontFamily: 'var(--font-mono)' }}>{result.algorithm}</span>
                                </span>
                                <span>
                                    <span style={{ color: 'var(--text-secondary)' }}>Durée: </span>
                                    <span style={{ fontWeight: 600 }}>{result.duration}ms</span>
                                </span>
                            </div>
                        </div>

                        {/* Steps Visualization */}
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px'
                        }}>
                            {result.steps.map((step, index) => (
                                <div
                                    key={step.step}
                                    style={{
                                        display: 'grid',
                                        gridTemplateColumns: '32px 180px 1fr',
                                        gap: '16px',
                                        padding: '16px',
                                        background: 'var(--bg-tertiary)',
                                        borderRadius: 'var(--radius-sm)',
                                        borderLeft: `4px solid ${getStepColor(step.type)}`,
                                        opacity: animatingStep >= index ? 1 : 0.3,
                                        transform: animatingStep >= index ? 'translateX(0)' : 'translateX(-20px)',
                                        transition: 'all 0.3s ease'
                                    }}
                                >
                                    <div style={{
                                        width: '28px',
                                        height: '28px',
                                        borderRadius: '50%',
                                        background: getStepColor(step.type),
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontWeight: 600,
                                        fontSize: '12px'
                                    }}>
                                        {step.step}
                                    </div>

                                    <div>
                                        <div style={{ fontWeight: 500 }}>{step.name}</div>
                                        <div style={{
                                            fontSize: '11px',
                                            color: 'var(--text-tertiary)',
                                            textTransform: 'uppercase'
                                        }}>
                                            {step.type}
                                        </div>
                                    </div>

                                    <div style={{
                                        fontFamily: 'var(--font-mono)',
                                        fontSize: '13px',
                                        background: 'var(--bg-primary)',
                                        padding: '8px 12px',
                                        borderRadius: 'var(--radius-sm)',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap'
                                    }}>
                                        {step.value}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Final Result */}
                        <div style={{
                            marginTop: '24px',
                            padding: '20px',
                            background: result.success
                                ? 'rgba(34, 197, 94, 0.1)'
                                : 'rgba(239, 68, 68, 0.1)',
                            borderRadius: 'var(--radius-md)',
                            border: `1px solid ${result.success ? '#22c55e' : '#ef4444'}`
                        }}>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                marginBottom: '12px'
                            }}>
                                <span style={{ fontSize: '24px' }}>
                                    {result.success ? '✅' : '❌'}
                                </span>
                                <span style={{ fontWeight: 600, fontSize: '16px' }}>
                                    {result.success ? 'Opération réussie' : 'Opération échouée'}
                                </span>
                            </div>

                            <div style={{
                                fontFamily: 'var(--font-mono)',
                                fontSize: '14px',
                                background: 'var(--bg-primary)',
                                padding: '12px',
                                borderRadius: 'var(--radius-sm)',
                                wordBreak: 'break-all'
                            }}>
                                <span style={{ color: 'var(--text-secondary)' }}>Résultat: </span>
                                {result.steps[result.steps.length - 1]?.value || 'N/A'}
                            </div>
                        </div>
                    </div>
                )}

                {/* Empty State */}
                {!result && !loading && (
                    <div style={{
                        textAlign: 'center',
                        padding: '60px',
                        color: 'var(--text-secondary)'
                    }}>
                        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔐</div>
                        <div>Sélectionnez une opération et entrez des données pour voir le débogage étape par étape</div>
                    </div>
                )}
            </div>
        </div>
    );
}

function generateMockCrypto(operation: string, data: string): CryptoResult {
    const randomHex = (length: number) =>
        Array.from({ length }, () => Math.floor(Math.random() * 16).toString(16)).join('').toUpperCase();

    const baseSteps: Record<string, CryptoStep[]> = {
        encrypt: [
            { step: 1, name: 'Input Data', value: data, type: 'plaintext' },
            { step: 2, name: 'Key', value: 'ABCD1234...', type: 'key' },
            { step: 3, name: 'Algorithm', value: 'AES-256-CBC', type: 'algorithm' },
            { step: 4, name: 'IV Generation', value: randomHex(32), type: 'iv' },
            { step: 5, name: 'Padding', value: 'PKCS7', type: 'padding' },
            { step: 6, name: 'Encryption', value: 'CBC mode block cipher', type: 'intermediate' },
            { step: 7, name: 'Output', value: randomHex(64), type: 'ciphertext' }
        ],
        mac: [
            { step: 1, name: 'Input Data', value: data, type: 'message' },
            { step: 2, name: 'Key', value: 'EFGH5678...', type: 'key' },
            { step: 3, name: 'Padding', value: 'ISO 9797-1 Method 2', type: 'padding' },
            { step: 4, name: 'Initial Vector', value: '0000000000000000', type: 'iv' },
            { step: 5, name: 'CBC-MAC Block 1', value: randomHex(16), type: 'intermediate' },
            { step: 6, name: 'CBC-MAC Block 2', value: randomHex(16), type: 'intermediate' },
            { step: 7, name: 'Final MAC', value: randomHex(16), type: 'mac' }
        ],
        'pin-block': [
            { step: 1, name: 'Clear PIN', value: '****', type: 'pin' },
            { step: 2, name: 'PAN', value: data, type: 'message' },
            { step: 3, name: 'Format', value: 'ISO 9564-1 Format 0', type: 'format' },
            { step: 4, name: 'PIN Field', value: '04****FFFFFFFFFF', type: 'intermediate' },
            { step: 5, name: 'PAN Block', value: '0000' + data.substring(3, 15), type: 'intermediate' },
            { step: 6, name: 'XOR Result', value: randomHex(16), type: 'intermediate' },
            { step: 7, name: 'Encrypted PIN Block', value: randomHex(16), type: 'pinblock' }
        ],
        dukpt: [
            { step: 1, name: 'BDK', value: 'Base Derivation Key ****', type: 'key' },
            { step: 2, name: 'KSN', value: randomHex(20), type: 'message' },
            { step: 3, name: 'IPEK Derivation', value: 'Encrypt BDK with KSN[0:8]', type: 'intermediate' },
            { step: 4, name: 'IPEK', value: randomHex(32), type: 'intermediate' },
            { step: 5, name: 'Counter', value: '00001', type: 'intermediate' },
            { step: 6, name: 'Session Key', value: randomHex(32), type: 'key' },
            { step: 7, name: 'Derived Key', value: randomHex(32), type: 'key' }
        ]
    };

    return {
        operation,
        algorithm: operation === 'encrypt' ? 'AES-256-CBC'
            : operation === 'mac' ? 'ISO-9797-1-ALG3'
                : operation === 'pin-block' ? 'ISO-9564-1-FORMAT0'
                    : 'ANSI-X9.24-DUKPT',
        steps: baseSteps[operation] || baseSteps['mac'],
        duration: Math.floor(Math.random() * 50) + 10,
        success: true
    };
}
