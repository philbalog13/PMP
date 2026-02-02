'use client';

import React, { useState } from 'react';
import { GraduationCap, FlaskConical, BookOpen, Rocket, ArrowRight, Github } from 'lucide-react';

export default function StudentAuthPage() {
    const [workshop, setWorkshop] = useState('');

    const workshops = [
        { id: 'auth', name: 'Atelier Authentification', icon: <Github size={16} /> },
        { id: 'crypto', name: 'Labo Cryptographie', icon: <FlaskConical size={16} /> },
        { id: 'iso8583', name: 'Protocole ISO-8583', icon: <BookOpen size={16} /> },
    ];

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="w-full max-w-4xl flex flex-col md:flex-row bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
                {/* Visual Side */}
                <div className="w-full md:w-1/2 bg-linear-to-br from-orange-500 to-amber-600 p-12 text-white flex flex-col justify-between">
                    <div className="space-y-4">
                        <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                            <GraduationCap size={28} />
                        </div>
                        <h1 className="text-4xl font-black leading-tight">Prêt pour ton prochain labo ?</h1>
                        <p className="text-orange-100 text-sm">Connecte-toi à la plateforme PMP pour commencer tes ateliers de monétique.</p>
                    </div>

                    <div className="space-y-6">
                        <div className="flex items-center gap-4 bg-white/10 p-4 rounded-2xl backdrop-blur-sm border border-white/10">
                            <Rocket className="text-orange-200" />
                            <div className="text-xs">
                                <span className="font-bold block uppercase mb-1">Objectif du jour</span>
                                Comprendre le cycle de vie d'une transaction bancaire.
                            </div>
                        </div>
                        <div className="text-[10px] text-orange-200/60 uppercase tracking-widest text-center">
                            Plateforme Monétique Pédagogique v3.0
                        </div>
                    </div>
                </div>

                {/* Form Side */}
                <div className="w-full md:w-1/2 p-12 bg-white">
                    <div className="space-y-8">
                        <div>
                            <h2 className="text-2xl font-bold text-slate-900">Espace Étudiant</h2>
                            <p className="text-slate-500 text-sm">Saisis tes identifiants de labo.</p>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-400 uppercase">Identifiant Pédagogique</label>
                                <input
                                    type="text"
                                    placeholder="Ex: etud-2026-X"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 focus:outline-hidden transition-all"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-400 uppercase">Choisir l'Atelier</label>
                                <div className="grid grid-cols-1 gap-2">
                                    {workshops.map((ws) => (
                                        <button
                                            key={ws.id}
                                            onClick={() => setWorkshop(ws.id)}
                                            className={`flex items-center gap-3 p-3 rounded-xl border text-sm transition-all text-left ${workshop === ws.id
                                                    ? 'bg-orange-50 border-orange-500 text-orange-700 font-bold'
                                                    : 'bg-white border-slate-100 text-slate-500 hover:border-slate-300'
                                                }`}
                                        >
                                            <span className={workshop === ws.id ? 'text-orange-500' : 'text-slate-300'}>
                                                {ws.icon}
                                            </span>
                                            {ws.name}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <button className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2 group">
                                Commencer l'atelier
                                <ArrowRight size={18} className="translate-x-0 group-hover:translate-x-1 transition-transform" />
                            </button>
                        </div>

                        <div className="text-center">
                            <a href="#" className="text-xs text-slate-400 hover:text-slate-600 transition-colors flex items-center justify-center gap-1">
                                <BookOpen size={12} /> Besoin d'aide sur les ateliers ?
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
