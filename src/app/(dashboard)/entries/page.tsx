"use client";
import React, { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Loader2, CheckCircle } from 'lucide-react';

export default function EntriesPage() {
  const supabase = createClientComponentClient();
  const [drivers, setDrivers] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [selectedDriver, setSelectedDriver] = useState("");
  const [selectedVehicle, setSelectedVehicle] = useState("");
  const [revenue, setRevenue] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadData() {
      const { data: d } = await supabase.from('drivers').select('id, full_name');
      const { data: v } = await supabase.from('vehicles').select('id, make, model');
      if (d) setDrivers(d);
      if (v) setVehicles(v);
    }
    loadData();
  }, [supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!revenue || !selectedDriver || !selectedVehicle) return alert("Remplissez tous les champs.");
    setLoading(true);

    // CORRECTION ICI : On utilise les colonnes exactes de ton SQL
    const { error } = await supabase.from('daily_records').insert([{ 
      revenue: Number(revenue), 
      driver_id: selectedDriver, 
      vehicle_id: selectedVehicle,
      currency: 'USD', 
      exchange_rate: 2850, // Taux Kinshasa
      revenue_usd: Number(revenue) // Tu peux aussi remplir revenue_cdf si besoin
    }]);

    if (error) {
      console.error("Erreur d'insertion :", error);
      alert(`Erreur : ${error.message}`);
    } else {
      alert("Versement enregistré !");
      setRevenue("");
      window.location.reload();
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <h1 className="text-3xl font-black italic mb-8">NOUVEAU VERSEMENT</h1>

      <form onSubmit={handleSubmit} className="bg-zinc-950 border border-zinc-900 p-8 rounded-[32px] space-y-6 max-w-2xl shadow-xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-500 uppercase">Chauffeur</label>
            <select value={selectedDriver} onChange={(e) => setSelectedDriver(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-white outline-none focus:border-[#7c63f5]">
              <option value="">Sélectionner...</option>
              {drivers.map(d => <option key={d.id} value={d.id}>{d.full_name}</option>)}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-500 uppercase">Véhicule</label>
            <select value={selectedVehicle} onChange={(e) => setSelectedVehicle(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-white outline-none focus:border-[#7c63f5]">
              <option value="">Sélectionner...</option>
              {vehicles.map(v => <option key={v.id} value={v.id}>{v.make} {v.model}</option>)}
            </select>
          </div>

          <div className="space-y-2 md:col-span-2">
            <label className="text-xs font-bold text-zinc-500 uppercase">Montant Versé (USD)</label>
            <input type="number" value={revenue} onChange={(e) => setRevenue(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-white outline-none focus:border-[#7c63f5]" placeholder="0.00" />
          </div>
        </div>

        <button type="submit" disabled={loading} className="w-full bg-[#7c63f5] text-white font-black py-4 rounded-2xl flex justify-center items-center gap-2">
          {loading ? <Loader2 className="animate-spin" /> : <CheckCircle size={20} />} VALIDER LE VERSEMENT
        </button>
      </form>
    </div>
  );
}
