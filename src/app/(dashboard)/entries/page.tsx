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
  const rate = 2850; // Taux de change standard Kinshasa

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

    // MISSION DAVID : Insertion avec l'ID chauffeur réel
    const { error } = await supabase
      .from('daily_records')
      .insert([{ 
        amount: parseFloat(amount), 
        currency, 
        rate,
        driver_id: '7c6311d4-7af7-4dc1-ae4d-e6a01dcf86ff' // Ton ID Chauffeur mis à jour
      }]);

    if (!error) {
      setAmount("");
      fetchEntries(); // Rafraîchit la liste instantanément
    } else {
      console.error("Erreur d'insertion :", error.message);
      alert("Erreur lors de l'enregistrement. Vérifiez la connexion.");
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
          <h1 className="text-3xl font-bold tracking-tight text-white">Versements</h1>
          <p className="text-slate-500">Enregistrement sécurisé dans la base TaxiFlow.</p>
        </div>
        <div className="text-right bg-slate-900/50 p-3 rounded-2xl border border-slate-800 backdrop-blur-sm">
          <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Taux Marché</p>
          <p className="text-[#7c63f5] font-mono font-bold text-lg">{rate} FC / 1$</p>
        </div>
      </header>

      {/* Formulaire de Versement */}
      <section className="bg-[#121214] border border-slate-800 p-8 rounded-[32px] shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#7c63f5]/5 rounded-full blur-3xl -mr-16 -mt-16"></div>
        
        <form onSubmit={handleAddEntry} className="relative z-10 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-400 uppercase ml-1 tracking-wider">Montant Perçu</label>
              <div className="relative">
                <input 
                  type="number" 
                  value={amount} 
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-[#0a0a0c] border border-slate-700 rounded-2xl py-5 px-6 text-3xl font-black focus:border-[#7c63f5] outline-none transition-all placeholder:text-slate-800 text-white"
                />
                <div className="absolute right-4 top-4 flex bg-slate-800 rounded-xl p-1.5 border border-slate-700 shadow-inner">
                  <button type="button" onClick={() => setCurrency('USD')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${currency === 'USD' ? 'bg-[#7c63f5] text-white shadow-lg shadow-[#7c63f5]/20' : 'text-slate-500 hover:text-white'}`}>USD</button>
                  <button type="button" onClick={() => setCurrency('CDF')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${currency === 'CDF' ? 'bg-[#7c63f5] text-white shadow-lg shadow-[#7c63f5]/20' : 'text-slate-500 hover:text-white'}`}>CDF</button>
                </div>
              </div>
              {amount && (
                <div className="flex items-center gap-2 ml-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] animate-pulse"></span>
                  <p className="text-sm text-[#22c55e] font-bold italic">≈ {convertedValue}</p>
                </div>
              )}
            </div>

            <div className="space-y-3">
               <label className="text-xs font-bold text-slate-400 uppercase ml-1 tracking-wider">Chauffeur Assigné</label>
               <div className="w-full bg-[#0a0a0c]/50 border border-slate-800 text-slate-400 rounded-2xl py-5 px-6 font-semibold flex items-center gap-3">
                 <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-[10px] text-white font-black">ID</div>
                 7c6311d4...86ff
               </div>
               <p className="text-[10px] text-slate-600 ml-1">ID lié automatiquement à ce versement.</p>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading || !amount} 
            className="w-full bg-[#7c63f5] hover:bg-[#6a52e0] text-white font-black py-5 rounded-2xl flex items-center justify-center gap-3 transition-all text-xl disabled:opacity-30 disabled:cursor-not-allowed shadow-xl shadow-[#7c63f5]/10"
          >
            {loading ? <Loader2 className="animate-spin" /> : <CheckCircle size={24} />}
            {loading ? 'Sychronisation...' : 'Valider le Versement'}
          </button>
        </form>
      </section>

      {/* Liste Historique */}
      <section className="space-y-5">
        <div className="flex justify-between items-center px-2">
           <h3 className="text-xl font-bold flex items-center gap-3 text-white">
             <History size={20} className="text-[#7c63f5]" /> 
             Journal des Recettes
           </h3>
           <span className="text-[10px] bg-slate-800 text-slate-400 px-3 py-1 rounded-full border border-slate-700 font-bold uppercase tracking-tighter">Live Database</span>
        </div>

        <div className="space-y-4">
          {entries.length === 0 && !loading && (
            <div className="text-center py-10 border-2 border-dashed border-slate-800 rounded-3xl">
              <p className="text-slate-600 font-medium italic text-sm">Aucun versement enregistré pour le moment.</p>
            </div>
          )}

          {entries.map((entry) => (
            <div key={entry.id} className="bg-[#121214] border border-slate-800 p-5 rounded-3xl flex justify-between items-center group hover:border-[#7c63f5]/30 transition-all shadow-lg">
              <div className="flex gap-5 items-center">
                <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-[#7c63f5] border border-slate-800 shadow-inner group-hover:scale-110 transition-transform">
                  <ArrowDownCircle size={24} />
                </div>
                <div>
                  <p className="font-bold text-white text-lg">Versement Encaissé</p>
                  <p className="text-[10px] text-slate-500 font-medium">
                    {new Date(entry.created_at).toLocaleString('fr-FR', {
                      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className={`font-black text-2xl tracking-tight ${entry.currency === 'USD' ? 'text-white' : 'text-[#22c55e]'}`}>
                  {entry.amount.toLocaleString()} <span className="text-xs ml-1 font-bold opacity-70">{entry.currency}</span>
                </p>
                <div className="flex items-center justify-end gap-1.5 mt-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#22c55e]"></div>
                  <span className="text-[10px] uppercase font-black text-[#22c55e] tracking-widest">Encaissé</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
