import { Battery, Signal, CreditCard, Search, Filter } from 'lucide-react';

const terminals = [
    { id: 'TPE-001', model: 'Move/5000', status: 'online', battery: 85, signal: '4G', merchants: 'Carrefour', lastTx: '2 mins ago', location: 'Paris, FR' },
    { id: 'TPE-002', model: 'Desk/5000', status: 'online', battery: 100, signal: 'Eth', merchants: 'Fnac', lastTx: '5 mins ago', location: 'Lyon, FR' },
    { id: 'TPE-003', model: 'IWL250', status: 'offline', battery: 0, signal: '---', merchants: 'Boulanger', lastTx: '2 days ago', location: 'Marseille, FR' },
    { id: 'TPE-004', model: 'Move/5000', status: 'warning', battery: 15, signal: '2G', merchants: 'Auchan', lastTx: '1 hour ago', location: 'Lille, FR' },
    { id: 'TPE-005', model: 'Android POS', status: 'online', battery: 60, signal: 'WiFi', merchants: 'Zara', lastTx: 'Just now', location: 'Bordeaux, FR' },
];

export default function Terminals() {


    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                        Monitoring TPE
                    </h2>
                    <p className="text-slate-400">État du parc en temps réel</p>
                </div>

                <div className="flex gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Rechercher un TPE..."
                            className="pl-9 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
                        />
                    </div>
                    <button className="flex items-center gap-2 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm hover:bg-slate-700 transition">
                        <Filter className="w-4 h-4" />
                        Filtrer
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700">
                    <div className="text-slate-400 text-xs uppercase font-bold">Total TPE</div>
                    <div className="text-2xl font-bold text-white mt-1">1,245</div>
                </div>
                <div className="p-4 rounded-xl bg-slate-800/50 border border-green-500/30">
                    <div className="text-green-400 text-xs uppercase font-bold">En Ligne</div>
                    <div className="text-2xl font-bold text-green-400 mt-1">1,180</div>
                </div>
                <div className="p-4 rounded-xl bg-slate-800/50 border border-red-500/30">
                    <div className="text-red-400 text-xs uppercase font-bold">Hors Ligne</div>
                    <div className="text-2xl font-bold text-red-400 mt-1">45</div>
                </div>
                <div className="p-4 rounded-xl bg-slate-800/50 border border-yellow-500/30">
                    <div className="text-yellow-400 text-xs uppercase font-bold">Alertes</div>
                    <div className="text-2xl font-bold text-yellow-400 mt-1">20</div>
                </div>
                <div className="p-4 rounded-xl bg-slate-800/50 border border-blue-500/30">
                    <div className="text-blue-400 text-xs uppercase font-bold">Actifs (24h)</div>
                    <div className="text-2xl font-bold text-blue-400 mt-1">98%</div>
                </div>
            </div>

            <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-left text-sm text-slate-400">
                    <thead className="bg-slate-900 uppercase font-medium text-xs">
                        <tr>
                            <th className="px-6 py-4">ID Terminal</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4">Modèle</th>
                            <th className="px-6 py-4">Connectivité</th>
                            <th className="px-6 py-4">Marchand</th>
                            <th className="px-6 py-4">Dernière Tx</th>
                            <th className="px-6 py-4">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                        {terminals.map((tpe) => (
                            <tr key={tpe.id} className="hover:bg-slate-800/30 transition">
                                <td className="px-6 py-4 font-mono font-medium text-white flex items-center gap-2">
                                    <CreditCard className="w-4 h-4 text-slate-500" />
                                    {tpe.id}
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${tpe.status === 'online' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                                        tpe.status === 'offline' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                                            'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                                        }`}>
                                        <span className={`w-1.5 h-1.5 rounded-full ${tpe.status === 'online' ? 'bg-green-400' :
                                            tpe.status === 'offline' ? 'bg-red-400' :
                                                'bg-yellow-400'
                                            }`} />
                                        {tpe.status.toUpperCase()}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-white">{tpe.model}</td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="flex items-center gap-1" title="Battery">
                                            <Battery className={`w-4 h-4 ${tpe.battery < 20 ? 'text-red-400' : 'text-slate-400'}`} />
                                            <span className="text-xs">{tpe.battery}%</span>
                                        </div>
                                        <div className="flex items-center gap-1" title="Signal">
                                            <Signal className="w-4 h-4 text-blue-400" />
                                            <span className="text-xs">{tpe.signal}</span>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-white">{tpe.merchants}</td>
                                <td className="px-6 py-4">{tpe.lastTx}</td>
                                <td className="px-6 py-4">
                                    <button className="text-blue-400 hover:text-blue-300 font-medium">Détails</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
