'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client'; // Vérifie bien ce chemin

export default function DriverPortal() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const supabase = createClient();

  async function handleSubmit(e: any) {
    e.preventDefault();
    setIsSubmitting(true);
    
    const formData = new FormData(e.target);
    const data = {
      revenue: formData.get('revenue'),
      fuel: formData.get('fuel'),
      momo_provider: formData.get('provider'),
      momo_reference: formData.get('reference'),
      momo_status: 'pending',
    };

    const { error } = await supabase.from('daily_records').insert([data]);

    if (error) alert("Erreur: " + error.message);
    else alert("Rapport envoyé avec succès !");
    
    setIsSubmitting(false);
  }

  return (
    <div className="min-h-screen bg-[#0a0a14] p-4 text-white">
      <h1 className="text-2xl font-bold mb-6 text-[#7c63f5]">Rapport Journalier</h1>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="p-4 bg-[#12121e] rounded-2xl border border-[#2a2a40]">
          <label className="block text-xs mb-1 text-gray-400">Recette Brute (CDF)</label>
          <input name="revenue" type="number" required placeholder="Ex: 150000" className="w-full h-14 bg-black rounded-xl px-4 text-xl font-bold text-green-500 outline-none" />
        </div>

        <div className="p-4 bg-[#12121e] rounded-2xl border border-[#2a2a40]">
          <label className="block text-xs mb-2 text-gray-400">Paiement Mobile Money</label>
          <select name="provider" className="w-full h-14 bg-black rounded-xl px-4 mb-4 outline-none">
            <option value="M-Pesa">M-Pesa</option>
            <option value="Airtel Money">Airtel Money</option>
            <option value="Orange Money">Orange Money</option>
            <option value="Cash">Cash (Espèces)</option>
          </select>
          <input name="reference" type="text" placeholder="Référence Transaction" className="w-full h-14 bg-black rounded-xl px-4 text-lg outline-none uppercase" />
        </div>

        <button type="submit" disabled={isSubmitting} className="w-full h-16 bg-[#7c63f5] rounded-2xl text-lg font-bold">
          {isSubmitting ? 'Envoi...' : 'VALIDER LA JOURNÉE'}
        </button>
      </form>
    </div>
  );
}
