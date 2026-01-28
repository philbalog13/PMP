'use client';

import { useTerminalStore } from '@/lib/store';
import { Code2 } from 'lucide-react';

export default function DebugView() {
    const { debugMode, debugData } = useTerminalStore();

    if (!debugMode || !debugData) return null;

    const copyToClipboard = (data: unknown) => {
        navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    };

    return (
        <div className="bg-slate-900 rounded-lg shadow-xl p-6 text-green-400 font-mono text-sm">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Code2 className="w-5 h-5" />
                    <h3 className="text-lg font-bold">Mode Debug</h3>
                </div>
            </div>

            <div className="space-y-4 max-h-[600px] overflow-auto">
                {/* Request */}
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <h4 className="text-green-300 font-semibold">REQUEST ➜</h4>
                        <button
                            onClick={() => copyToClipboard(debugData.request)}
                            className="text-xs px-2 py-1 bg-green-700 hover:bg-green-600 rounded"
                        >
                            Copier
                        </button>
                    </div>
                    <pre className="bg-slate-800 p-4 rounded overflow-x-auto text-xs">
                        {JSON.stringify(debugData.request, null, 2)}
                    </pre>
                </div>

                {/* Response */}
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <h4 className="text-green-300 font-semibold">RESPONSE ⬅</h4>
                        <button
                            onClick={() => copyToClipboard(debugData.response)}
                            className="text-xs px-2 py-1 bg-green-700 hover:bg-green-600 rounded"
                        >
                            Copier
                        </button>
                    </div>
                    <pre className="bg-slate-800 p-4 rounded overflow-x-auto text-xs">
                        {JSON.stringify(debugData.response, null, 2)}
                    </pre>
                </div>

                {/* Logs */}
                {debugData.logs.length > 0 && (
                    <div>
                        <h4 className="text-green-300 font-semibold mb-2">LOGS</h4>
                        <div className="bg-slate-800 p-4 rounded space-y-1 text-xs">
                            {debugData.logs.map((log, idx) => (
                                <div key={idx} className="text-green-400/70">
                                    [{new Date().toLocaleTimeString()}] {log}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
