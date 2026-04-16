"use client";
export const dynamic = 'force-dynamic';
import React, { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Target, TrendingUp, DollarSign, Calendar } from 'lucide-react';

export default function InvestorPage() {
  const supabase = createClientComponentClient({
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
});
  });
  const [investment, setInvestment] = useState(15000); // 15,000 $ par défaut
  const [realRevenueUSD, setRealRevenueUSD] = useState(0);

  useEffect(() => {
    const calculateROI = async () => {
      const { data } = await supabase.from('daily_records').select('amount, currency, rate');
      if (data) {
        const totalInUSD = data.reduce((acc, curr) => {
          if (curr.currency === 'CDF') return acc + (curr.amount / curr.rate);
          return acc + curr.amount;
        }, 0);
        setRealRevenueUSD(totalInUSD);
      }
    };
    calculateROI();
  }, []);

  const roi = (realRevenueUSD / investment) * 100;

  return (
    <div className="max-w-5xl mx-auto space-y-8 p-4">
      <h1 className="text-3xl font-black">Performance Investisseur</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Colonne Gauche : ROI Reel */}
        <div className="lg:col-span-2 bg-[#7c63f5] p-10 rounded-[40px] text-white shadow-2xl relative overflow-hidden">
          <div className="relative z-10">
             <p className="text-xs font-bold uppercase opacity-80 tracking-widest">ROI Réel Calculé</p>
             <h2 className="text-7xl font-black my-4">{roi.toFixed(2)}%</h2>
             <p className="text-sm opacity-90 italic">Basé sur {realRevenueUSD.toFixed(0)}$ de recettes nettes encaissées.</p>
          </div>
          <Target className="absolute -right-4 -bottom-4 text-white/10" size={200} />
        </div>

        {/* Colonne Droite : Stats Rapides */}
        <div className="space-y-6">
          <div className="bg-[#121214] border border-slate-800 p-6 rounded-[32px]">
            <DollarSign className="text-[#22c55e] mb-2" />
            <p className="text-[10px] font-bold text-slate-500 uppercase">Capital Encaissé</p>
            <h3 className="text-2xl font-bold">{realRevenueUSD.toLocaleString()} $</h3>
          </div>
          <div className="bg-[#121214] border border-slate-800 p-6 rounded-[32px]">
            <Calendar className="text-[#7c63f5] mb-2" />
            <p className="text-[10px] font-bold text-slate-500 uppercase">Objectif</p>
            <h3 className="text-2xl font-bold">{investment.toLocaleString()} $</h3>
          </div>
        </div>
      </div>

      {/* Simulateur ROI */}
      <div className="bg-[#121214] border border-slate-800 p-8 rounded-[40px]">
        <h3 className="text-lg font-bold mb-6 flex items-center gap-2"><TrendingUp size={20} className="text-[#7c63f5]" /> Ajuster mon investissement initial</h3>
        <input 
          type="range" min="5000" max="50000" step="500" value={investment}
          onChange={(e) => setInvestment(parseInt(e.target.value))}
          className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-[#7c63f5] mb-4"
        />
        <p className="text-center text-slate-500 text-sm">Si j'investis <span className="text-white font-bold">{investment.toLocaleString()} $</span>, mon ROI actuel est de <span className="text-[#22c55e] font-bold">{roi.toFixed(1)}%</span></p>
      </div>
    </div>
  );
}
