"use client";
export const dynamic = 'force-dynamic';
import React, { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Users, Plus, Phone, Loader2, Check } from 'lucide-react';

export default function DriversPage() {
  // Initialisation à l'intérieur du composant
  const supabase = createClientComponentClient({
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  });

  const [drivers, setDrivers] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => { 
    fetchDrivers(); 
  }, []);

  async function fetchDrivers() {
    const { data } = await supabase.from('drivers').select('*');
    if (data) setDrivers(data);
  }

  async function handleRecruit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.from('drivers').insert([
      { full_name: name, phone: phone, status: 'active' }
    ]);
    
    if (!error) {
      setName(""); 
      setPhone(""); 
      setShowForm(false); 
      fetchDrivers();
    } else {
      alert(error.message);
    }
    setLoading(false);
  }

  return (
    <div className="space-y-8 p-4 bg-[#0a0a0c] min-h-screen text-white">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black italic tracking-tighter">CHAUFFEURS</h1>
          <p className="text-slate-300">Gestion de vos partenaires de route.</p>
        </div>
        <button 
          onClick={() => setShowForm(!showForm)} 
          className="bg-[#7c63f5] text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2"
        >
          <Plus size={20} /> Recruter
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleRecruit} className="bg-[#121214] border-2 border-[#7c63f5] p-6 rounded-[32px] space-y-4 animate-in fade-in duration-300 shadow-2xl shadow-[#7c63f5]/10">
          <input 
            value={name} 
            onChange={(e) => setName(e.target.value)} 
            placeholder="Nom Complet du chauffeur" 
            className="w-full bg-[#0a0a0c] border border-slate-700 p-4 rounded-xl outline-none text-white focus:border-[#7c63f5]" 
            required
          />
          <input 
            value={phone} 
            onChange={(e) => setPhone(e.target.value)} 
            placeholder="N° Téléphone (ex: 081...)" 
            className="w-full bg-[#0a0a0c] border border-slate-700 p-4 rounded-xl outline-none text-white focus:border-[#7c63f5]" 
            required
          />
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-[#22c55e] text-black font-black py-4 rounded-xl flex justify-center disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" /> : "VALIDER LE RECRUTEMENT"}
          </button>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {drivers.map((d) => (
          <div key={d.id} className="bg-[#121214] border border-slate-800 p-6 rounded-[32px] hover:border-[#7c63f5]/50 transition-all">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center font-black text-white tracking-tighter">DR</div>
              <div>
                <h3 className="text-white font-black text-xl">{d.full_name}</h3>
                <p className="text-slate-300 text-sm flex items-center gap-2">
                  <Phone size={14} /> {d.phone}
                </p>
              </div>
            </div>
            <span className="bg-[#22c55e]/10 text-[#22c55e] px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-[#22c55e]/30">
              Actif
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
