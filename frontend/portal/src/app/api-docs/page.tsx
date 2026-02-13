'use client';

import { Book, Code, Box, Layers, Globe, Shield, type LucideIcon } from 'lucide-react';

export default function ApiDocsPage() {
    return (
        <div className="min-h-screen bg-slate-950 p-8 text-white">
            <div className="max-w-6xl mx-auto space-y-12">

                {/* Header */}
                <div className="flex items-center gap-6 border-b border-white/10 pb-8">
                    <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-teal-500/20">
                        <Book size={40} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-4xl font-bold text-teal-400">API Documentation</h1>
                        <p className="text-xl text-slate-400 mt-2">Comprehensive reference for FINED-SIM microservices</p>
                    </div>
                </div>

                {/* Services Grid */}
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <ServiceCard
                        title="TPE Service"
                        port="8013"
                        icon={Box}
                        desc="Terminal processing, EMV tags, ISO8583 messaging"
                        endpoints={[
                            { method: 'POST', path: '/transaction/auth', desc: 'Initiate authorization' },
                            { method: 'GET', path: '/config/terminal', desc: 'Get terminal params' },
                            { method: 'POST', path: '/emv/verify', desc: 'Verify ARQC cryptogram' }
                        ]}
                    />

                    <ServiceCard
                        title="HSM Service"
                        port="8011"
                        icon={Shield}
                        desc="Cryptographic operations, key management, PIN translation"
                        endpoints={[
                            { method: 'POST', path: '/calc/mac', desc: 'Generate message MAC' },
                            { method: 'POST', path: '/pin/translate', desc: 'Translate PIN block' },
                            { method: 'GET', path: '/keys/status', desc: 'Check key check values' }
                        ]}
                    />

                    <ServiceCard
                        title="Card Service"
                        port="8014"
                        icon={Layers}
                        desc="Card issuance, wallet management, 3DS authentication"
                        endpoints={[
                            { method: 'POST', path: '/cards/issue', desc: 'Issue virtual card' },
                            { method: 'POST', path: '/3ds/challenge', desc: 'Verify OTP' },
                            { method: 'GET', path: '/wallet/balance', desc: 'Get current balance' }
                        ]}
                    />

                    <ServiceCard
                        title="Monitoring API"
                        port="8015"
                        icon={Globe}
                        desc="Real-time metrics, fraud detection, logs"
                        endpoints={[
                            { method: 'GET', path: '/metrics/live', desc: 'Stream metrics' },
                            { method: 'POST', path: '/fraud/score', desc: 'Calculate risk score' },
                            { method: 'GET', path: '/logs/tail', desc: 'Tail security logs' }
                        ]}
                    />
                </div>

                {/* Auth Info */}
                <div className="bg-slate-900/50 p-8 rounded-3xl border border-white/5">
                    <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
                        <Code size={24} className="text-teal-400" /> Authentication
                    </h2>
                    <p className="text-slate-400 mb-6">All API requests must be authenticated using the API Key header.</p>

                    <div className="bg-slate-900 p-4 rounded-xl border border-white/10 font-mono text-sm text-slate-300">
                        Authorization: x-api-key &lt;your_api_key&gt;
                    </div>
                </div>

            </div>
        </div>
    );
}

type ApiEndpoint = {
    method: string;
    path: string;
    desc: string;
};

function ServiceCard({ title, port, icon: Icon, desc, endpoints }: { title: string; port: string; icon: LucideIcon; desc: string; endpoints: ApiEndpoint[] }) {
    return (
        <div className="bg-slate-900/30 border border-white/5 rounded-2xl p-6 hover:border-teal-500/30 transition shadow-lg hover:shadow-teal-500/5 group">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-slate-800 rounded-xl text-teal-400 group-hover:bg-teal-500/20 group-hover:text-teal-300 transition">
                        <Icon size={24} />
                    </div>
                    <div>
                        <h3 className="font-bold text-lg text-white">{title}</h3>
                        <span className="text-xs font-mono bg-slate-800 px-2 py-0.5 rounded text-slate-400">:{port}</span>
                    </div>
                </div>
            </div>

            <p className="text-slate-400 text-sm mb-6 h-10">{desc}</p>

            <div className="space-y-3">
                {endpoints.map((ep, idx) => (
                    <div key={idx} className="flex gap-3 text-sm p-2 rounded hover:bg-white/5 transition">
                        <span className={`font-mono font-bold w-12 text-right ${ep.method === 'GET' ? 'text-blue-400' :
                                ep.method === 'POST' ? 'text-green-400' : 'text-amber-400'
                            }`}>{ep.method}</span>
                        <div className="overflow-hidden">
                            <p className="font-mono text-slate-300 truncate">{ep.path}</p>
                            <p className="text-slate-500 text-xs truncate">{ep.desc}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
