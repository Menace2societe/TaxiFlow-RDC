"use client";
import React, { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { DollarSign, CheckCircle, Plus, History, ArrowDownCircle, Info, Loader2 } from 'lucide-react';

export default function EntriesPage() {
  const supabase = createClientComponentClient();
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState<string>("");
  const [currency, setCurrency] = useState<'USD' | 'CDF'>('CDF');
  const [entries, setEntries] = useState<any[]>([]);
  const rate = 2850; 

  // Charger les données réelles au démarrage
  useEffect(() => {
    fetchEntries();
  }, []);

  const fetchEntries = async () => {
    const { data } = await supabase
      .from('daily_records')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setEntries(data);
  };

  const handleAddEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount) return;
    setLoading(true);

    const { error } = await supabase
      .from('daily_records')
      .insert([{ 
        amount: parseFloat(amount), 
        currency, 
        rate,
        // On simule un driver_id ou on récupère le premier pour le test
        driver_id: 'eb9f143c-6663-44f2-986c-e547076d1e44' 
      }]);

    if (!error) {
      setAmount("");
      fetchEntries();
    }
    setLoading(false);
  };

  const convertedValue = currency === 'USD' 
    ? (parseFloat(amount) * rate || 0).toLocaleString() + " CDF"
    : (parseFloat(amount) / rate || 0).toFixed(2) + " USD";

  return (
    <div className="max-w-4xl mx-auto space-y-8 p-4">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold">Versements</h1>
          <p className="text-slate-500">Données réelles synchronisées avec Supabase.</p>
        </div>
        <div className="text-right bg-slate-900 p-3 rounded-2xl border border-slate-800">
          <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Taux Fixe</p>
          <p className="text-[#7c63f5] font-mono font-bold">{rate} FC / 1$</p>
        </div>
      </header>

      <section className="bg-[#121214] border border-slate-800 p-6 rounded-[32px] shadow-2xl">
        <form onSubmit={handleAddEntry} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase ml-1">Montant Perçu</label>
              <div className="relative">
                <input 
                  type="number" value={amount} onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-[#0a0a0c] border border-slate-700 rounded-2xl py-4 px-6 text-2xl font-bold focus:border-[#7c63f5] outline-none transition-all"
                />
                <div className="absolute right-4 top-4 flex bg-slate-800 rounded-xl p-1">
                  <button type="button" onClick={() => setCurrency('USD')} className={`px-4 py-1.5 rounded-lg text-xs font-bold ${currency === 'USD' ? 'bg-[#7c63f5] text-white' : 'text-slate-500'}`}>USD</button>
                  <button type="button" onClick={() => setCurrency('CDF')} className={`px-4 py-1.5 rounded-lg text-xs font-bold ${currency === 'CDF' ? 'bg-[#7c63f5] text-white' : 'text-slate-500'}`}>CDF</button>
                </div>
              </div>
              {amount && <p className="text-[11px] text-[#22c55e] ml-2 font-medium">≈ {convertedValue}</p>}
            </div>
            <div className="space-y-2 text-slate-400">
               <label className="text-xs font-bold uppercase ml-1">Véhicule / Chauffeur</label>
               <div className="w-full bg-[#0a0a0c] border border-slate-700 rounded-2xl py-4 px-6">Flotte Kinshasa Actrice</div>
            </div>
          </div>
          <button type="submit" disabled={loading} className="w-full bg-[#7c63f5] hover:bg-[#6a52e0] text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-3 transition-all text-lg disabled:opacity-50">
            {loading ? <Loader2 className="animate-spin" /> : <CheckCircle size={22} />}
            {loading ? 'Enregistrement...' : 'Valider le versement'}
          </button>
        </form>
      </section>

      <section className="space-y-4">
        <h3 className="text-lg font-bold flex items-center gap-2 px-2"><History size={18} className="text-[#7c63f5]" /> Historique Base de données</h3>
        <div className="space-y-3">
          {entries.map((entry) => (
            <div key={entry.id} className="bg-[#121214] border border-slate-800 p-4 rounded-2xl flex justify-between items-center">
              <div className="flex gap-4 items-center">
                <div className="w-10 h-10 bg-slate-900 rounded-full flex items-center justify-center text-[#7c63f5]"><ArrowDownCircle size={20} /></div>
                <div>
                  <p className="font-bold">Versement Reçu</p>
                  <p className="text-[10px] text-slate-500">{new Date(entry.created_at).toLocaleString('fr-FR')}</p>
                </div>
              </div>
              <div className="text-right">
                <p className={`font-black text-lg ${entry.currency === 'USD' ? 'text-white' : 'text-[#22c55e]'}`}>{entry.amount.toLocaleString()} <span className="text-xs">{entry.currency}</span></p>
                <span className="text-[9px] uppercase px-2 py-0.5 bg-slate-900 text-[#22c55e] rounded-md border border-slate-800">Confirmé</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
