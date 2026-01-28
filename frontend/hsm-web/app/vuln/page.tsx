'use client';
import { useState, useEffect } from 'react';

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

    useEffect(() => {
        fetch('http://localhost:3004/hsm/config')
            .then(res => res.json())
            .then(data => setConfig(data));
    }, []);

    const toggle = (key: keyof Config) => {
        const newVal = !config[key];
        const newConfig = { ...config, [key]: newVal };
        setConfig(newConfig);

        fetch('http://localhost:3004/hsm/config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newConfig)
        });
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow border-2 border-red-100">
            <h1 className="text-2xl font-bold mb-6 text-red-600">Vulnerability Laboratory (Educational)</h1>

            <div className="grid gap-6">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded">
                    <div>
                        <h3 className="font-bold">Weak Keys</h3>
                        <p className="text-sm text-gray-500">Allow 000..00 keys without error</p>
                    </div>
                    <button
                        onClick={() => toggle('weakKeysEnabled')}
                        className={`px-4 py-2 rounded font-bold ${config.weakKeysEnabled ? 'bg-red-500 text-white' : 'bg-gray-300'}`}
                    >
                        {config.weakKeysEnabled ? 'ENABLED' : 'DISABLED'}
                    </button>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded">
                    <div>
                        <h3 className="font-bold">Key Leak in Logs</h3>
                        <p className="text-sm text-gray-500">Log keys in clear text (Audit failure)</p>
                    </div>
                    <button
                        onClick={() => toggle('keyLeakInLogs')}
                        className={`px-4 py-2 rounded font-bold ${config.keyLeakInLogs ? 'bg-red-500 text-white' : 'bg-gray-300'}`}
                    >
                        {config.keyLeakInLogs ? 'ENABLED' : 'DISABLED'}
                    </button>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded">
                    <div>
                        <h3 className="font-bold">Replay Attacks</h3>
                        <p className="text-sm text-gray-500">Disable nonce/timestamp checks</p>
                    </div>
                    <button
                        onClick={() => toggle('allowReplay')}
                        className={`px-4 py-2 rounded font-bold ${config.allowReplay ? 'bg-red-500 text-white' : 'bg-gray-300'}`}
                    >
                        {config.allowReplay ? 'ENABLED' : 'DISABLED'}
                    </button>
                </div>
            </div>
        </div>
    );
}
