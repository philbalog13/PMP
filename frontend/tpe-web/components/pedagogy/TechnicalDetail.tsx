'use client';

import { useTerminalStore } from '@/lib/store';
import { X, Copy } from 'lucide-react';
import { useState } from 'react';

export default function TechnicalDetail() {
    const { showTechnicalDetails, toggleTechnicalDetails, debugData } = useTerminalStore();
    const [activeTab, setActiveTab] = useState<'iso8583' | 'crypto' | 'logs'>('iso8583');

    if (!showTechnicalDetails) return null;

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
                {/* Header */}
                <div className="bg-slate-800 text-white p-4 flex items-center justify-between">
                    <h2 className="text-xl font-bold">Détails Techniques</h2>
                    <button
                        onClick={toggleTechnicalDetails}
                        className="p-2 hover:bg-slate-700 rounded transition"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="border-b border-slate-200">
                    <div className="flex">
                        {['iso8583', 'crypto', 'logs'].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab as typeof activeTab)}
                                className={`px-6 py-3 font-semibold transition ${activeTab === tab
                                    ? 'border-b-2 border-blue-500 text-blue-600'
                                    : 'text-slate-600 hover:text-slate-800'
                                    }`}
                            >
                                {tab === 'iso8583' && 'ISO 8583'}
                                {tab === 'crypto' && 'Crypto'}
                                {tab === 'logs' && 'Logs Serveurs'}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto max-h-[calc(80vh-140px)]">
                    {/* ISO 8583 Tab */}
                    {activeTab === 'iso8583' && (
                        <div className="space-y-4">
                            <div className="bg-slate-50 p-4 rounded">
                                <h3 className="font-bold text-slate-800 mb-3">Message ISO 8583</h3>
                                {debugData?.iso8583Fields && debugData.iso8583Fields.length > 0 ? (
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b">
                                                <th className="text-left py-2">Champ</th>
                                                <th className="text-left py-2">Nom</th>
                                                <th className="text-left py-2">Valeur</th>
                                                <th className="text-left py-2">Format</th>
                                            </tr>
                                        </thead>
                                        <tbody className="font-mono">
                                            {debugData.iso8583Fields.map((field: { field: number; name: string; value: string; format: string }) => (
                                                <tr key={field.field} className="border-b">
                                                    <td className="py-2">{field.field}</td>
                                                    <td className="py-2">{field.name}</td>
                                                    <td className="py-2">{field.value}</td>
                                                    <td className="py-2">{field.format}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                ) : (
                                    <p className="text-slate-500">Données ISO 8583 non disponibles</p>
                                )}
                            </div>

                            <div className="bg-blue-50 p-4 rounded">
                                <h4 className="font-semibold text-blue-800 mb-2">Information</h4>
                                <p className="text-sm text-blue-700">
                                    ISO 8583 est la norme internationale pour les messages de transaction par carte bancaire.
                                    Chaque champ contient des informations spécifiques (montant, PAN, code réponse, etc.).
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Crypto Tab */}
                    {activeTab === 'crypto' && (
                        <div className="space-y-4">
                            <div className="bg-slate-50 p-4 rounded">
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="font-bold text-slate-800">PIN Block (Simulé)</h3>
                                    <button
                                        onClick={() => copyToClipboard('A1B2C3D4E5F67890')}
                                        className="text-xs px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                                    >
                                        <Copy className="w-4 h-4 inline mr-1" />
                                        Copier
                                    </button>
                                </div>
                                <pre className="bg-slate-800 text-green-400 p-4 rounded font-mono text-sm overflow-x-auto">
                                    A1B2C3D4E5F67890
                                </pre>
                                <p className="text-xs text-slate-600 mt-2">
                                    Format ISO 9564-1 (éducatif uniquement)
                                </p>
                            </div>

                            <div className="bg-slate-50 p-4 rounded">
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="font-bold text-slate-800">MAC / Signature</h3>
                                    <button
                                        onClick={() => copyToClipboard('3FA85F6457894ABC')}
                                        className="text-xs px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                                    >
                                        <Copy className="w-4 h-4 inline mr-1" />
                                        Copier
                                    </button>
                                </div>
                                <pre className="bg-slate-800 text-green-400 p-4 rounded font-mono text-sm overflow-x-auto">
                                    3FA85F6457894ABC
                                </pre>
                                <p className="text-xs text-slate-600 mt-2">
                                    Message Authentication Code pour vérifier l&apos;intégrité
                                </p>
                            </div>

                            <div className="bg-yellow-50 p-4 rounded">
                                <h4 className="font-semibold text-yellow-800 mb-2">⚠️ Attention Pédagogique</h4>
                                <p className="text-sm text-yellow-700">
                                    Ces données cryptographiques sont <strong>simulées à des fins éducatives</strong>.
                                    En production, utilisez des HSM certifiés et des algorithmes validés (3DES, AES).
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Logs Tab */}
                    {activeTab === 'logs' && (
                        <div className="space-y-4">
                            <div className="bg-slate-900 text-green-400 p-4 rounded font-mono text-sm">
                                <div className="space-y-2">
                                    <div>[11:42:30] → POST /api/v1/process (SIM-NETWORK-SWITCH)</div>
                                    <div>[11:42:31] ↳ ROUTING: PAN 4111... → ISSUER_ABC</div>
                                    <div>[11:42:32] → POST /api/v1/authorize (SIM-AUTH-ENGINE)</div>
                                    <div>[11:42:33] ↳ RULE_ENGINE: Evaluating {debugData?.response.matchedRules.length || 0} rules</div>
                                    <div>[11:42:33] ↳ DECISION: {debugData?.response.responseCode} - {debugData?.response.responseMessage}</div>
                                    <div>[11:42:34] ← Response: Status 200 OK</div>
                                    <div className="text-green-500">[11:42:34] ✓ Transaction completed in {debugData?.response.processingTime}ms</div>
                                </div>
                            </div>

                            <div className="bg-slate-50 p-4 rounded">
                                <h4 className="font-semibold text-slate-800 mb-3">Architecture</h4>
                                <div className="flex items-center justify-center gap-4 text-sm">
                                    <div className="bg-blue-100 p-3 rounded">TPE</div>
                                    <span>→</span>
                                    <div className="bg-purple-100 p-3 rounded">Network Switch</div>
                                    <span>→</span>
                                    <div className="bg-green-100 p-3 rounded">Auth Engine</div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
