"use client";
import React, { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Wallet, Users, Car, TrendingUp } from 'lucide-react';

export default function OverviewPage() {
  const supabase = createClientComponentClient();
  const [data, setData] = useState({ revenue: 0, count: 0 });

  useEffect(() => {
    async function fetchData() {
      const { data: records } = await supabase.from('daily_records').select('amount');
      const { count } = await supabase.from('drivers').select('*', { count: 'exact', head: true });
      
      const total = records?.reduce((acc, curr) => acc + curr.amount, 0) || 0;
      setData({ revenue: total, count: count || 0 });
    }
    fetchData();
  }, [supabase]);

  return (
    <div className="min-h-screen bg-black text-white p-6 space-y-8">
      <div>
        <h1 className="text-4xl font-black italic">TABLEAU DE BORD</h1>
        <p className="text-zinc-400">Suivi financier de TaxiFlow RDC</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-zinc-950 border border-zinc-900 p-8 rounded-[32px] hover:border-[#7c63f5] transition-all">
          <Wallet className="text-[#22c55e] mb-4" size={32} />
          <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Revenu Total (USD)</p>
          <h3 className="text-3xl font-black mt-2">{data.revenue.toLocaleString()} $</h3>
        </div>
        
        <div className="bg-zinc-950 border border-zinc-900 p-8 rounded-[32px]">
          <Users className="text-[#7c63f5] mb-4" size={32} />
          <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Chauffeurs Actifs</p>
          <h3 className="text-3xl font-black mt-2">{data.count}</h3>
        </div>
      </div>
    </div>
  );
}
