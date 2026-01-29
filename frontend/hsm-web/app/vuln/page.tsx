'use client';
import { useState, useEffect } from 'react';
import { AlertTriangle, Shield, ShieldOff, Bug, KeyRound, FileWarning } from 'lucide-react';

interface Config {
    allowReplay: boolean;
    weakKeysEnabled: boolean;
    keyLeakInLogs: boolean;
    verboseErrors: boolean;
}

export default function VulnPage() {
    const [config, setConfig] = useState<Config>({
        allowReplay: false,
        weakKeysEnabled: false,
        keyLeakInLogs: false,
        verboseErrors: false
    });

    const vulnerabilities = [
        {
            id: 'weakKeysEnabled',
            icon: KeyRound,
            title: 'Weak Keys',
            description: 'Allow 000..00 keys without error',
            severity: 'critical'
        },
        {
            id: 'keyLeakInLogs',
            icon: FileWarning,
            title: 'Key Leak in Logs',
            description: 'Log keys in clear text (Audit failure)',
            severity: 'critical'
        },
        {
            id: 'allowReplay',
            icon: Bug,
            title: 'Replay Attacks',
            description: 'Disable nonce/timestamp checks',
            severity: 'high'
        },
        {
            id: 'verboseErrors',
            icon: AlertTriangle,
            title: 'Verbose Errors',
            description: 'Expose internal error details',
            severity: 'medium'
        }
    ];

    useEffect(() => {
        fetch('http://localhost:8011/hsm/config')
            .then(res => res.json())
            .then(data => setConfig(data))
            .catch(() => { });
    }, []);

    const toggle = (key: keyof Config) => {
        const newVal = !config[key];
        const newConfig = { ...config, [key]: newVal };
        setConfig(newConfig);

        fetch('http://localhost:8011/hsm/config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newConfig)
        }).catch(() => { });
    };

    const enabledCount = Object.values(config).filter(Boolean).length;

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center shadow-lg shadow-red-500/30">
                    <AlertTriangle size={32} className="text-white" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold text-red-400 font-heading">Vulnerability Lab</h1>
                    <p className="text-slate-400">Educational security testing environment</p>
                </div>
            </div>

            {/* Warning Banner */}
            <div className="glass-card rounded-2xl p-6 border-red-500/30 bg-red-950/20">
                <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center flex-shrink-0">
                        {enabledCount > 0 ? <ShieldOff size={24} className="text-red-400" /> : <Shield size={24} className="text-green-400" />}
                    </div>
                    <div>
                        <h3 className="font-bold text-white mb-1">
                            {enabledCount > 0 ? `⚠️ ${enabledCount} Vulnerabilities Active` : '✅ All Protections Enabled'}
                        </h3>
                        <p className="text-sm text-slate-400">
                            These settings intentionally weaken security for educational purposes. Never enable in production.
                        </p>
                    </div>
                </div>
            </div>

            {/* Vulnerabilities Grid */}
            <div className="grid gap-4">
                {vulnerabilities.map((vuln) => {
                    const isEnabled = config[vuln.id as keyof Config];
                    return (
                        <div
                            key={vuln.id}
                            className={`glass-card rounded-2xl p-6 flex items-center justify-between transition-all ${isEnabled ? 'border-red-500/30 bg-red-950/10' : ''
                                }`}
                        >
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isEnabled ? 'bg-red-500/20 text-red-400' : 'bg-slate-800 text-slate-500'
                                    }`}>
                                    <vuln.icon size={24} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-white flex items-center gap-2">
                                        {vuln.title}
                                        <span className={`text-xs px-2 py-0.5 rounded-full uppercase ${vuln.severity === 'critical' ? 'bg-red-500/20 text-red-400' :
                                                vuln.severity === 'high' ? 'bg-orange-500/20 text-orange-400' :
                                                    'bg-yellow-500/20 text-yellow-400'
                                            }`}>
                                            {vuln.severity}
                                        </span>
                                    </h3>
                                    <p className="text-sm text-slate-400">{vuln.description}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => toggle(vuln.id as keyof Config)}
                                className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${isEnabled
                                        ? 'bg-red-600 text-white hover:bg-red-500 shadow-lg shadow-red-500/30'
                                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700 border border-slate-700'
                                    }`}
                            >
                                {isEnabled ? 'ENABLED' : 'DISABLED'}
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
