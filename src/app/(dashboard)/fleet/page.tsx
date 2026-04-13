"use client";
export const dynamic = 'force-dynamic';
import React, { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Car, Plus, Tool, Calendar, Loader2 } from 'lucide-react';

export default function FleetPage() {
  const supabase = createClientComponentClient();
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchFleet() {
      // Jointure Supabase : Récupère le chauffeur associé (driver_id)
      const { data } = await supabase.from('vehicles').select(`*, drivers(full_name)`);
      if (data) setVehicles(data);
      setLoading(false);
    }
    fetchFleet();
  }, []);

  return (
    <div className="space-y-8 p-4 bg-[#0a0a0c] min-h-screen">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-black italic text-white tracking-tight">MA FLOTTE</h1>
        <button className="bg-[#7c63f5] text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2"><Plus size={20} /> Nouveau Véhicule</button>
      </div>

      {loading ? <Loader2 className="animate-spin text-[#7c63f5] mx-auto" /> : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {vehicles.map((v) => (
            <div key={v.id} className="bg-[#121214] border border-slate-800 p-6 rounded-[32px] group hover:border-[#7c63f5] transition-all">
              <div className="flex items-center gap-4 mb-6">
                <div className="bg-[#7c63f5]/10 p-4 rounded-2xl text-[#7c63f5]"><Car size={32} /></div>
                <div>
                  <h3 className="text-xl font-black text-white">{v.model || "Modèle Inconnu"}</h3>
                  <p className="text-[#7c63f5] font-mono font-bold">{v.plate || "SANS PLAQUE"}</p>
                </div>
              </div>
              
              <div className="space-y-3 bg-slate-900/50 p-4 rounded-2xl">
                <div className="flex justify-between">
                  <span className="text-slate-400 text-xs font-bold uppercase tracking-widest">Chauffeur</span>
                  <span className="text-white font-bold">{v.drivers?.full_name || "Non assigné"}</span>
                </div>
                <div className="flex justify-between border-t border-slate-800 pt-3">
                  <span className="text-slate-400 text-xs font-bold uppercase tracking-widest">Dernier Service</span>
                  <span className="text-[#22c55e] font-mono text-sm">{v.last_service || "Aucune date"}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
