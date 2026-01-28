'use client';
import { useState, useEffect } from 'react';

interface Key {
    label: string;
    type: string;
    scheme: string;
    checkValue: string;
}

export default function KeysPage() {
    const [keys, setKeys] = useState<Key[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('http://localhost:3004/hsm/keys')
            .then(res => res.json())
            .then(data => {
                setKeys(data.keys);
                setLoading(false);
            })
            .catch(err => console.error(err));
    }, []);

    if (loading) return <div className="p-6">Loading keys...</div>;

    return (
        <div className="bg-white p-6 rounded-lg shadow">
            <h1 className="text-2xl font-bold mb-4">Key Management</h1>
            <div className="overflow-x-auto">
                <table className="min-w-full table-auto">
                    <thead>
                        <tr className="bg-gray-200">
                            <th className="px-4 py-2 text-left">Label</th>
                            <th className="px-4 py-2 text-left">Type</th>
                            <th className="px-4 py-2 text-left">Scheme</th>
                            <th className="px-4 py-2 text-left">KCV</th>
                            <th className="px-4 py-2 text-left">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {keys.map((k) => (
                            <tr key={k.label} className="border-b">
                                <td className="px-4 py-2 font-mono">{k.label}</td>
                                <td className="px-4 py-2">{k.type}</td>
                                <td className="px-4 py-2">{k.scheme === 'T' ? 'Triple' : 'Single'}</td>
                                <td className="px-4 py-2 font-mono text-blue-600">{k.checkValue}</td>
                                <td className="px-4 py-2">
                                    <button className="text-red-500 hover:underline">Delete</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
