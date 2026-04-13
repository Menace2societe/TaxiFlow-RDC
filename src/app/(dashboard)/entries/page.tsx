"use client";
import React, { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Loader2, CheckCircle, Car, User } from 'lucide-react';

export default function EntriesPage() {
  const supabase = createClientComponentClient();
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState('USD');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadVehicles() {
      // On récupère les véhicules avec le nom du chauffeur lié
      const { data } = await supabase.from('vehicles').select('id, plate, model, driver_id, drivers(full_name)');
      if (data) setVehicles(data);
    }
    loadVehicles();
  }, [supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !selectedVehicle) return alert("Sélectionnez un véhicule et un montant.");
    
    setLoading(true);
    const vehicle = vehicles.find(v => v.id === selectedVehicle);

    // David : On insère dans les nouvelles colonnes revenue_usd / revenue_cdf
    const insertData = {
      vehicle_id: selectedVehicle,
      driver_id: vehicle?.driver_id,
      amount: Number(amount),
      currency: currency,
      rate: 2850,
      revenue_usd: currency === 'USD' ? Number(amount) : Number(amount) / 2850,
      revenue_cdf: currency === 'CDF' ? Number(amount) : Number(amount) * 2850
    };

    const { error } = await supabase.from('daily_records').insert([insertData]);

    if (error) {
      console.error("Erreur détaillée :", error);
      alert(`Erreur Supabase : ${error.message}`);
    } else {
      setAmount("");
      alert("Versement enregistré avec succès !");
      window.location.reload(); 
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-black text-white p-6 space-y-8">
      <header>
        <h1 className="text-3xl font-black italic tracking-tighter">ENREGISTRER UN VERSEMENT</h1>
        <p className="text-zinc-500">Sélectionnez le véhicule pour lier le chauffeur automatiquement.</p>
      </header>

      <form onSubmit={handleSubmit} className="bg-zinc-950 border border-zinc-900 p-8 rounded-[32px] max-w-3xl space-y-6 shadow-2xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* SÉLECTEUR DE VÉHICULE */}
          <div className="space-y-3">
            <label className="text-xs font-black text-zinc-500 uppercase flex items-center gap-2">
              <Car size={14} /> Véhicule & Chauffeur
            </label>
            <select 
              value={selectedVehicle} 
              onChange={(e) => setSelectedVehicle(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-5 text-white outline-none focus:border-[#7c63f5] appearance-none"
            >
              <option value="">Choisir un taxi...</option>
              {vehicles.map(v => (
                <option key={v.id} value={v.id}>
                  {v.plate} - {v.drivers?.full_name || 'Sans chauffeur'}
                </option>
              ))}
            </select>
          </div>

          {/* MONTANT ET DEVISE */}
          <div className="space-y-3">
            <label className="text-xs font-black text-zinc-500 uppercase">Montant perçu</label>
            <div className="flex gap-2">
              <input 
                type="number" 
                value={amount} 
                onChange={(e) => setAmount(e.target.value)}
                className="flex-1 bg-zinc-900 border border-zinc-800 rounded-2xl p-5 text-white outline-none focus:border-[#7c63f5]"
                placeholder="0.00"
              />
              <select 
                value={currency} 
                onChange={(e) => setCurrency(e.target.value)}
                className="bg-zinc-800 border border-zinc-700 rounded-2xl px-4 font-bold text-[#7c63f5]"
              >
                <option value="USD">USD</option>
                <option value="CDF">CDF</option>
              </select>
            </div>
          </div>
        </div>

        <button 
          type="submit" 
          disabled={loading} 
          className="w-full bg-[#7c63f5] hover:bg-[#6a52e0] text-white font-black py-5 rounded-2xl flex justify-center items-center gap-3 transition-all text-xl shadow-lg shadow-[#7c63f5]/20"
        >
          {loading ? <Loader2 className="animate-spin" /> : <CheckCircle size={24} />} 
          CONFIRMER L'ENCAISSEMENT
        </button>
      </form>
    </div>
  );
}
