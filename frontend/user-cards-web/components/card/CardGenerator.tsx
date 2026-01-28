'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { CardType, CardScheme, generateCard } from '@/lib/card-engine/generator';
import { useUserStore } from '@/lib/store';
import { Loader2, Plus, Sparkles } from 'lucide-react';

const schema = z.object({
    scheme: z.enum(['VISA', 'MASTERCARD']),
    type: z.enum(['DEBIT', 'CREDIT', 'PREPAID', 'CORPORATE', 'GOLD']),
    holderName: z.string().min(2, "Nom trop court").max(30, "Nom trop long"),
});

type FormData = z.infer<typeof schema>;

export default function CardGenerator() {
    const { addCard } = useUserStore();
    const [isGenerating, setIsGenerating] = useState(false);

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<FormData>({
        resolver: zodResolver(schema),
        defaultValues: {
            scheme: 'VISA',
            type: 'DEBIT',
            holderName: '',
        },
    });

    const onSubmit = async (data: FormData) => {
        setIsGenerating(true);
        // Simulate network delay for effect
        await new Promise((resolve) => setTimeout(resolve, 800));

        const newCard = generateCard(data);
        addCard(newCard);

        setIsGenerating(false);
        reset();
    };

    return (
        <div className="bg-white p-6 rounded-xl shadow-lg border border-slate-100">
            <div className="flex items-center gap-2 mb-6">
                <Sparkles className="text-blue-600" />
                <h2 className="text-xl font-bold text-slate-800">Générer une Carte</h2>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Réseau</label>
                    <div className="grid grid-cols-2 gap-3">
                        <label className="cursor-pointer">
                            <input type="radio" {...register('scheme')} value="VISA" className="peer sr-only" />
                            <div className="peer-checked:bg-blue-50 peer-checked:border-blue-500 peer-checked:text-blue-700 border rounded-lg p-3 text-center transition hover:bg-slate-50">
                                VISA
                            </div>
                        </label>
                        <label className="cursor-pointer">
                            <input type="radio" {...register('scheme')} value="MASTERCARD" className="peer sr-only" />
                            <div className="peer-checked:bg-orange-50 peer-checked:border-orange-500 peer-checked:text-orange-700 border rounded-lg p-3 text-center transition hover:bg-slate-50">
                                Mastercard
                            </div>
                        </label>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Type de Carte</label>
                    <select {...register('type')} className="w-full p-2 border rounded-lg bg-white">
                        <option value="DEBIT">DÉBIT (Classique)</option>
                        <option value="CREDIT">CRÉDIT</option>
                        <option value="PREPAID">PRÉPAYÉE</option>
                        <option value="CORPORATE">CORPORATE (Business)</option>
                        <option value="GOLD">GOLD (Premium)</option>
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Titulaire</label>
                    <input
                        {...register('holderName')}
                        placeholder="Nom Prénom"
                        className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                    {errors.holderName && <p className="text-red-500 text-xs mt-1">{errors.holderName.message}</p>}
                </div>

                <button
                    type="submit"
                    disabled={isGenerating}
                    className="w-full bg-slate-900 text-white py-3 rounded-lg font-medium hover:bg-slate-800 transition flex items-center justify-center gap-2"
                >
                    {isGenerating ? (
                        <><Loader2 className="animate-spin w-4 h-4" /> Création...</>
                    ) : (
                        <><Plus className="w-4 h-4" /> Créer Carte Virtuelle</>
                    )}
                </button>
            </form>
        </div>
    );
}
