'use client';
export default function LogsPage() {
    return (
        <div className="bg-black text-green-400 p-6 rounded-lg font-mono h-96 overflow-y-auto">
            <p>[12:00:01] HSM Started. LMK Loaded.</p>
            <p>[12:00:02] Listener bound to port 3004.</p>
            <p className="opacity-50">... Waiting for events ...</p>
        </div>
    );
}
