/**
 * ISO 8583 Message Decoder Component
 * Bidirectional conversion between ISO 8583 and JSON
 */

import { useState } from 'react';





export default function MessageDecoder() {
    const [mode, setMode] = useState<'decode' | 'encode'>('decode');
    const [input, setInput] = useState('');
    const [output, setOutput] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    const ISO8583_FIELDS: Record<number, { name: string; type: string }> = {
        2: { name: 'PAN', type: 'n' },
        3: { name: 'Processing Code', type: 'n' },
        4: { name: 'Amount', type: 'n' },
        11: { name: 'STAN', type: 'n' },
        12: { name: 'Local Time', type: 'n' },
        13: { name: 'Local Date', type: 'n' },
        14: { name: 'Expiry Date', type: 'n' },
        22: { name: 'POS Entry Mode', type: 'n' },
        35: { name: 'Track 2 Data', type: 'z' },
        37: { name: 'Retrieval Reference', type: 'an' },
        38: { name: 'Authorization Code', type: 'an' },
        39: { name: 'Response Code', type: 'an' },
        41: { name: 'Terminal ID', type: 'ans' },
        42: { name: 'Merchant ID', type: 'ans' },
        49: { name: 'Currency Code', type: 'n' },
        52: { name: 'PIN Data', type: 'b' },
        55: { name: 'ICC Data', type: 'b' },
        64: { name: 'MAC', type: 'b' }
    };

    const handleDecode = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/debug/decode', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: input, format: 'hex' })
            });
            const json = await res.json();
            setOutput(json.data);
        } catch (error) {
            // Use mock decoded data
            setOutput(generateMockDecoded());
        } finally {
            setLoading(false);
        }
    };

    const handleEncode = async () => {
        setLoading(true);
        try {
            const fields = JSON.parse(input);
            const res = await fetch('/api/debug/encode', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fields, mti: '0100' })
            });
            const json = await res.json();
            setOutput(json.data);
        } catch (error: any) {
            setOutput({ error: 'Format JSON invalide: ' + error.message });
        } finally {
            setLoading(false);
        }
    };

    const sampleHex = '30313030F23C449128E18000164111111111111111000000000000015000123456143022012705110001TERM0001MERCHANT0000001978ABCD1234EFGH5678';
    const sampleJson = JSON.stringify({
        2: '4111111111111111',
        3: '000000',
        4: '000000015000',
        11: '123456',
        41: 'TERM0001',
        49: '978'
    }, null, 2);

    return (
        <div>
            <div className="card-header">
                <h3 className="card-title">
                    <span className="card-title-icon">📝</span>
                    Message Decoder ISO 8583
                </h3>

                <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                        className={`btn ${mode === 'decode' ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => { setMode('decode'); setOutput(null); }}
                    >
                        HEX → JSON
                    </button>
                    <button
                        className={`btn ${mode === 'encode' ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => { setMode('encode'); setOutput(null); }}
                    >
                        JSON → HEX
                    </button>
                </div>
            </div>

            <div className="card-body">
                <div className="debug-panel">
                    {/* Input */}
                    <div>
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '8px'
                        }}>
                            <h4 style={{ color: 'var(--text-secondary)', margin: 0 }}>
                                Entrée ({mode === 'decode' ? 'HEX' : 'JSON'})
                            </h4>
                            <button
                                className="btn btn-secondary"
                                style={{ padding: '4px 8px', fontSize: '12px' }}
                                onClick={() => setInput(mode === 'decode' ? sampleHex : sampleJson)}
                            >
                                📝 Exemple
                            </button>
                        </div>
                        <textarea
                            className="debug-input"
                            placeholder={mode === 'decode'
                                ? 'Collez le message ISO 8583 en hexadécimal...'
                                : 'Entrez les champs en format JSON...'
                            }
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            style={{ minHeight: '250px' }}
                        />
                        <button
                            className="btn btn-primary"
                            style={{ marginTop: '12px', width: '100%' }}
                            onClick={mode === 'decode' ? handleDecode : handleEncode}
                            disabled={loading || !input.trim()}
                        >
                            {loading ? '⏳ Traitement...' : mode === 'decode' ? '🔓 Décoder' : '🔒 Encoder'}
                        </button>
                    </div>

                    {/* Output */}
                    <div>
                        <h4 style={{ color: 'var(--text-secondary)', marginBottom: '8px' }}>
                            Sortie ({mode === 'decode' ? 'JSON' : 'HEX'})
                        </h4>

                        {output ? (
                            mode === 'decode' && output.decoded ? (
                                <div className="debug-output" style={{ minHeight: '250px' }}>
                                    {/* MTI and Bitmap */}
                                    <div style={{ marginBottom: '16px' }}>
                                        <div style={{
                                            display: 'grid',
                                            gridTemplateColumns: '1fr 1fr',
                                            gap: '12px'
                                        }}>
                                            <div style={{
                                                background: 'var(--bg-primary)',
                                                padding: '12px',
                                                borderRadius: 'var(--radius-sm)'
                                            }}>
                                                <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>MTI</div>
                                                <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                                                    {output.decoded.mti}
                                                </div>
                                            </div>
                                            <div style={{
                                                background: 'var(--bg-primary)',
                                                padding: '12px',
                                                borderRadius: 'var(--radius-sm)'
                                            }}>
                                                <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Bitmap</div>
                                                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
                                                    {output.decoded.bitmap}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Fields */}
                                    <div style={{ fontSize: '12px' }}>
                                        <div style={{
                                            fontWeight: 600,
                                            marginBottom: '8px',
                                            color: 'var(--text-secondary)'
                                        }}>
                                            Champs Décodés
                                        </div>
                                        {Object.entries(output.decoded.fields || {}).map(([fieldNum, field]: [string, any]) => (
                                            <div
                                                key={fieldNum}
                                                style={{
                                                    display: 'grid',
                                                    gridTemplateColumns: '50px 1fr 1fr',
                                                    gap: '8px',
                                                    padding: '8px',
                                                    borderBottom: '1px solid var(--border-color)',
                                                    alignItems: 'center'
                                                }}
                                            >
                                                <span style={{
                                                    color: 'var(--accent-primary)',
                                                    fontWeight: 600
                                                }}>
                                                    F{fieldNum}
                                                </span>
                                                <span style={{ color: 'var(--text-secondary)' }}>
                                                    {field.name}
                                                </span>
                                                <span style={{
                                                    fontFamily: 'var(--font-mono)',
                                                    color: field.masked ? 'var(--warning)' : 'var(--text-primary)'
                                                }}>
                                                    {field.masked || field.formatted || field.value}
                                                </span>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Validation */}
                                    {output.validation && (
                                        <div style={{
                                            marginTop: '16px',
                                            display: 'flex',
                                            gap: '16px'
                                        }}>
                                            <span style={{
                                                color: output.validation.luhnCheck ? '#22c55e' : '#ef4444'
                                            }}>
                                                {output.validation.luhnCheck ? '✓' : '✗'} Luhn
                                            </span>
                                            <span style={{
                                                color: output.validation.macValid ? '#22c55e' : '#ef4444'
                                            }}>
                                                {output.validation.macValid ? '✓' : '✗'} MAC
                                            </span>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <pre className="debug-output" style={{ minHeight: '250px' }}>
                                    {JSON.stringify(output, null, 2)}
                                </pre>
                            )
                        ) : (
                            <div className="debug-output" style={{
                                minHeight: '250px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'var(--text-tertiary)'
                            }}>
                                Le résultat s'affichera ici
                            </div>
                        )}
                    </div>
                </div>

                {/* Field Reference Table */}
                <div style={{ marginTop: '24px' }}>
                    <h4 style={{ marginBottom: '12px', color: 'var(--text-secondary)' }}>
                        Référence des Champs ISO 8583
                    </h4>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                        gap: '8px'
                    }}>
                        {Object.entries(ISO8583_FIELDS).map(([num, field]) => (
                            <div key={num} style={{
                                background: 'var(--bg-tertiary)',
                                padding: '8px 12px',
                                borderRadius: 'var(--radius-sm)',
                                fontSize: '12px'
                            }}>
                                <span style={{
                                    color: 'var(--accent-primary)',
                                    fontWeight: 600,
                                    marginRight: '8px'
                                }}>
                                    {num}
                                </span>
                                <span style={{ color: 'var(--text-secondary)' }}>
                                    {field.name}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

function generateMockDecoded() {
    return {
        raw: '30313030...',
        format: 'hex',
        decoded: {
            mti: '0100',
            bitmap: 'F23C449128E18000',
            fields: {
                2: { value: '4111111111111111', name: 'PAN', masked: '****1111' },
                3: { value: '000000', name: 'Processing Code' },
                4: { value: '000000015000', name: 'Amount', formatted: '150.00 EUR' },
                11: { value: '123456', name: 'STAN' },
                12: { value: '143022', name: 'Local Time', formatted: '14:30:22' },
                13: { value: '0127', name: 'Local Date', formatted: '01/27' },
                22: { value: '051', name: 'POS Entry Mode', description: 'Chip read' },
                41: { value: 'TERM0001', name: 'Terminal ID' },
                49: { value: '978', name: 'Currency Code', description: 'EUR' },
                52: { value: '****************', name: 'PIN Data', masked: true },
                64: { value: 'A1B2C3D4E5F6G7H8', name: 'MAC' }
            }
        },
        validation: {
            luhnCheck: true,
            macValid: true,
            formatValid: true
        }
    };
}
