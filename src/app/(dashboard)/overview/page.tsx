"use client";
import React, { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Wallet, TrendingUp, Car, Users } from 'lucide-react';

export default function OverviewPage() {
  const supabase = createClientComponentClient();
  const [chartData, setChartData] = useState<any[]>([]);
  const [totals, setTotals] = useState({ usd: 0, cdf: 0 });

  useEffect(() => {
    async function fetchStats() {
      // David : On récupère les colonnes spécifiques de revenus
      const { data } = await supabase
        .from('daily_records')
        .select('created_at, revenue_usd, revenue_cdf')
        .order('created_at', { ascending: true });

      if (data) {
        // Formater pour Recharts
        const formatted = data.map(d => ({
          name: new Date(d.created_at).toLocaleDateString('fr-FR', { weekday: 'short' }),
          revenue: d.revenue_usd
        }));
        setChartData(formatted);

        // Calcul des totaux
        const totalUsd = data.reduce((acc, curr) => acc + (curr.revenue_usd || 0), 0);
        const totalCdf = data.reduce((acc, curr) => acc + (curr.revenue_cdf || 0), 0);
        setTotals({ usd: totalUsd, cdf: totalCdf });
      }
    }
    fetchStats();
  }, [supabase]);

  return (
    <div className="min-h-screen bg-black text-white p-6 space-y-10">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-black italic tracking-tighter">TABLEAU DE BORD</h1>
          <p className="text-zinc-500 font-medium">Analyse des flux financiers de la flotte.</p>
        </div>
      </header>

      {/* STATS CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-zinc-950 border border-zinc-900 p-8 rounded-[40px] relative overflow-hidden group">
          <Wallet className="text-[#22c55e] mb-4 relative z-10" size={32} />
          <p className="text-xs font-black text-zinc-500 uppercase tracking-widest relative z-10">Recettes Totales (USD)</p>
          <h3 className="text-4xl font-black mt-2 text-white relative z-10">{totals.usd.toLocaleString()} $</h3>
          <div className="absolute -right-4 -bottom-4 bg-[#22c55e]/5 w-32 h-32 rounded-full blur-3xl group-hover:bg-[#22c55e]/10 transition-all"></div>
        </div>

        <div className="bg-zinc-950 border border-zinc-900 p-8 rounded-[40px] relative overflow-hidden group">
          <TrendingUp className="text-[#7c63f5] mb-4 relative z-10" size={32} />
          <p className="text-xs font-black text-zinc-500 uppercase tracking-widest relative z-10">Recettes Totales (CDF)</p>
          <h3 className="text-4xl font-black mt-2 text-white relative z-10 italic">{totals.cdf.toLocaleString()} FC</h3>
          <div className="absolute -right-4 -bottom-4 bg-[#7c63f5]/5 w-32 h-32 rounded-full blur-3xl group-hover:bg-[#7c63f5]/10 transition-all"></div>
        </div>
      </div>

      {/* GRAPHIC */}
      <div className="bg-zinc-950 border border-zinc-900 p-8 rounded-[40px]">
        <h3 className="text-xl font-bold mb-8 text-zinc-400">Croissance des revenus (USD)</h3>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#18181b" vertical={false} />
              <XAxis dataKey="name" stroke="#52525b" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '16px' }}
                itemStyle={{ color: '#7c63f5', fontWeight: 'bold' }}
              />
              <Bar dataKey="revenue" fill="#7c63f5" radius={[10, 10, 0, 0]} barSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
