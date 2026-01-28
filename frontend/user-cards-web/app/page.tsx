'use client';

import { useUserStore } from '@/lib/store';
import Card3D from '@/components/card/Card3D';
import CardGenerator from '@/components/card/CardGenerator';
import { Wallet, Bell, AlertTriangle, History } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function Dashboard() {
  const { cards } = useUserStore();
  const [isClient, setIsClient] = useState(false);

  // Hydration fix for persist middleware
  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) return null;

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <header className="max-w-6xl mx-auto flex justify-between items-center mb-10">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Mon Portefeuille</h1>
          <p className="text-slate-500">Gestion des cartes virtuelles pédagogiques</p>
        </div>
        <div className="flex gap-4">
          <button className="p-2 bg-white rounded-full shadow-sm text-slate-600 hover:text-blue-600">
            <Bell size={20} />
          </button>
          <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
            JD
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Cards List */}
        <div className="lg:col-span-2 space-y-8">
          {/* Active Cards */}
          <section>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Wallet className="text-blue-600" />
              Mes Cartes ({cards.length})
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {cards.map(card => (
                <div key={card.id} className="flex flex-col gap-4">
                  <Card3D card={card} showDetails={true} />
                  <div className="flex justify-between items-center px-2">
                    <div className="text-sm text-slate-600">
                      Solde: <span className="font-bold text-slate-900">{card.balance.toFixed(2)} €</span>
                    </div>
                    <div className={`text-xs px-2 py-1 rounded-full ${card.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {card.status}
                    </div>
                  </div>
                </div>
              ))}

              {cards.length === 0 && (
                <div className="col-span-2 py-12 text-center bg-white rounded-xl border border-dashed border-slate-300 text-slate-500">
                  <p>Aucune carte active. Générez votre première carte virtuelle.</p>
                </div>
              )}
            </div>
          </section>

          {/* Security Alerts Demo */}
          <section className="bg-orange-50 rounded-xl p-6 border border-orange-100">
            <h3 className="text-lg font-bold text-orange-800 mb-2 flex items-center gap-2">
              <AlertTriangle size={20} />
              Alertes Sécurité
            </h3>
            <ul className="space-y-2 text-orange-700 text-sm">
              <li>• Tentative de transaction suspecte détectée (simulation)</li>
              <li>• Plafond de paiement bientôt atteint (85%)</li>
            </ul>
          </section>

          {/* Recent Transactions */}
          <section className="bg-white rounded-xl p-6 shadow-sm">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <History size={20} />
              Dernières Transactions
            </h3>
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex justify-between items-center py-2 border-b border-slate-100 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                      🛍️
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">Commerce Pédagogique</p>
                      <p className="text-xs text-slate-500">28 Jan 2026 • 12:30</p>
                    </div>
                  </div>
                  <span className="font-mono font-bold text-slate-900">-{(Math.random() * 50).toFixed(2)} €</span>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Right Column: Key Actions */}
        <div className="space-y-6">
          <CardGenerator />

          <div className="bg-indigo-900 text-white rounded-xl p-6 shadow-lg relative overflow-hidden">
            <div className="relative z-10">
              <h3 className="font-bold text-lg mb-2">Mode Pédagogique</h3>
              <p className="text-indigo-200 text-sm mb-4">
                Comprenez comment fonctionnent les numéros de carte, le Luhn check et les CVV.
              </p>
              <button className="bg-white text-indigo-900 px-4 py-2 rounded-lg text-sm font-bold hover:bg-indigo-50 transition">
                Voir Documentation
              </button>
            </div>
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-800 rounded-full blur-2xl -mr-10 -mt-10" />
          </div>
        </div>
      </main>
    </div>
  );
}
