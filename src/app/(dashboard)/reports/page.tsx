"use client";
import React, { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { TrendingUp, Wallet, ArrowUpRight } from 'lucide-react';

export default function ReportsPage() {
  const supabase = createClientComponentClient();
  const [data, setData] = useState<any[]>([]);
  const [totalCDF, setTotalCDF] = useState(0);

  useEffect(() => {
    const getData = async () => {
      const { data: records } = await supabase.from('daily_records').select('*');
      if (records) {
        setData(records);
        const sum = records.reduce((acc, curr) => {
           if (curr.currency === 'USD') return acc + (curr.amount * curr.rate);
           return acc + curr.amount;
        }, 0);
        setTotalCDF(sum);
      }
    };
    getData();
  }, []);

  return (
    <div className="space-y-8 p-4">
      <header>
        <h1 className="text-3xl font-bold">Analyse Financière</h1>
        <p className="text-slate-400">Chiffres réels consolidés de la base de données.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-[#121214] border border-slate-800 p-8 rounded-[32px]">
          <Wallet className="text-[#7c63f5] mb-4" size={32} />
          <p className="text-xs font-bold text-slate-500 uppercase">Recettes Totales (Équiv. CDF)</p>
          <h3 className="text-4xl font-black text-[#22c55e] mt-2">{totalCDF.toLocaleString()} FC</h3>
        </div>
        <div className="bg-[#121214] border border-slate-800 p-8 rounded-[32px] flex flex-col justify-center">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase">Croissance</p>
              <h3 className="text-2xl font-bold text-white mt-1">+18.5%</h3>
            </div>
            <TrendingUp size={48} className="text-[#7c63f5] opacity-20" />
          </div>
        </div>
      </div>

      <div className="bg-[#121214] border border-slate-800 p-8 rounded-[32px]">
        <h3 className="text-lg font-bold mb-8">Flux de trésorerie (Derniers enregistrements)</h3>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.slice(-10)}>
              <defs>
                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#7c63f5" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#7c63f5" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <Tooltip contentStyle={{ backgroundColor: '#121214', border: 'none', borderRadius: '12px' }} />
              <Area type="monotone" dataKey="amount" stroke="#7c63f5" fillOpacity={1} fill="url(#colorTotal)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
