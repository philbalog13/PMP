import { Shield, Key, Activity, Cpu } from 'lucide-react';

export default function Home() {
  const stats = [
    { label: 'System Status', value: 'ONLINE', color: 'green', icon: Cpu, sub: 'Port: 8011' },
    { label: 'Keys Loaded', value: '3', color: 'blue', icon: Key, sub: 'LMK, ZPK, CVK' },
    { label: 'Operations', value: '0', color: 'purple', icon: Activity, sub: 'Since Startup' },
  ];

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-green-500/30">
          <Shield size={32} className="text-white" />
        </div>
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent font-heading">
            HSM Dashboard
          </h1>
          <p className="text-slate-400 mt-1">Hardware Security Module Simulator - Educational</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="glass-card rounded-2xl p-6 group"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-400 mb-2">{stat.label}</p>
                <p className={`text-3xl font-bold ${stat.color === 'green' ? 'text-green-400' :
                    stat.color === 'blue' ? 'text-blue-400' : 'text-purple-400'
                  }`}>
                  {stat.value}
                </p>
                <p className="text-xs text-slate-500 mt-2">{stat.sub}</p>
              </div>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${stat.color === 'green' ? 'bg-green-500/20 text-green-400' :
                  stat.color === 'blue' ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'
                }`}>
                <stat.icon size={24} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="glass-card rounded-2xl p-8">
        <h2 className="text-xl font-bold text-white mb-6">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {['Generate Key', 'Encrypt PIN', 'Verify MAC', 'Rotate Keys'].map((action) => (
            <button
              key={action}
              className="bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-green-500/50 text-white py-4 px-6 rounded-xl font-medium transition-all hover:shadow-lg hover:shadow-green-500/10"
            >
              {action}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
